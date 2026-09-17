/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Agent / Turn Loop
 * @tagline         Provider-neutral turn loop
 * @description     Reserve, lease, rounds, live emit, array tool calls; no propose/apply
 * @file            plugins/ai-core/webapp/utils/agent/turnLoop.js
 * @version         1.0.4
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { createBudgetState, executeTool, resolveTools, stripMedia } from '../tools/index.js';
import { onBehalfOfLogSuffix, threadOwner } from '../tools/actor.js';
import { broadcastCancel, clearCancel, isCancelRequested } from './cancel.js';
import { acquireLease, releaseLease } from './lease.js';
import { followFromResult, openUserContent, refsForTurn, turnExtras } from './inputs.js';
import { assemblePrompt, historyToMessages } from './prompt.js';
import {
    chooseProviderModel,
    computeCost,
    filterAllowedModels,
    listProviders,
    priceForModel
} from './providers.js';

const RETRYABLE_WAIT_MS = [500, 1500, 3500];
const DEBUG_PRIOR_MAX = 1500;
const DEBUG_TEXT_MAX = 400;
const AUTO_TITLE_MAX = 60;

function sleep(ms, sleeper, abortSignal) {
    if (typeof sleeper === 'function') {
        return sleeper(ms);
    }
    return new Promise(resolve => {
        const timer = setTimeout(resolve, ms);
        if (!abortSignal) {
            return;
        }
        if (abortSignal.aborted) {
            clearTimeout(timer);
            resolve();
            return;
        }
        abortSignal.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve();
        }, { once: true });
    });
}

function turnStopped(threadId, abortSignal) {
    return isCancelRequested(threadId) || abortSignal?.aborted === true;
}

export function deriveThreadLabel(text) {
    const cleaned = String(text || '').replace(/\[mock:[^\]]+\]/gi, '').replace(/\s+/g, ' ').trim();
    if (!cleaned) {
        return '';
    }
    return cleaned.length > AUTO_TITLE_MAX ? `${cleaned.slice(0, AUTO_TITLE_MAX).trim()}…` : cleaned;
}

function formatPromptDebugLine(turnId, tools, system, userText, messages) {
    const toolNames = (tools || []).map(t => t.name).join(', ');
    let line = `prompt: turn=${turnId}; tools=[ ${toolNames} ]; user=${JSON.stringify(userText || '')};`;
    const prior = Array.isArray(messages) && messages.length ? messages.slice(0, -1) : [];
    if (prior.length) {
        const packed = JSON.stringify(prior);
        line += packed.length <= DEBUG_PRIOR_MAX
            ? ` prior=${packed};`
            : ` priorCount=${prior.length};`;
    }
    line += ` system=${JSON.stringify(system || '')};`;
    return line.replace(/[\r\n]+/g, ' ');
}

function formatResponseDebugLine(info) {
    const text = String(info.text || '');
    const clipped = text.length > DEBUG_TEXT_MAX ? `${text.slice(0, DEBUG_TEXT_MAX)}...` : text;
    return (
        `response: turn=${info.turnId || ''}; round=${info.round || 0}; stop=${info.stopReason || '-'}`
        + `; textLen=${text.length}; tokensIn=${info.tokensIn || 0}; tokensOut=${info.tokensOut || 0}`
        + `; text=${JSON.stringify(clipped)}`
    ).replace(/[\r\n]+/g, ' ');
}

function logLine(req, method, message, actor) {
    const suffix = onBehalfOfLogSuffix(actor);
    const logger = global.LogController;
    if (logger?.logInfo) {
        logger.logInfo(req, method, `${message}${suffix}`);
    }
}

function logError(req, method, message, actor) {
    const suffix = onBehalfOfLogSuffix(actor);
    const logger = global.LogController;
    if (logger?.logError) {
        logger.logError(req, method, `${message}${suffix}`);
    }
}

function emptyUsage() {
    return { tokensIn: 0, tokensOut: 0, cacheWrite: 0, cacheRead: 0, toolCalls: 0 };
}

function addUsage(total, delta) {
    if (!delta) {
        return;
    }
    total.tokensIn += delta.tokensIn || delta.input || 0;
    total.tokensOut += delta.tokensOut || delta.output || 0;
    total.cacheWrite += delta.cacheWrite || 0;
    total.cacheRead += delta.cacheRead || 0;
}

