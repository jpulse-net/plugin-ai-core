/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Agent / Settings
 * @tagline         Effective AI settings
 * @description     Site config tab, optional app.conf.ai, and plugin debug flag
 * @file            plugins/ai-core/webapp/utils/agent/settings.js
 * @version         1.0.11
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { DEFAULT_CLAIM_PHRASES } from '../proposals/index.js';
import { DEFAULT_CAPS } from './quota.js';

let cachedSettings = null;

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
    defaultToolTimeoutMs: 10000,
    maxContextChars: 100000,
    disabledTools: [],
    reviewedTools: [],
    retentionDays: 90,
    autoTitle: true,
    siteInstructions: '',
    proposalClaimPhrases: DEFAULT_CLAIM_PHRASES.slice(),
    sourcesEnabled: true,
    sourceMimeTypes: ['text/plain', 'text/markdown', 'text/csv', 'text/html'],
    maxSourcesPerConversation: 5,
    maxSourceChars: 1000000,
    maxTotalSourceChars: 2000000,
    maxSourceReadChars: 24000,
    maxSourceReadsPerTurn: 8,
    urlIngestEnabled: true,
    urlMaxBytes: 5242880,
    urlTimeoutMs: 15000,
    urlAllowedHosts: [],
    urlBlockedHosts: [],
    maxConvertBytes: 26214400,
    maxConvertPages: 100,
    convertTimeoutMs: 30000,
    imagesEnabled: true,
    imageMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    maxImageBytes: 4194304,
    maxImageEdge: 2048,
    imageStageTtlSec: 300
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

function asLines(value) {
    if (Array.isArray(value)) {
        return value.map(row => String(row || '').trim()).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
        return value.split(/\n/).map(row => row.trim()).filter(Boolean);
    }
    return [];
}

export function cacheSettings(settings) {
    cachedSettings = settings || null;
    return cachedSettings;
}

export function getCachedSettings() {
    return cachedSettings;
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
        defaultToolTimeoutMs: Number.isFinite(site.defaultToolTimeoutMs)
            ? site.defaultToolTimeoutMs
            : AI_CONFIG_DEFAULTS.defaultToolTimeoutMs,
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
            : AI_CONFIG_DEFAULTS.maxSourceReadsPerTurn,
        sourcesEnabled: site.sourcesEnabled !== false,
        sourceMimeTypes: asArray(site.sourceMimeTypes).length
            ? asArray(site.sourceMimeTypes)
            : AI_CONFIG_DEFAULTS.sourceMimeTypes.slice(),
        maxSourcesPerConversation: Number.isFinite(site.maxSourcesPerConversation)
            ? site.maxSourcesPerConversation
            : AI_CONFIG_DEFAULTS.maxSourcesPerConversation,
        maxSourceChars: Number.isFinite(site.maxSourceChars)
            ? site.maxSourceChars
            : AI_CONFIG_DEFAULTS.maxSourceChars,
        maxTotalSourceChars: Number.isFinite(site.maxTotalSourceChars)
            ? site.maxTotalSourceChars
            : AI_CONFIG_DEFAULTS.maxTotalSourceChars,
        maxSourceReadChars: Number.isFinite(site.maxSourceReadChars)
            ? site.maxSourceReadChars
            : AI_CONFIG_DEFAULTS.maxSourceReadChars,
        urlIngestEnabled: site.urlIngestEnabled !== false,
        urlMaxBytes: Number.isFinite(site.urlMaxBytes)
            ? site.urlMaxBytes
            : AI_CONFIG_DEFAULTS.urlMaxBytes,
        urlTimeoutMs: Number.isFinite(site.urlTimeoutMs)
            ? site.urlTimeoutMs
            : AI_CONFIG_DEFAULTS.urlTimeoutMs,
        urlAllowedHosts: asArray(site.urlAllowedHosts),
        urlBlockedHosts: asArray(site.urlBlockedHosts),
        maxConvertBytes: Number.isFinite(site.maxConvertBytes)
            ? site.maxConvertBytes
            : AI_CONFIG_DEFAULTS.maxConvertBytes,
        maxConvertPages: Number.isFinite(site.maxConvertPages)
            ? site.maxConvertPages
            : AI_CONFIG_DEFAULTS.maxConvertPages,
        convertTimeoutMs: Number.isFinite(site.convertTimeoutMs)
            ? site.convertTimeoutMs
            : AI_CONFIG_DEFAULTS.convertTimeoutMs,
        imagesEnabled: site.imagesEnabled !== false,
        imageMimeTypes: asArray(site.imageMimeTypes).length
            ? asArray(site.imageMimeTypes)
            : AI_CONFIG_DEFAULTS.imageMimeTypes.slice(),
        maxImageBytes: Number.isFinite(site.maxImageBytes)
            ? site.maxImageBytes
            : AI_CONFIG_DEFAULTS.maxImageBytes,
        maxImageEdge: Number.isFinite(site.maxImageEdge)
            ? site.maxImageEdge
            : AI_CONFIG_DEFAULTS.maxImageEdge,
        imageStageTtlSec: Number.isFinite(site.imageStageTtlSec)
            ? site.imageStageTtlSec
            : AI_CONFIG_DEFAULTS.imageStageTtlSec,
        proposalClaimPhrases: asLines(site.proposalClaimPhrases).length
            ? asLines(site.proposalClaimPhrases)
            : DEFAULT_CLAIM_PHRASES.slice()
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
    const merged = mergeSettings({
        site,
        app: deps.app || global.appConfig?.ai || {},
        plugin
    });
    return cacheSettings(merged);
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
