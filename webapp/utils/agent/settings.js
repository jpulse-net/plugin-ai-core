/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Agent / Settings
 * @tagline         Effective AI settings
 * @description     Site config tab, optional app.conf.ai, and plugin debug flag
 * @file            plugins/ai-core/webapp/utils/agent/settings.js
 * @version         1.0.0
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { DEFAULT_CAPS } from './quota.js';

export const AI_CONFIG_DEFAULTS = {
    enabled: true,
    allowedRoles: ['user', 'admin', 'root'],
    defaultProvider: '',
    defaultModel: '',
    allowedModels: [],
    maxRequestsPerDay: 200,
    maxTokensPerDay: 400000,
    maxRoundsPerTurn: 8,
    turnTimeoutMs: 120000,
    maxContextChars: 100000,
    disabledTools: [],
    reviewedTools: [],
    retentionDays: 90,
    autoTitle: true,
    siteInstructions: ''
};

function asArray(value) {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : value.split(/[\s,]+/).filter(Boolean);
        } catch {
            return value.split(/[\s,]+/).filter(Boolean);
        }
    }
    return [];
}

/**
 * @param {object} [sources]
 * @returns {object}
 */
export function mergeSettings(sources = {}) {
    const site = sources.site || {};
    const app = sources.app || {};
    const plugin = sources.plugin || {};
    const allowedModels = asArray(site.allowedModels ?? app.allowedModels);
    const disabledTools = asArray(site.disabledTools);
    const reviewedTools = asArray(site.reviewedTools);
    const maxRequests = Number.isFinite(site.maxRequestsPerDay)
        ? site.maxRequestsPerDay
        : AI_CONFIG_DEFAULTS.maxRequestsPerDay;
    const maxTokens = Number.isFinite(site.maxTokensPerDay)
        ? site.maxTokensPerDay
        : AI_CONFIG_DEFAULTS.maxTokensPerDay;
    return {
        enabled: site.enabled !== false,
        allowedRoles: asArray(site.allowedRoles).length
            ? asArray(site.allowedRoles)
            : AI_CONFIG_DEFAULTS.allowedRoles,
        defaultProvider: site.defaultProvider || app.defaultProvider || '',
        defaultModel: site.defaultModel || app.defaultModel || '',
        allowedModels,
        caps: [
            { dimension: 'requests', period: 'day', limit: maxRequests },
            { dimension: 'tokens', period: 'day', limit: maxTokens }
        ],
        maxRoundsPerTurn: Number.isFinite(site.maxRoundsPerTurn)
            ? site.maxRoundsPerTurn
            : AI_CONFIG_DEFAULTS.maxRoundsPerTurn,
        turnTimeoutMs: Number.isFinite(site.turnTimeoutMs)
            ? site.turnTimeoutMs
            : AI_CONFIG_DEFAULTS.turnTimeoutMs,
        maxContextChars: Number.isFinite(site.maxContextChars)
            ? site.maxContextChars
            : AI_CONFIG_DEFAULTS.maxContextChars,
        policy: {
            reviewedToolNames: reviewedTools,
            disabledToolNames: disabledTools
        },
        retentionDays: Number.isFinite(site.retentionDays)
            ? site.retentionDays
            : AI_CONFIG_DEFAULTS.retentionDays,
        autoTitle: site.autoTitle !== false,
        siteInstructions: site.siteInstructions || app.promptOverride || '',
        debugDumps: plugin.debugDumps === true || app.debugDumps === true,
        maxSourceReadsPerTurn: Number.isFinite(site.maxSourceReadsPerTurn)
            ? site.maxSourceReadsPerTurn
            : 8
    };
}

/**
 * PluginModel is not published on global (ConfigModel is). hello-world imports
 * it from webapp/model/plugin.js; do the same so the plugin-config checkbox
 * is actually read.
 */
async function resolvePluginModel(override) {
    if (override?.getByName) {
        return override;
    }
    if (global.PluginModel?.getByName) {
        return global.PluginModel;
    }
    try {
        const mod = await import('../../../../../webapp/model/plugin.js');
        return mod.default;
    } catch {
        return null;
    }
}

export async function loadSettings(deps = {}) {
    let site = {};
    try {
        const ConfigModel = deps.configModel || global.ConfigModel;
        if (ConfigModel?.findById) {
            const docName = global.appConfig?.controller?.config?.defaultDocName || 'global';
            const doc = await ConfigModel.findById(docName, true);
            site = doc?.data?.ai || {};
        }
    } catch {
        site = {};
    }
    let plugin = {};
    try {
        const PluginModel = await resolvePluginModel(deps.pluginModel);
        if (PluginModel?.getByName) {
            const row = await PluginModel.getByName('ai-core');
            plugin = row?.config || {};
        }
    } catch {
        plugin = {};
    }
    return mergeSettings({
        site,
        app: deps.app || global.appConfig?.ai || {},
        plugin
    });
}

export function roleAllowed(actor, settings) {
    const roles = actor?.roles || [];
    const allowed = settings.allowedRoles || [];
    if (!allowed.length) {
        return true;
    }
    return roles.some(role => allowed.includes(role));
}

export { DEFAULT_CAPS };

// EOF plugins/ai-core/webapp/utils/agent/settings.js
