/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tools / Registry
 * @tagline         In-process tool registry
 * @description     Imperative registration plus collection from onAiToolRegister
 * @file            plugins/ai-core/webapp/utils/tools/registry.js
 * @version         1.0.0
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { normalizeDescriptor } from './descriptor.js';

const tools = new Map();

/**
 * @param {object|object[]} raw
 * @param {string} owner
 * @returns {object[]}
 */
export function registerTools(raw, owner = 'site') {
    const list = Array.isArray(raw) ? raw : [raw];
    const accepted = [];
    for (const item of list) {
        const tool = normalizeDescriptor(item, owner);
        if (!tool) {
            continue;
        }
        tools.set(tool.name, tool);
        accepted.push(tool);
    }
    return accepted;
}

export function clearTools() {
    tools.clear();
}

export function getTool(name) {
    return tools.get(name) || null;
}

export function listRegisteredTools() {
    return [...tools.values()];
}

/**
 * Merge imperative registrations with onAiToolRegister contributions.
 * Later owner of the same name wins.
 * @param {object} [hookManager]
 * @param {object} [hookCtx]
 * @returns {Promise<object[]>}
 */
export async function collectTools(hookManager, hookCtx = {}) {
    const byName = new Map();
    for (const tool of tools.values()) {
        byName.set(tool.name, tool);
    }
    const stamped = await collectFromRegisterHook(hookManager, hookCtx);
    for (const tool of stamped) {
        byName.set(tool.name, tool);
    }
    return [...byName.values()];
}

/**
 * Stamp owner from the handler's plugin (or 'site'). Never trust a supplied owner.
 * Walks HookManager.hooks when present so each registrant is attributed correctly.
 */
async function collectFromRegisterHook(hookManager, hookCtx) {
    const accepted = [];
    const handlers = hookManager?.hooks?.get?.('onAiToolRegister');
    if (Array.isArray(handlers) && handlers.length) {
        for (const entry of handlers) {
            const ctx = { tools: [], ...hookCtx };
            if (typeof entry.handler === 'function') {
                await entry.handler(ctx);
            }
            pushNormalized(accepted, ctx.tools, entry.pluginName || 'site');
        }
        return accepted;
    }
    if (hookManager && typeof hookManager.execute === 'function') {
        const ctx = { tools: [], ...hookCtx };
        const result = await hookManager.execute('onAiToolRegister', ctx);
        pushNormalized(accepted, result?.tools || ctx.tools, 'site');
    }
    return accepted;
}

function pushNormalized(accepted, incoming, owner) {
    for (const item of incoming || []) {
        const tool = normalizeDescriptor({ ...item, owner: undefined }, owner);
        if (tool) {
            accepted.push(tool);
        }
    }
}

// EOF plugins/ai-core/webapp/utils/tools/registry.js