/**
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function runTurn(params) {
    const actor = params.actor;
    const req = actor?.req || params.req || null;
    const settings = params.settings || {};
    const hookManager = params.hookManager || global.HookManager;
    const threadModel = params.threadModel;
    const turnModel = params.turnModel;
    const sink = typeof params.sink === 'function' ? params.sink : () => {};
    const now = params.now || new Date();
    const holderId = params.holderId || `turn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const timeoutMs = settings.turnTimeoutMs || 120000;
    const maxRounds = settings.maxRoundsPerTurn || 8;
    const startedAt = Date.now();

    let thread = params.thread || await threadModel.findById(params.threadId);
    if (!thread) {
        const error = new Error('Thread not found');
        error.code = 'AI_THREAD_NOT_FOUND';
        throw error;
    }

    if (hookManager?.execute) {
        await hookManager.execute('onAiTurnBefore', {
            actor,
            thread,
            userText: params.userText
        });
    }

    let quota = null;
    let reserved = false;
    try {
        if (hookManager?.executeFirst) {
            const quotaCtx = {
                actor,
                settings,
                now,
                usageModel: params.usageModel
            };
            quota = await hookManager.executeFirst('onAiQuotaCheck', quotaCtx);
            if (!quota && quotaCtx.quota) {
                quota = quotaCtx.quota;
            }
            reserved = true;
        }
    } catch (error) {
        logError(req, 'aiCore.runTurn', `error: quota ${error.message}`, actor);
        sink({ type: 'error', code: error.code || 'AI_QUOTA_FAILED', message: error.message });
        throw error;
    }

    const leased = await acquireLease(String(thread._id), holderId, timeoutMs + 5000, {
        redisManager: params.redisManager
    });
    if (!leased) {
        if (reserved && hookManager?.execute) {
            await hookManager.execute('onAiQuotaSettle', {
                actor,
                quota,
                usage: emptyUsage(),
                started: false,
                usageModel: params.usageModel
            });
        }
        const error = new Error('A turn is already running on this thread');
        error.code = 'AI_LEASE_HELD';
        sink({ type: 'error', code: error.code, message: error.message });
        throw error;
    }

    clearCancel(String(thread._id));
    const budgetState = params.budgetState || createBudgetState();
    const moduleDataCache = params.moduleDataCache || new Map();
    const usage = emptyUsage();
    let turn = null;
    let status = 'failed';
    let agentText = '';
    const toolCalls = [];
    let costUnknown = false;
    let emittedError = false;

    try {
        const providers = await listProviders(hookManager);
        const menu = filterAllowedModels(providers, settings);
        const chosen = chooseProviderModel(menu, settings, params, thread);
        if (!chosen) {
            const error = new Error('No provider is available');
            error.code = 'AI_NO_PROVIDER';
            throw error;
        }
        const provider = providers.find(p => p.plugin === chosen.provider) || {
            plugin: chosen.provider,
            priceTable: {},
            maxTokens: 4096
        };

        if (thread.provider !== chosen.provider || thread.model !== chosen.model) {
            const persisted = await threadModel.setProviderModel(
                thread._id,
                chosen.provider,
                chosen.model
            );
            if (persisted) {
                thread = persisted;
            }
        }

        const seq = await turnModel.nextSeq(thread._id);
        turn = await turnModel.create({
            threadId: String(thread._id),
            seq,
            userText: params.userText || '',
            provider: chosen.provider,
            model: chosen.model,
            createdBy: threadOwner(actor),
            onBehalfOf: actor.onBehalfOf,
            now,
            ...refsForTurn(params)
        });

        const history = await turnModel.listByThread(thread._id, 40);
        const prior = history.filter(row => String(row._id) !== String(turn._id));
        const messages = historyToMessages(prior, settings.maxContextChars);
        const userContent = await openUserContent(params, settings, chosen);
        messages.push({ role: 'user', content: userContent });

        sink({ type: 'turn_start', turnId: String(turn._id), threadId: String(thread._id) });

        let round = 0;
        let stop = false;
        while (!stop && round < maxRounds) {
            if (Date.now() - startedAt > timeoutMs) {
                status = 'failed';
                throw Object.assign(new Error('Turn timed out'), { code: 'AI_TIMEOUT' });
            }
            if (turnStopped(String(thread._id), params.abortSignal)) {
                status = 'canceled';
                break;
            }

            const extras = turnExtras(params);
            const resolved = await resolveTools(actor, {
                hookManager,
                policy: settings.policy,
                settings,
                scope: params.scope,
                ...extras.resolve
            });
            const prompt = await assemblePrompt({
                actor,
                scope: resolved.scope,
                tools: resolved.tools,
                withheld: resolved.withheld,
                siteInstructions: settings.siteInstructions,
                context: params.context,
                target: params.target,
                hookManager,
                ...extras.prompt
            });
            if (settings.debugDumps) {
                logLine(req, 'aiCore.runTurn', formatPromptDebugLine(
                    String(turn._id),
                    resolved.tools,
                    prompt.system,
                    params.userText,
                    messages
                ), actor);
            }

            const roundEvents = [];
            let toolUse = null;
            let stopReason = 'end';
            let providerError = null;
            const emit = (event) => {
                if (!event || typeof event !== 'object') {
                    return;
                }
                sink(event);
                roundEvents.push(event);
                if (event.type === 'text_delta' && event.text) {
                    agentText += event.text;
                }
                if (event.type === 'tool_use') {
                    toolUse = event;
                }
                if (event.type === 'usage') {
                    addUsage(usage, event);
                }
                if (event.type === 'done') {
                    stopReason = event.stopReason || 'end';
                }
                if (event.type === 'error') {
                    providerError = event;
                    emittedError = true;
                }
            };

            let attempts = 0;
            while (true) {
                providerError = null;
                toolUse = null;
                const completeCtx = {
                    threadId: String(thread._id),
                    turnId: String(turn._id),
                    model: chosen.model,
                    system: prompt.system,
                    messages,
                    tools: resolved.publicTools,
                    emit,
                    abortSignal: params.abortSignal,
                    round,
                    attempt: attempts,
                    script: params.script
                };
                try {
                    await hookManager.executeForPlugin('onAiComplete', chosen.provider, completeCtx);
                } catch (error) {
                    providerError = {
                        type: 'error',
                        code: error.code || 'AI_PROVIDER_THROW',
                        message: error.message || 'Provider threw',
                        retryable: false
                    };
                    emit(providerError);
                }
                if (completeCtx.model && completeCtx.model !== chosen.model) {
                    chosen.model = completeCtx.model;
                }
                if (providerError && providerError.retryable && attempts < RETRYABLE_WAIT_MS.length) {
                    await sleep(RETRYABLE_WAIT_MS[attempts], params.sleep, params.abortSignal);
                    if (turnStopped(String(thread._id), params.abortSignal)) {
                        break;
                    }
                    attempts += 1;
                    continue;
                }
                break;
            }

            if (providerError && !providerError.retryable) {
                throw Object.assign(new Error(providerError.message || 'Provider error'), {
                    code: providerError.code || 'AI_PROVIDER_ERROR'
                });
            }
            if (providerError && providerError.retryable) {
                throw Object.assign(new Error(providerError.message || 'Provider retry exhausted'), {
                    code: providerError.code || 'AI_PROVIDER_ERROR'
                });
            }

            if (Date.now() - startedAt > timeoutMs) {
                status = 'failed';
                throw Object.assign(new Error('Turn timed out'), { code: 'AI_TIMEOUT' });
            }
            if (turnStopped(String(thread._id), params.abortSignal)) {
                status = 'canceled';
                break;
            }
            if (settings.debugDumps) {
                logLine(req, 'aiCore.runTurn', formatResponseDebugLine({
                    turnId: String(turn._id),
                    round,
                    stopReason,
                    text: agentText,
                    tokensIn: usage.tokensIn,
                    tokensOut: usage.tokensOut
                }), actor);
            }

            if (toolUse && Array.isArray(toolUse.calls) && toolUse.calls.length) {
                const results = [];
                const extras = [];
                let stalled = false;
                for (const call of toolUse.calls) {
                    if (stalled) {
                        results.push({
                            id: call.id,
                            name: call.name,
                            result: {
                                ok: false,
                                code: 'AI_SKIPPED_AFTER_STALL',
                                error: 'Not executed because an earlier call stalled.',
                                hint: 'Retry the turn when the connection is back.'
                            }
                        });
                        continue;
                    }
                    const result = await executeTool({
                        name: call.name,
                        args: call.args || {},
                        callId: call.id,
                        tool: resolved.tools.find(t => t.name === call.name),
                        actor,
                        scope: resolved.scope,
                        policy: settings.policy,
                        budgetState,
                        settings,
                        hookManager,
                        clientExecutor: params.clientExecutor,
                        moduleDataCache
                    });
                    usage.toolCalls += 1;
                    const extra = followFromResult(result);
                    if (extra) {
                        extras.push(extra);
                    }
                    const stored = stripMedia(result);
                    results.push({ id: call.id, name: call.name, args: call.args || {}, result: stored });
                    sink({ type: 'tool_result', id: call.id, name: call.name, result: stored });
                    if (result.stall) {
                        stalled = true;
                        status = 'stalled';
                    }
                }
                toolCalls.push(...results);
                messages.push({
                    role: 'assistant',
                    content: '',
                    toolCalls: toolUse.calls
                });
                results.forEach((row) => {
                    messages.push({
                        role: 'tool',
                        toolCallId: row.id,
                        id: row.id,
                        name: row.name,
                        content: {
                            ok: row.result.ok,
                            error: row.result.error,
                            hint: row.result.hint,
                            data: row.result.data,
                            summary: row.result.summary
                        }
                    });
                });
                extras.forEach((row) => {
                    messages.push(row);
                });
                if (stalled) {
                    stop = true;
                    break;
                }
                round += 1;
                continue;
            }

            status = 'completed';
            stop = true;
            if (stopReason === 'length') {
                status = 'completed';
            }
        }

        if (status !== 'completed' && status !== 'canceled' && status !== 'stalled') {
            status = 'failed';
            sink({
                type: 'error',
                code: 'AI_MAX_ROUNDS',
                message: `Stopped after ${maxRounds} rounds`
            });
        }

        if (status === 'canceled') {
            sink({ type: 'canceled', turnId: String(turn._id) });
        } else if (status === 'stalled') {
            sink({ type: 'stalled', turnId: String(turn._id) });
        } else if (status === 'completed') {
            sink({ type: 'completed', turnId: String(turn._id), text: agentText });
        }

        const price = priceForModel(provider, chosen.model);
        const cost = computeCost(usage, price);
        costUnknown = cost == null && (usage.tokensIn + usage.tokensOut) > 0;
        usage.cost = cost;

        await turnModel.finalize(turn._id, {
            agentText,
            toolCalls,
            usage,
            cost,
            costUnknown,
            status: status === 'failed' ? 'failed' : status,
            cancelRequested: status === 'canceled',
            provider: chosen.provider,
            model: chosen.model
        });
        await threadModel.touch(thread._id);

        if (status === 'completed' && settings.autoTitle !== false && turn.seq === 1 && !thread.label) {
            const label = deriveThreadLabel(params.userText) || deriveThreadLabel(agentText);
            if (label) {
                const renamed = await threadModel.rename(thread._id, label);
                if (renamed) {
                    thread = renamed;
                }
            }
        }

        logLine(req, 'aiCore.runTurn', `success: turn ${turn._id} ${status}`, actor);
        return {
            thread,
            turn: await turnModel.findById(turn._id),
            status,
            usage,
            cost,
            costUnknown,
            quota
        };
    } catch (error) {
        status = status === 'canceled' ? 'canceled' : 'failed';
        if (turn) {
            await turnModel.finalize(turn._id, {
                agentText,
                toolCalls,
                usage,
                status,
                cancelRequested: status === 'canceled',
                error: error.message
            });
        }
        if (!emittedError) {
            sink({ type: 'error', code: error.code || 'AI_TURN_FAILED', message: error.message });
        }
        logError(req, 'aiCore.runTurn', `error: ${error.message}`, actor);
        throw error;
    } finally {
        await releaseLease(String(thread._id), holderId, { redisManager: params.redisManager });
        if (reserved && hookManager?.execute) {
            try {
                await hookManager.execute('onAiQuotaSettle', {
                    actor,
                    quota,
                    usage,
                    started: true,
                    costUnknown,
                    usageModel: params.usageModel
                });
            } catch (error) {
                logError(req, 'aiCore.runTurn', `error: quota settle ${error.message}`, actor);
            }
        }
        if (hookManager?.execute) {
            try {
                await hookManager.execute('onAiTurnAfter', {
                    actor,
                    thread,
                    turn,
                    status,
                    usage
                });
            } catch (error) {
                logError(req, 'aiCore.runTurn', `error: turn after ${error.message}`, actor);
            }
        }
        clearCancel(String(thread._id));
    }
}

export { broadcastCancel };

// EOF plugins/ai-core/webapp/utils/agent/turnLoop.js
