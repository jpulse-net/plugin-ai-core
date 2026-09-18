/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tools / Descriptor
 * @tagline         Tool descriptor defaults and owner stamp
 * @description     Normalize a tool registration; owner is stamped, never supplied
 * @file            plugins/ai-core/webapp/utils/tools/descriptor.js
 * @version         1.0.5
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

const HOSTS = new Set(['server', 'client']);
const DATA_SCOPES = new Set(['call', 'turn']);

/**
 * @param {object} raw
 * @param {string} owner
 * @returns {object|null}
 */
export function normalizeDescriptor(raw, owner) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    const description = typeof raw.description === 'string' ? raw.description : '';
    if (!name || !description || !raw.schema || typeof raw.schema !== 'object') {
        return null;
    }
    const host = HOSTS.has(raw.host) ? raw.host : 'server';
    const dataScope = DATA_SCOPES.has(raw.dataScope) ? raw.dataScope : 'call';
    return {
        name,
        description,
        schema: raw.schema,
        host,
        module: raw.module == null ? null : String(raw.module),
        dataScope,
        requires: raw.requires == null || raw.requires === '' ? null : String(raw.requires),
        mutates: raw.mutates === true,
        proposes: raw.proposes === true,
        timeoutMs: Number.isFinite(raw.timeoutMs) ? raw.timeoutMs : 5000,
        group: typeof raw.group === 'string' && raw.group ? raw.group : 'read',
        budget: normalizeBudget(raw.budget),
        dedupeArgs: raw.dedupeArgs === true,
        exposeToMcp: raw.exposeToMcp !== false && host !== 'client',
        owner: owner || 'site'
    };
}

/**
 * @param {object|null} budget
 * @returns {object|null}
 */
function normalizeBudget(budget) {
    if (!budget || typeof budget !== 'object' || !budget.key) {
        return null;
    }
    return {
        key: String(budget.key),
        max: budget.max,
        countWhen: typeof budget.countWhen === 'function' ? budget.countWhen : null,
        overMessage: typeof budget.overMessage === 'string' ? budget.overMessage : '',
        overHint: typeof budget.overHint === 'string' ? budget.overHint : ''
    };
}

/**
 * Public shape offered to the model / capability probe — no functions.
 * @param {object} tool
 * @returns {object}
 */
export function publicTool(tool) {
    return {
        name: tool.name,
        description: tool.description,
        schema: tool.schema,
        host: tool.host,
        requires: tool.requires,
        mutates: tool.mutates,
        proposes: tool.proposes,
        group: tool.group,
        owner: tool.owner
    };
}

// EOF plugins/ai-core/webapp/utils/tools/descriptor.js
