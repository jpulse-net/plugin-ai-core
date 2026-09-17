/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Tools Layer
 * @tagline         Gates, budgets, envelope — no Express request
 * @file            plugins/ai-core/webapp/tests/unit/tools-layer.test.js
 * @version         1.0.4
 * @release         2026-09-17
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
    RESULT_SIZE_CAP,
    clearTools,
    createBudgetState,
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
