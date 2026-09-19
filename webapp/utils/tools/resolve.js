/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tools / Resolve
 * @tagline         The one offered-tool-list function
 * @description     Recomputed every round; used by the loop, the probe, and later MCP
 * @file            plugins/ai-core/webapp/utils/tools/resolve.js
 * @version         1.0.10
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { normalizeActor } from './actor.js';
import { DEFAULT_TOOL_TIMEOUT_MS, publicTool } from './descriptor.js';
import { authorizeTool } from './gates.js';
import { inspectModule } from './modules.js';
import { collectTools, listReservedRefusals } from './registry.js';

/**
 * Resolve scope via onAiScopeResolve. Handlers mutate ctx.scope in place
 * (executeFirst still sees the mutation even when they return undefined).
 * @param {object} actor
 * @param {object} [hookManager]
 * @returns {Promise<object>}
 */
export async function resolveScope(actor, hookManager) {
    const normalized = normalizeActor(actor);
    const ctx = {
        actor: normalized,
        scopeId: normalized.scopeId,
        scopeType: normalized.scopeType,
        scope: {
            label: '',
            canRead: false,
            canWrite: false,
            nouns: { item: 'item', container: 'scope' }
        }
    };
    if (hookManager && typeof hookManager.executeFirst === 'function') {
        await hookManager.executeFirst('onAiScopeResolve', ctx);
    }
    return ctx.scope || {};
}

/**
 * The single answer to "which tools does this actor get".
 * Client-host tools stay on the list for web/ws/api (withheld at execute until
 * W-225) and are filtered for origin mcp. exposeToMcp === false is also dropped
 * for mcp.
 * @param {object} actor
 * @param {object} [options]
 * @returns {Promise<{ actor, scope, tools, withheld, policy }>}
 */
export async function resolveTools(actor, options = {}) {
    const normalized = normalizeActor(actor);
    const hookManager = options.hookManager || global.HookManager;
    const policy = options.policy || { reviewedToolNames: [], disabledToolNames: [] };
    const registered = options.tools || await collectTools(hookManager, { actor: normalized });
    const scope = options.scope || await resolveScope(normalized, hookManager);

    const offered = [];
    const withheld = [];
    const defaultTimeout = Number.isFinite(options.settings?.defaultToolTimeoutMs)
        && options.settings.defaultToolTimeoutMs > 0
        ? options.settings.defaultToolTimeoutMs
        : DEFAULT_TOOL_TIMEOUT_MS;
    for (const raw of registered) {
        const tool = { ...raw };
        if (!Number.isFinite(tool.timeoutMs)) {
            tool.timeoutMs = defaultTimeout;
        }
        if ((tool.name === 'get_source' || tool.name === 'list_sources')
            && (options.settings?.sourcesEnabled === false || options.hasSources !== true)) {
            withheld.push({
                name: tool.name,
                reason: options.settings?.sourcesEnabled === false ? 'sources-disabled' : 'no-sources'
            });
            continue;
        }
        if (normalized.origin === 'mcp' && (tool.host === 'client' || tool.exposeToMcp === false)) {
            withheld.push({ name: tool.name, reason: 'mcp' });
            continue;
        }
        const denied = authorizeTool(tool, normalized, scope, policy);
        if (denied) {
            withheld.push({ name: tool.name, reason: denied.code, error: denied.error });
            continue;
        }
        if (tool.module) {
            const moduleInfo = inspectModule(tool.module);
            if (!moduleInfo.ok) {
                withheld.push({
                    name: tool.name,
                    reason: moduleInfo.reason === 'missing' ? 'missing-module' : 'impure-module',
                    error: moduleInfo.reason
                });
                continue;
            }
        }
        offered.push(tool);
    }
    for (const row of listReservedRefusals()) {
        if (!withheld.some((item) => item.name === row.name && item.reason === 'reserved')) {
            withheld.push({ name: row.name, reason: 'reserved', owner: row.owner });
        }
    }

    return {
        actor: normalized,
        scope,
        tools: offered,
        withheld,
        policy,
        publicTools: offered.map(publicTool)
    };
}

// EOF plugins/ai-core/webapp/utils/tools/resolve.js
