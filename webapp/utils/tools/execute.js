/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tools / Execute
 * @tagline         Server-host tool execution
 * @description     Four gates, then client executor, module run, or onAiToolExecute
 * @file            plugins/ai-core/webapp/utils/tools/execute.js
 * @version         1.0.14
 * @release         2026-09-20
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
import { inspectModule, runModule } from './modules.js';
import { effectiveTimeoutMs } from './descriptor.js';
import { getTool } from './registry.js';

function liftMedia(raw) {
    if (!raw || typeof raw !== 'object') {
        return raw;
    }
    let media = raw.media;
    let data = raw.data;
    if (data && typeof data === 'object' && !Array.isArray(data) && data.media != null) {
        if (media == null) {
            media = data.media;
        }
        data = { ...data };
        delete data.media;
    }
    return { ...raw, data, media };
}

function normalizeResult(raw, tool) {
    if (raw && typeof raw === 'object' && ('ok' in raw || 'data' in raw || 'code' in raw)) {
        return makeEnvelope({ ...liftMedia(raw), ok: raw.ok !== false });
    }
    if (raw !== undefined) {
        return makeEnvelope({
            ok: true,
            data: raw,
            summary: `${tool.name} ok`
        });
    }
    return makeEnvelope({
        ok: false,
        code: AI_EXECUTE_FAILED,
        error: `No handler produced a result for ${tool.name}.`,
        hint: 'The tool owner must handle onAiToolExecute.',
        summary: `${tool.name} no handler`
    });
}

async function resolveModuleData(tool, params, hookManager) {
    const cache = params.moduleDataCache;
    if (tool.dataScope === 'turn' && cache && cache.has(tool.name)) {
        return cache.get(tool.name);
    }
    const ctx = {
        tool,
        actor: params.actor,
        data: undefined
    };
    if (hookManager && typeof hookManager.executeFirst === 'function') {
        await hookManager.executeFirst('onAiToolData', ctx);
    }
    if (tool.dataScope === 'turn' && cache) {
        cache.set(tool.name, ctx.data);
    }
    return ctx.data;
}

function withTimeout(promise, timeoutMs) {
    const ms = Number.isFinite(timeoutMs) ? timeoutMs : effectiveTimeoutMs(null);
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
        if (typeof params.clientExecutor !== 'function') {
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
        const moduleInfo = tool.module ? inspectModule(tool.module) : { ok: true };
        try {
            const raw = await withTimeout(
                params.clientExecutor({
                    id: params.callId || '',
                    name: tool.name,
                    args,
                    module: tool.module || null,
                    moduleHash: moduleInfo.hash || null
                }),
                effectiveTimeoutMs(tool, params.settings)
            );
            let envelope = normalizeResult(raw, tool);
            envelope.ms = Date.now() - started;
            envelope = stripMedia(envelope);
            return enforceSizeCap(envelope, params.sizeCap);
        } catch (error) {
            return makeEnvelope({
                ok: false,
                code: error.code || AI_EXECUTE_FAILED,
                error: error.message || 'Client-host tool failed.',
                hint: 'Retry the turn when the origin tab is connected.',
                summary: `${tool.name} failed`,
                ms: Date.now() - started
            });
        }
    }

    recordBudgetAndDedupe(tool, args, params.budgetState);

    if (tool.module) {
        try {
            const data = await resolveModuleData(tool, params, hookManager);
            const raw = await withTimeout(runModule(tool.module, data, args), effectiveTimeoutMs(tool, params.settings));
            let envelope = normalizeResult(raw, tool);
            envelope.ms = Date.now() - started;
            if (params.fromClient === true) {
                envelope = stripMedia(envelope);
            }
            return enforceSizeCap(envelope, params.sizeCap);
        } catch (error) {
            return makeEnvelope({
                ok: false,
                code: AI_EXECUTE_FAILED,
                error: error.message || 'Tool module failed.',
                hint: 'Fix the module or its data hook.',
                summary: `${tool.name} failed`,
                ms: Date.now() - started
            });
        }
    }

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
                effectiveTimeoutMs(tool, params.settings)
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

    let envelope = normalizeResult(ctx.result, tool);

    envelope.ms = Date.now() - started;
    if (params.fromClient === true) {
        envelope = stripMedia(envelope);
    }
    return enforceSizeCap(envelope, params.sizeCap);
}

// EOF plugins/ai-core/webapp/utils/tools/execute.js
