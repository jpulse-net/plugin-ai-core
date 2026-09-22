/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Tools Layer
 * @tagline         Gates, budgets, envelope — no Express request
 * @file            plugins/ai-core/webapp/tests/unit/tools-layer.test.js
 * @version         1.0.16
 * @release         2026-09-22
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import {
    AI_BUDGET_EXCEEDED,
    AI_CAPABILITY_DENIED,
    AI_DEDUPE,
    AI_POLICY_DENIED,
    AI_RESULT_TOO_LARGE,
    AI_UNKNOWN_TOOL,
    DEFAULT_TOOL_TIMEOUT_MS,
    RESULT_SIZE_CAP,
    clearTools,
    createBudgetState,
    effectiveTimeoutMs,
    executeTool,
    registerTools,
    resolveTools
} from '../../utils/tools/index.js';
import { createHookManager, testActor } from './helpers.js';

const schema = { type: 'object', properties: {} };

function tool(extra = {}) {
    return {
        name: extra.name || 'get_outline',
        description: 'Return the outline.',
        schema,
        requires: 'scope:read',
        ...extra
    };
}

afterEach(() => {
    clearTools();
});

describe('tools layer', () => {
    test('unknown tool', async () => {
        const result = await executeTool({
            name: 'missing',
            actor: testActor(),
            scope: { canRead: true },
            budgetState: createBudgetState()
        });
        expect(result.code).toBe(AI_UNKNOWN_TOOL);
        expect(result.ok).toBe(false);
    });

    test('capability denial', async () => {
        registerTools(tool(), 'site');
        const result = await executeTool({
            name: 'get_outline',
            actor: testActor(),
            scope: { canRead: false },
            budgetState: createBudgetState()
        });
        expect(result.code).toBe(AI_CAPABILITY_DENIED);
    });

    test('admin policy denial', async () => {
        registerTools(tool(), 'site');
        const result = await executeTool({
            name: 'get_outline',
            actor: testActor(),
            scope: { canRead: true },
            policy: { disabledToolNames: ['get_outline'] },
            budgetState: createBudgetState()
        });
        expect(result.code).toBe(AI_POLICY_DENIED);
    });

    test('budget exhaustion', async () => {
        registerTools(tool({
            budget: { key: 'reads', max: 1 }
        }), 'site');
        const hooks = createHookManager({
            'onAiToolExecute:site': (ctx) => {
                ctx.result = { items: 1 };
            }
        });
        const budgetState = createBudgetState();
        const first = await executeTool({
            name: 'get_outline',
            actor: testActor(),
            scope: { canRead: true },
            budgetState,
            hookManager: hooks
        });
        expect(first.ok).toBe(true);
        const second = await executeTool({
            name: 'get_outline',
            actor: testActor(),
            scope: { canRead: true },
            budgetState,
            hookManager: hooks
        });
        expect(second.code).toBe(AI_BUDGET_EXCEEDED);
    });

    test('argument dedupe', async () => {
        registerTools(tool({ dedupeArgs: true, requires: null }), 'site');
        const hooks = createHookManager({
            'onAiToolExecute:site': (ctx) => {
                ctx.result = { ok: true };
            }
        });
        const budgetState = createBudgetState();
        const first = await executeTool({
            name: 'get_outline',
            args: { id: 1 },
            actor: testActor(),
            budgetState,
            hookManager: hooks
        });
        expect(first.ok).toBe(true);
        const second = await executeTool({
            name: 'get_outline',
            args: { id: 1 },
            actor: testActor(),
            budgetState,
            hookManager: hooks
        });
        expect(second.code).toBe(AI_DEDUPE);
    });

    test('oversize result hints to narrow the request', async () => {
        registerTools(tool({ requires: null }), 'site');
        const hooks = createHookManager({
            'onAiToolExecute:site': (ctx) => {
                ctx.result = { blob: 'x'.repeat(RESULT_SIZE_CAP) };
            }
        });
        const result = await executeTool({
            name: 'get_outline',
            actor: testActor(),
            budgetState: createBudgetState(),
            hookManager: hooks
        });
        expect(result.code).toBe(AI_RESULT_TOO_LARGE);
        expect(result.hint).toMatch(/narrow/i);
        expect(result.data).toBe(null);
    });

    test('new tool is offered until explicitly unchecked', async () => {
        registerTools(tool({ requires: null }), 'site');
        const offered = await resolveTools(testActor(), {
            policy: { reviewedToolNames: [], disabledToolNames: [] },
            scope: {}
        });
        expect(offered.tools.map(t => t.name)).toContain('get_outline');
        const hidden = await resolveTools(testActor(), {
            policy: { reviewedToolNames: ['get_outline'], disabledToolNames: ['get_outline'] },
            scope: {}
        });
        expect(hidden.tools.map(t => t.name)).not.toContain('get_outline');
    });

    test('omitted timeoutMs follows the site default; an explicit value wins', async () => {
        registerTools(tool({ requires: null }), 'site');
        registerTools(tool({ name: 'slow_one', description: 'Slow', requires: null, timeoutMs: 35000 }), 'site');
        const unset = await resolveTools(testActor(), {
            policy: {},
            scope: {},
            settings: { defaultToolTimeoutMs: 12000 }
        });
        expect(unset.tools.find((row) => row.name === 'get_outline').timeoutMs).toBe(12000);
        expect(unset.tools.find((row) => row.name === 'slow_one').timeoutMs).toBe(35000);
        const shipped = await resolveTools(testActor(), {
            policy: {},
            scope: {},
            settings: {}
        });
        expect(shipped.tools.find((row) => row.name === 'get_outline').timeoutMs).toBe(DEFAULT_TOOL_TIMEOUT_MS);
        expect(effectiveTimeoutMs({ timeoutMs: null }, {})).toBe(10000);
        expect(effectiveTimeoutMs({ timeoutMs: null }, { defaultToolTimeoutMs: 35000 })).toBe(35000);
        expect(effectiveTimeoutMs({ timeoutMs: 2000 }, { defaultToolTimeoutMs: 35000 })).toBe(2000);
    });

    test('site registration of a reserved name is refused and withheld', async () => {
        const warnings = [];
        global.LogController = {
            logWarning(_req, method, message) {
                warnings.push({ method, message });
            }
        };
        registerTools({
            name: 'get_source',
            description: 'Panel reader',
            schema,
            host: 'client',
            requires: 'scope:read'
        }, 'ai-core');
        registerTools({
            name: 'get_source',
            description: 'Leftover site copy',
            schema
        }, 'site');
        const hooks = createHookManager({
            onAiScopeResolve: (ctx) => {
                ctx.scope = { canRead: true };
            }
        });
        const offered = await resolveTools(testActor(), {
            hookManager: hooks,
            policy: {},
            settings: { sourcesEnabled: true },
            hasSources: true
        });
        expect(offered.tools.find((row) => row.name === 'get_source').owner).toBe('ai-core');
        expect(offered.tools.find((row) => row.name === 'get_source').description).toBe('Panel reader');
        expect(offered.withheld.some((row) => row.name === 'get_source' && row.reason === 'reserved')).toBe(true);
        expect(warnings).toHaveLength(1);
        expect(warnings[0].message).toMatch(/get_source/);
        registerTools({
            name: 'get_source',
            description: 'Again',
            schema
        }, 'site');
        expect(warnings).toHaveLength(1);
        delete global.LogController;
    });

    test('non-reserved names still follow last-wins', async () => {
        registerTools(tool({ name: 'get_tree', description: 'First', requires: null }), 'site');
        registerTools(tool({ name: 'get_tree', description: 'Second', requires: null }), 'other');
        const resolved = await resolveTools(testActor(), { policy: {}, scope: {} });
        expect(resolved.tools.find((row) => row.name === 'get_tree').owner).toBe('other');
        expect(resolved.tools.find((row) => row.name === 'get_tree').description).toBe('Second');
    });

    test('onAiToolRegister stamps owner from the handler plugin', async () => {
        const hooks = new Map();
        hooks.set('onAiToolRegister', [{
            pluginName: 'docs-plugin',
            handler: (ctx) => {
                ctx.tools.push({
                    name: 'get_docs',
                    description: 'Docs',
                    schema,
                    owner: 'forged'
                });
            }
        }]);
        const offered = await resolveTools(testActor({ origin: 'mcp' }), {
            hookManager: { hooks },
            policy: { reviewedToolNames: [], disabledToolNames: [] },
            scope: {}
        });
        expect(offered.tools[0].owner).toBe('docs-plugin');
    });
});

// EOF plugins/ai-core/webapp/tests/unit/tools-layer.test.js
