/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Turn Loop
 * @tagline         Rounds, array tool calls, retry, cancel, timeout, lease, live emit
 * @file            plugins/ai-core/webapp/tests/unit/turn-loop.test.js
 * @version         1.0.19
 * @release         2026-10-01
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { attachTurnAbort, requestCancel } from '../../utils/agent/cancel.js';
import { acquireLease, clearLocalLeases, formatRetryLog, onAiQuotaCheck, onAiQuotaSettle, RETRYABLE_WAIT_MS, retryWaitMs, runTurn } from '../../utils/agent/index.js';
import AiThreadModel from '../../model/aiThread.js';
import AiTurnModel from '../../model/aiTurn.js';
import AiUsageModel from '../../model/aiUsage.js';
import { clearTools, createBudgetState, registerTools } from '../../utils/tools/index.js';
import AiMockController from '../../../../ai-mock/webapp/controller/aiMock.js';
import { createHookManager, memoryCollection, testActor } from './helpers.js';

const schema = { type: 'object', properties: {} };

function bindModels() {
    AiThreadModel.useCollection(memoryCollection());
    AiTurnModel.useCollection(memoryCollection());
    AiUsageModel.useCollection(memoryCollection());
}

function hooksWith(extra = {}) {
    return createHookManager({
        onAiProviderRegister: (ctx) => AiMockController.onAiProviderRegister(ctx),
        'onAiComplete:ai-mock': (ctx) => AiMockController.onAiComplete(ctx),
        onAiQuotaCheck: (ctx) => onAiQuotaCheck(ctx),
        onAiQuotaSettle: (ctx) => onAiQuotaSettle(ctx),
        onAiScopeResolve: (ctx) => {
            ctx.scope = { label: 'Doc', canRead: true, canWrite: false, nouns: { item: 'section', container: 'document' } };
            return ctx;
        },
        'onAiToolExecute:site': (ctx) => {
            ctx.result = { name: ctx.tool.name };
        },
        ...extra
    });
}

async function seedThread() {
    return AiThreadModel.findOrCreateActive({
        scopeType: 'doc',
        scopeId: 'doc-1',
        createdBy: 'jdoe'
    });
}

const settings = {
    enabled: true,
    allowedRoles: ['user'],
    policy: { reviewedToolNames: [], disabledToolNames: [] },
    caps: [{ dimension: 'requests', period: 'day', limit: 200 }],
    maxRoundsPerTurn: 4,
    turnTimeoutMs: 2000,
    maxContextChars: 10000
};

beforeEach(() => {
    bindModels();
    clearTools();
    clearLocalLeases();
    registerTools([
        { name: 'get_outline', description: 'Outline', schema, requires: 'scope:read' },
        { name: 'get_title', description: 'Title', schema, requires: 'scope:read' }
    ], 'site');
});

afterEach(() => {
    clearTools();
    clearLocalLeases();
    AiThreadModel.useCollection(null);
    AiTurnModel.useCollection(null);
    AiUsageModel.useCollection(null);
});

