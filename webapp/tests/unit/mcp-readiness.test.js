/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / MCP Readiness
 * @tagline         Tools layer with a synthetic non-web actor
 * @file            plugins/ai-core/webapp/tests/unit/mcp-readiness.test.js
 * @version         1.0.1
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import {
    clearTools,
    createBudgetState,
    executeTool,
    registerTools,
    resolveTools
} from '../../utils/tools/index.js';
import { createHookManager, testActor } from './helpers.js';

afterEach(() => {
    clearTools();
});

describe('MCP readiness', () => {
    test('client-host tools are filtered and server-host tools execute', async () => {
        registerTools([
            {
                name: 'get_outline',
                description: 'Outline',
                schema: { type: 'object', properties: {} },
                host: 'server',
                requires: 'scope:read'
            },
            {
                name: 'get_tree',
                description: 'Tree',
                schema: { type: 'object', properties: {} },
                host: 'client',
                requires: 'scope:read'
            }
        ], 'site');
        const actor = testActor({ origin: 'mcp', req: null });
        const resolved = await resolveTools(actor, {
            scope: { canRead: true },
            policy: { reviewedToolNames: [], disabledToolNames: [] }
        });
        expect(resolved.tools.map(t => t.name)).toEqual(['get_outline']);
        expect(resolved.withheld.some(w => w.name === 'get_tree')).toBe(true);

        const hooks = createHookManager({
            'onAiToolExecute:site': (ctx) => {
                ctx.result = { outline: [] };
            }
        });
        const result = await executeTool({
            name: 'get_outline',
            actor,
            scope: { canRead: true },
            budgetState: createBudgetState(),
            hookManager: hooks
        });
        expect(result.ok).toBe(true);
        expect(result.data.outline).toEqual([]);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/mcp-readiness.test.js
