/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Agent / Providers
 * @tagline         Provider registry and capability map
 * @description     capabilities is a map; unknown keys read false
 * @file            plugins/ai-core/webapp/utils/agent/providers.js
 * @version         1.0.1
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

/**
 * @param {object} raw
 * @returns {object|null}
 */
export function normalizeProvider(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const plugin = raw.plugin || raw.id;
    if (!plugin) {
        return null;
    }
    const capabilities = raw.capabilities && typeof raw.capabilities === 'object'
        ? { ...raw.capabilities }
        : {};
    if (raw.supportsVision === true && capabilities.vision == null) {
        capabilities.vision = true;
    }
    return {
        plugin: String(plugin),
        label: raw.label || plugin,
        models: Array.isArray(raw.models) ? raw.models : [],
        capabilities,
        priceTable: raw.priceTable && typeof raw.priceTable === 'object' ? raw.priceTable : {},
        maxTokens: Number.isFinite(raw.maxTokens) ? raw.maxTokens : 4096,
        configured: raw.configured !== false
    };
}

export function hasCapability(provider, name) {
    return provider?.capabilities?.[name] === true;
}

export async function listProviders(hookManager = global.HookManager) {
    const ctx = { providers: [] };
    if (hookManager && typeof hookManager.execute === 'function') {
        await hookManager.execute('onAiProviderRegister', ctx);
    }
    const byPlugin = new Map();
    for (const raw of ctx.providers || []) {
        const provider = normalizeProvider(raw);
        if (provider) {
            byPlugin.set(provider.plugin, provider);
        }
    }
    return [...byPlugin.values()];
}

/**
 * Filter the admin allowed list by providers that actually registered
 * and have a usable credential (`configured !== false`).
 * Empty allowed list means every registered, configured model.
 */
export function filterAllowedModels(providers, settings = {}) {
    const registered = [];
    for (const provider of providers) {
        if (provider.configured === false) {
            continue;
        }
        for (const model of provider.models || []) {
            const id = typeof model === 'string' ? model : model.id;
            if (!id) {
                continue;
            }
            registered.push({
                provider: provider.plugin,
                model: id,
                label: (typeof model === 'object' && model.label) || `${provider.label} / ${id}`,
                capabilities: provider.capabilities || {}
            });
        }
    }
    const allowed = Array.isArray(settings.allowedModels) ? settings.allowedModels : [];
    if (!allowed.length) {
        return registered;
    }
    const wanted = new Set(allowed.map(entry => {
        if (typeof entry === 'string') {
            return entry;
        }
        return `${entry.provider}:${entry.model}`;
    }));
    return registered.filter(row => {
        return wanted.has(`${row.provider}:${row.model}`) || wanted.has(row.model);
    });
}

export function pickDefaultModel(menu, settings = {}) {
    const provider = settings.defaultProvider;
    const model = settings.defaultModel;
    if (provider && model) {
        const exact = (menu || []).find(row =>
            row.provider === provider && row.model === model);
        if (exact) {
            return exact;
        }
    }
    if (provider) {
        const firstOfProvider = (menu || []).find(row => row.provider === provider);
        if (firstOfProvider) {
            return firstOfProvider;
        }
    }
    return (menu && menu[0]) || null;
}

/**
 * Turn or write: explicit pair, else the thread's stored pair if still on
 * the menu, else the site default.
 */
export function chooseProviderModel(menu, settings = {}, params = {}, thread = {}) {
    if (params.provider && params.model) {
        return menu.find(row => row.provider === params.provider && row.model === params.model)
            || { provider: params.provider, model: params.model };
    }
    if (thread.provider && thread.model) {
        const fromThread = menu.find(row =>
            row.provider === thread.provider && row.model === thread.model);
        if (fromThread) {
            return fromThread;
        }
    }
    return pickDefaultModel(menu, settings);
}

export function pairOnMenu(menu, provider, model) {
    return (menu || []).some(row => row.provider === provider && row.model === model);
}

/**
 * Grey out non-vision models when the thread has images. Does not drop rows.
 */
export function gateModelsForVision(menu, { hasImages } = {}) {
    if (!hasImages) {
        return menu;
    }
    return (menu || []).map((row) => {
        if (row.capabilities?.vision === true) {
            return row;
        }
        return { ...row, available: false, reason: 'vision' };
    });
}

export function queryHasImages(query) {
    const value = query && query.hasImages;
    return value === '1' || value === 'true' || value === true || value === 1;
}

export function priceForModel(provider, modelId) {
    const row = provider?.priceTable?.[modelId];
    if (!row) {
        return null;
    }
    return {
        input: row.input ?? row.tokensIn ?? 0,
        output: row.output ?? row.tokensOut ?? 0,
        cacheWrite: row.cacheWrite ?? 0,
        cacheRead: row.cacheRead ?? 0
    };
}

export function computeCost(usage, price) {
    if (!price) {
        return null;
    }
    const tokensIn = usage.tokensIn || 0;
    const tokensOut = usage.tokensOut || 0;
    const cacheWrite = usage.cacheWrite || 0;
    const cacheRead = usage.cacheRead || 0;
    const perMillion = 1000000;
    return (tokensIn * price.input
        + tokensOut * price.output
        + cacheWrite * price.cacheWrite
        + cacheRead * price.cacheRead) / perMillion;
}

// EOF plugins/ai-core/webapp/utils/agent/providers.js