describe('turn loop', () => {
    test('rounds to completion', async () => {
        const thread = await seedThread();
        const result = await runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:text] Hello',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false }
        });
        expect(result.status).toBe('completed');
        expect(result.turn.agentText).toMatch(/Hello/);
    });

    test('tool round trip with more than one call in the array', async () => {
        const thread = await seedThread();
        const names = [];
        const result = await runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:tools]',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false },
            sink: (event) => {
                if (event.type === 'tool_use') {
                    names.push(...event.calls.map(c => c.name));
                }
            }
        });
        expect(names).toEqual(['get_outline', 'get_title']);
        expect(result.turn.toolCalls).toHaveLength(2);
        expect(result.status).toBe('completed');
    });

    test('retryable provider error then success', async () => {
        const thread = await seedThread();
        const errors = [];
        const infos = [];
        const prevLogger = global.LogController;
        global.LogController = {
            logInfo: (_req, _method, message) => infos.push(message),
            logError: () => {},
            logDebug: () => {}
        };
        try {
            const result = await runTurn({
                actor: testActor(),
                thread,
                userText: '[mock:retry] recovered',
                settings,
                hookManager: hooksWith(),
                threadModel: AiThreadModel,
                turnModel: AiTurnModel,
                usageModel: AiUsageModel,
                redisManager: { isRedisAvailable: () => false },
                sleep: async () => {},
                sink: (event) => {
                    if (event.type === 'error') {
                        errors.push(event);
                    }
                }
            });
            expect(result.status).toBe('completed');
            expect(result.turn.agentText).toMatch(/recovered/);
        } finally {
            global.LogController = prevLogger;
        }
        expect(errors).toHaveLength(0);
        expect(infos.filter(message => message.startsWith('retry:'))).toEqual([
            formatRetryLog(0, 'AI_MOCK_RETRY', 'Mock retryable error')
        ]);
    });

    test('retryable provider error reaches the client only after retries are exhausted', async () => {
        const thread = await seedThread();
        const errors = [];
        const infos = [];
        const waits = [];
        const headerMs = 30000;
        const prevLogger = global.LogController;
        global.LogController = {
            logInfo: (_req, _method, message) => infos.push(message),
            logError: () => {},
            logDebug: () => {}
        };
        let thrown = null;
        try {
            await runTurn({
                actor: testActor(),
                thread,
                userText: 'keep failing',
                settings,
                hookManager: hooksWith({
                    'onAiComplete:ai-mock': (ctx) => {
                        const event = {
                            type: 'error',
                            code: 'AI_RATE_LIMIT',
                            message: 'high demand',
                            retryable: true
                        };
                        if ((ctx.attempt || 0) === 0) {
                            event.retryAfterMs = headerMs;
                        }
                        ctx.emit(event);
                    }
                }),
                threadModel: AiThreadModel,
                turnModel: AiTurnModel,
                usageModel: AiUsageModel,
                redisManager: { isRedisAvailable: () => false },
                sleep: async (ms) => { waits.push(ms); },
                sink: (event) => {
                    if (event.type === 'error') {
                        errors.push(event);
                    }
                }
            });
        } catch (error) {
            thrown = error;
        } finally {
            global.LogController = prevLogger;
        }
        expect(thrown && thrown.message).toMatch(/high demand/);
        expect(thrown.emitted).toBe(true);
        expect(errors).toEqual([
            { type: 'error', code: 'AI_RATE_LIMIT', message: 'high demand', retryable: true }
        ]);
        expect(waits).toEqual(RETRYABLE_WAIT_MS.map((_slot, index) => {
            return retryWaitMs(index, index === 0 ? headerMs : 0);
        }));
        expect(waits[0]).toBe(RETRYABLE_WAIT_MS[0]);
        expect(infos.filter(message => message.startsWith('retry:'))).toEqual(RETRYABLE_WAIT_MS.map((_slot, index) => {
            return formatRetryLog(index, 'AI_RATE_LIMIT', 'high demand', index === 0 ? headerMs : undefined);
        }));
    });

    async function runAlwaysRetryable(turnSettings, retryAfterMs) {
        const thread = await seedThread();
        const out = { errors: [], infos: [], waits: [], attempts: 0, thrown: null };
        const prevLogger = global.LogController;
        global.LogController = {
            logInfo: (_req, _method, message) => out.infos.push(message),
            logError: () => {},
            logDebug: () => {}
        };
        try {
            await runTurn({
                actor: testActor(),
                thread,
                userText: 'keep failing',
                settings: turnSettings,
                hookManager: hooksWith({
                    'onAiComplete:ai-mock': (ctx) => {
                        out.attempts += 1;
                        ctx.emit({
                            type: 'error',
                            code: 'AI_RATE_LIMIT',
                            message: 'busy',
                            retryable: true,
                            retryAfterMs
                        });
                    }
                }),
                threadModel: AiThreadModel,
                turnModel: AiTurnModel,
                usageModel: AiUsageModel,
                redisManager: { isRedisAvailable: () => false },
                sleep: async (ms) => { out.waits.push(ms); },
                sink: (event) => {
                    if (event.type === 'error') {
                        out.errors.push(event);
                    }
                }
            });
        } catch (error) {
            out.thrown = error;
        } finally {
            global.LogController = prevLogger;
        }
        out.retryLines = out.infos.filter(message => message.startsWith('retry:'));
        return out;
    }

    test('retry schedule and Retry-After cap come from settings', async () => {
        const retry = { waits: [100, 5000], capMs: 1000 };
        const out = await runAlwaysRetryable({ ...settings, retryWaitMs: retry.waits, retryAfterCapMs: retry.capMs }, 2500);
        expect(out.attempts).toBe(3);
        expect(out.waits).toEqual([100, 1000]);
        expect(out.retryLines).toEqual([
            formatRetryLog(0, 'AI_RATE_LIMIT', 'busy', 2500, retry),
            formatRetryLog(1, 'AI_RATE_LIMIT', 'busy', 2500, retry)
        ]);
        expect(out.retryLines[1]).toMatch(/attempt 2 of 3: busy \(wait 1000ms\)$/);
        expect(out.errors).toHaveLength(1);
        expect(out.thrown && out.thrown.emitted).toBe(true);
    });

    test('an empty retry schedule makes one attempt', async () => {
        const out = await runAlwaysRetryable({ ...settings, retryWaitMs: [] }, 0);
        expect(out.attempts).toBe(1);
        expect(out.waits).toEqual([]);
        expect(out.retryLines).toEqual([]);
        expect(out.errors).toHaveLength(1);
    });

    test('retryWaitMs and formatRetryLog use the default policy without settings', () => {
        expect(retryWaitMs(0, 0)).toBe(RETRYABLE_WAIT_MS[0]);
        expect(retryWaitMs(2, 60000)).toBe(RETRYABLE_WAIT_MS[2]);
        expect(retryWaitMs(1, 60000, { waits: [1000, 90000], capMs: 0 })).toBe(30000);
        expect(formatRetryLog(0, '', '', 0)).toBe(`retry: AI_PROVIDER_ERROR attempt 1 of ${RETRYABLE_WAIT_MS.length + 1}: provider error (wait ${RETRYABLE_WAIT_MS[0]}ms)`);
    });

    test('fatal provider error', async () => {
        const thread = await seedThread();
        const errors = [];
        await expect(runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:fatal]',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false },
            sink: (event) => {
                if (event.type === 'error') {
                    errors.push(event);
                }
            }
        })).rejects.toThrow(/fatal/i);
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe('AI_MOCK_FATAL');
    });

    test('cancel by flag', async () => {
        const thread = await seedThread();
        const result = await runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:text] no',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false },
            sink: (event) => {
                if (event.type === 'turn_start') {
                    requestCancel(String(thread._id));
                }
            }
        });
        expect(result.status).toBe('canceled');
        expect(result.turn.cancelRequested).toBe(true);
    });

    test('timeout', async () => {
        const thread = await seedThread();
        await expect(runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:slow:30] a b c d e f g h',
            settings: { ...settings, turnTimeoutMs: 5 },
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false }
        })).rejects.toThrow(/timed out/i);
    }, 10000);

    test('lease refusal rolls back the reservation', async () => {
        const thread = await seedThread();
        const held = await acquireLease(String(thread._id), 'other', 5000, {
            redisManager: { isRedisAvailable: () => false }
        });
        expect(held).toBe(true);
        const errors = [];
        await expect(runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:text] x',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false },
            sink: (event) => {
                if (event.type === 'error') {
                    errors.push(event);
                }
            }
        })).rejects.toMatchObject({ code: 'AI_LEASE_HELD' });
        expect(errors).toHaveLength(1);
        const today = new Date();
        const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const usage = await AiUsageModel.findIdentity({
            day,
            username: 'jdoe',
            provider: 'ai-mock',
            model: 'mock-echo',
            scopeType: 'doc',
            scopeId: 'doc-1'
        });
        expect(usage.reservedRequests).toBe(0);
        expect(usage.requests || 0).toBe(0);
    });

    test('no provider does not reserve', async () => {
        const thread = await seedThread();
        await expect(runTurn({
            actor: testActor(),
            thread,
            userText: 'x',
            settings,
            hookManager: createHookManager({
                onAiQuotaCheck: (ctx) => onAiQuotaCheck(ctx)
            }),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false }
        })).rejects.toMatchObject({ code: 'AI_NO_PROVIDER' });
        expect(AiUsageModel.getCollection().docs).toHaveLength(0);
    });

    test('a completed turn settles on the chosen model and the resolved scope label', async () => {
        const thread = await seedThread();
        await runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:text] hi',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false }
        });
        const doc = AiUsageModel.getCollection().docs[0];
        expect(doc.provider).toBe('ai-mock');
        expect(doc.model).toBe('mock-echo');
        expect(doc.scopeType).toBe('doc');
        expect(doc.scopeId).toBe('doc-1');
        expect(doc.scopeLabel).toBe('Doc');
        expect(doc.requests).toBe(1);
    });

    test('empty completion', async () => {
        const thread = await seedThread();
        const result = await runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:text] ',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false }
        });
        expect(result.status).toBe('completed');
    });

    test('truncated tool arguments', async () => {
        const thread = await seedThread();
        const events = [];
        const result = await runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:truncated]',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false },
            sink: (event) => events.push(event)
        });
        expect(events.some(event => event.type === 'tool_use_truncated')).toBe(true);
        expect(result.status).toBe('completed');
    });

    test('text delta is observable at the sink before the provider hook resolves', async () => {
        const thread = await seedThread();
        let sawDeltaBeforeResolve = false;
        let providerResolved = false;
        const hookManager = hooksWith({
            'onAiComplete:ai-mock': async (ctx) => {
                ctx.emit({ type: 'text_delta', text: 'live' });
                expect(sawDeltaBeforeResolve).toBe(true);
                ctx.emit({ type: 'usage', tokensIn: 1, tokensOut: 1 });
                ctx.emit({ type: 'done', stopReason: 'end' });
                providerResolved = true;
            }
        });
        await runTurn({
            actor: testActor(),
            thread,
            userText: 'go',
            settings,
            hookManager,
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false },
            sink: (event) => {
                if (event.type === 'text_delta') {
                    sawDeltaBeforeResolve = !providerResolved;
                }
            },
            budgetState: createBudgetState()
        });
        expect(sawDeltaBeforeResolve).toBe(true);
    });

    test('auto-titles the first completed turn when the thread has no label', async () => {
        const thread = await seedThread();
        const result = await runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:text] Name this conversation',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false }
        });
        expect(result.thread.label).toBe('Name this conversation');
    });

    test('provider throw fails the turn', async () => {
        const thread = await seedThread();
        const errors = [];
        await expect(runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:throw]',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false },
            sink: (event) => {
                if (event.type === 'error') {
                    errors.push(event);
                }
            }
        })).rejects.toThrow(/threw/i);
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe('AI_PROVIDER_THROW');
    });

    test('unpriced model records null cost', async () => {
        const thread = await seedThread();
        const result = await runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:unpriced]',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false }
        });
        expect(result.status).toBe('completed');
        expect(result.turn.model).toBe('mock-unpriced');
        expect(result.cost).toBe(null);
        expect(result.costUnknown).toBe(true);
    });

    test('hang stops when abortSignal fires', async () => {
        const thread = await seedThread();
        const abort = new AbortController();
        const running = runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:hang]',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false },
            abortSignal: abort.signal
        });
        await new Promise(resolve => setTimeout(resolve, 20));
        abort.abort();
        const result = await running;
        expect(result.status).toBe('canceled');
    });

    test('persists a mid-thread provider/model switch onto the thread', async () => {
        const thread = await seedThread();
        expect(thread.provider).toBe('');
        const first = await runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:text] stay',
            provider: 'ai-mock',
            model: 'mock-unpriced',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false }
        });
        expect(first.thread.provider).toBe('ai-mock');
        expect(first.thread.model).toBe('mock-unpriced');
        const second = await runTurn({
            actor: testActor(),
            thread: first.thread,
            userText: '[mock:text] again',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false }
        });
        expect(second.turn.model).toBe('mock-unpriced');
        expect(second.thread.model).toBe('mock-unpriced');
    });

    test('requestCancel aborts an attached hang', async () => {
        const thread = await seedThread();
        const abort = new AbortController();
        attachTurnAbort(String(thread._id), abort);
        const started = Date.now();
        const running = runTurn({
            actor: testActor(),
            thread,
            userText: '[mock:hang:20000]',
            settings,
            hookManager: hooksWith(),
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            usageModel: AiUsageModel,
            redisManager: { isRedisAvailable: () => false },
            abortSignal: abort.signal
        });
        await new Promise(resolve => setTimeout(resolve, 40));
        expect(Date.now() - started).toBeGreaterThanOrEqual(30);
        requestCancel(String(thread._id));
        const result = await running;
        expect(result.status).toBe('canceled');
        expect(Date.now() - started).toBeLessThan(2000);
    });

    test('prompt dump is logDebug when debugDumps and the aiCore area are on', async () => {
        const info = [];
        const debug = [];
        const originalInfo = global.LogController.logInfo.bind(global.LogController);
        const originalDebug = global.LogController.logDebug.bind(global.LogController);
        global.LogController.logInfo = (req, scope, msg) => {
            info.push({ scope, msg });
            return originalInfo(req, scope, msg);
        };
        global.LogController.logDebug = (req, scope, msg) => {
            debug.push({ scope, msg });
            return originalDebug(req, scope, msg);
        };
        await global.LogController.setDebugAreas(['aiCore']);
        try {
            const thread = await seedThread();
            const result = await runTurn({
                actor: testActor(),
                thread,
                userText: '[mock:text] Hello',
                settings: { ...settings, debugDumps: true },
                hookManager: hooksWith(),
                threadModel: AiThreadModel,
                turnModel: AiTurnModel,
                usageModel: AiUsageModel,
                redisManager: { isRedisAvailable: () => false }
            });
            expect(result.status).toBe('completed');
            expect(debug.some((line) => line.scope === 'aiCore.runTurn' && line.msg.startsWith('prompt:'))).toBe(true);
            expect(info.some((line) => line.scope === 'aiCore.runTurn' && line.msg.startsWith('prompt:'))).toBe(false);
            expect(info.some((line) => line.scope === 'aiCore.runTurn' && line.msg.includes('success: turn'))).toBe(true);
        } finally {
            global.LogController.logInfo = originalInfo;
            global.LogController.logDebug = originalDebug;
            await global.LogController.setDebugAreas([]);
        }
    });
});

// EOF plugins/ai-core/webapp/tests/unit/turn-loop.test.js
