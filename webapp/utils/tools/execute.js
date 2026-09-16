/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tools / Execute
 * @tagline         Server-host tool execution
 * @description     Four gates, then onAiToolExecute; client-host is withheld until W-225
 * @file            plugins/ai-core/webapp/utils/tools/execute.js
 * @version         1.0.0
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { recordBudgetAndDedupe } from './budgets.js';
import {
    AI_CLIENT_HOST,
    AI_EXECUTE_FAILED,
    AI_UNKNOWN_TOOL,
    enforceSizeCap,
    makeEnvelope,
    stripMedia
} from './envelope.js';
import { gateTool } from './gates.js';
import { getTool } from './registry.js';

function withTimeout(promise, timeoutMs) {
    const ms = Number.isFinite(timeoutMs) ? timeoutMs : 5000;
    if (ms <= 0) {
        return promise;
    }
    let timer;
    return Promise.race([
        Promise.resolve(promise).finally(() => clearTimeout(timer)),
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Tool timed out after ${ms}ms`)), ms);
        })
    ]);
}

/**
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function executeTool(params) {
    const started = Date.now();
    const name = params.name;
    const args = params.args || {};
    const tool = params.tool || getTool(name);
    const hookManager = params.hookManager || global.HookManager;

    if (!tool) {
        return makeEnvelope({
            ok: false,
            code: AI_UNKNOWN_TOOL,
            error: `Unknown tool '${name}'.`,
            hint: 'Call a tool from this turn\'s offered list.',
            ms: Date.now() - started
        });
    }

    const denied = gateTool(tool, args, {
        actor: params.actor,
        scope: params.scope || {},
        policy: params.policy || {},
        budgetState: params.budgetState,
        settings: params.settings || {}
    });
    if (denied) {
        denied.ms = Date.now() - started;
        return denied;
    }

    if (tool.host === 'client') {
        return makeEnvelope({
            ok: false,
            code: AI_CLIENT_HOST,
            error: 'Client-host tools are not executed on this path.',
            hint: 'Use a server-host tool, or a transport that can reach the origin tab.',
            summary: `${tool.name} client-host`,
            ms: Date.now() - started
        });
    }

    recordBudgetAndDedupe(tool, args, params.budgetState);

    const ctx = {
        tool,
        name: tool.name,
        args,
        actor: params.actor,
        scope: params.scope || {},
        result: undefined
    };

    try {
        if (hookManager && typeof hookManager.executeForPlugin === 'function') {
            await withTimeout(
                hookManager.executeForPlugin('onAiToolExecute', tool.owner, ctx),
                tool.timeoutMs
            );
        }
    } catch (error) {
        return makeEnvelope({
            ok: false,
            code: AI_EXECUTE_FAILED,
            error: error.message || 'Tool execution failed.',
            hint: 'Fix the arguments, or try a different tool.',
            summary: `${tool.name} failed`,
            ms: Date.now() - started
        });
    }

    let envelope;
    if (ctx.result && typeof ctx.result === 'object' && ('ok' in ctx.result || 'data' in ctx.result)) {
        envelope = makeEnvelope({ ...ctx.result, ok: ctx.result.ok !== false });
    } else if (ctx.result !== undefined) {
        envelope = makeEnvelope({
            ok: true,
            data: ctx.result,
            summary: `${tool.name} ok`
        });
    } else {
        envelope = makeEnvelope({
            ok: false,
            code: AI_EXECUTE_FAILED,
            error: `No handler produced a result for ${tool.name}.`,
            hint: 'The tool owner must handle onAiToolExecute.',
            summary: `${tool.name} no handler`
        });
    }

    envelope.ms = Date.now() - started;
    if (params.fromClient === true) {
        envelope = stripMedia(envelope);
    }
    return enforceSizeCap(envelope, params.sizeCap);
}

// EOF plugins/ai-core/webapp/utils/tools/execute.js
