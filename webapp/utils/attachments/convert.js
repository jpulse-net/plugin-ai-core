/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Attachments / Convert
 * @tagline         Document conversion call path
 * @description     Lists converters, merges caps, ordered retry, empty-extract refusal
 * @file            plugins/ai-core/webapp/utils/attachments/convert.js
 * @version         1.0.11
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export const ROUTE_MAX_BYTES = 26214400;

/**
 * Input-file cap for POST /api/1/ai/source/convert. Clamped to the route ceiling.
 * @param {object} [settings]
 * @returns {number}
 */
export function maxConvertBytesOf(settings) {
    const n = Number(settings && settings.maxConvertBytes);
    const raw = Number.isFinite(n) && n > 0 ? n : ROUTE_MAX_BYTES;
    return Math.min(raw, ROUTE_MAX_BYTES);
}

function clipPhrase(value) {
    return String(value == null ? '' : value)
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80);
}

export function converterUnitLabel(converter) {
    const u = converter && typeof converter.unitLabel === 'string'
        ? converter.unitLabel.replace(/\s+/g, ' ').trim()
        : '';
    return u || 'page';
}

export function pluralizeUnit(unit, n) {
    const u = converterUnitLabel({ unitLabel: unit });
    if (n === 1) {
        return u;
    }
    if (/s$/i.test(u)) {
        return u;
    }
    return `${u}s`;
}

export function convertLimits(settings, converter) {
    const sitePages = typeof settings.maxConvertPages === 'number' && settings.maxConvertPages > 0
        ? settings.maxConvertPages
        : 100;
    const pluginPages = typeof converter.maxPages === 'number' && converter.maxPages > 0
        ? converter.maxPages
        : sitePages;
    return {
        maxPages: Math.min(sitePages, pluginPages),
        maxChars: typeof settings.maxSourceChars === 'number' && settings.maxSourceChars > 0
            ? settings.maxSourceChars
            : 1000000,
        timeoutMs: typeof settings.convertTimeoutMs === 'number' && settings.convertTimeoutMs > 0
            ? settings.convertTimeoutMs
            : 30000
    };
}

export function publicConverters(converters) {
    return (converters || []).map((c) => ({
        plugin: c.plugin,
        label: typeof c.label === 'string' ? c.label : '',
        mimeTypes: (c.mimeTypes || []).filter((m) => typeof m === 'string' && m),
        extensions: (c.extensions || []).filter((e) => typeof e === 'string' && e),
        maxPages: typeof c.maxPages === 'number' && c.maxPages > 0 ? c.maxPages : 100,
        unitLabel: converterUnitLabel(c),
        rejects: Array.isArray(c.rejects) ? c.rejects.filter((r) => r && Array.isArray(r.extensions)) : []
    })).filter((c) => c.plugin && c.mimeTypes.length);
}

export function converterMimeList(converters) {
    const out = [];
    for (const row of converters || []) {
        for (const mime of row.mimeTypes || []) {
            const m = String(mime || '').toLowerCase();
            if (m && out.indexOf(m) === -1) {
                out.push(m);
            }
        }
    }
    return out;
}

export function matchConverters(converters, mimeType) {
    const mime = String(mimeType || '').toLowerCase().split(';')[0].trim();
    return (converters || []).filter((row) => (row.mimeTypes || []).indexOf(mime) !== -1);
}

export function isEmptyExtract(text, meta) {
    if (meta && (meta.empty || meta.emptyCode || meta.emptyReason)) {
        return true;
    }
    return !String(text || '').trim();
}

export function emptyExtractCode(emptyCode) {
    return emptyCode === 'no-text-layer' ? 'AI_SOURCE_SCAN' : 'AI_SOURCE_EMPTY';
}

export function emptyExtractMessage(opts) {
    const o = opts || {};
    const name = String(o.name || 'Untitled').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Untitled';
    const phrase = clipPhrase(o.phrase) || 'no extractable text';
    if (o.emptyCode === 'no-text-layer') {
        return `Could not read ${name}: ${phrase}. A scanned page has no text layer.`;
    }
    return `Could not read ${name}: ${phrase}.`;
}

export function noConverterMessage(mimeType) {
    const mime = String(mimeType || 'this type');
    return `No converter is installed for ${mime}. Install a document-conversion plugin that registers that type.`;
}

/**
 * @param {object} hookManager
 * @returns {Promise<object[]>}
 */
export async function listConverters(hookManager) {
    const hm = hookManager || global.HookManager;
    if (!hm || typeof hm.execute !== 'function') {
        return [];
    }
    const ctx = { converters: [] };
    await hm.execute('onDocumentConvertRegister', ctx);
    const list = Array.isArray(ctx.converters) ? ctx.converters : [];
    return list.filter((row) => row && row.plugin && Array.isArray(row.mimeTypes) && row.mimeTypes.length);
}

/**
 * Try converters claiming mimeType in registration order until one returns text.
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function convertDocument(params) {
    const hookManager = params.hookManager || global.HookManager;
    const converters = params.converters || await listConverters(hookManager);
    const claimants = matchConverters(converters, params.mimeType);
    if (!claimants.length) {
        return {
            ok: false,
            code: 'AI_NO_CONVERTER',
            error: noConverterMessage(params.mimeType)
        };
    }
    let lastEmpty = null;
    for (const converter of claimants) {
        const limits = convertLimits(params.settings || {}, converter);
        const ctx = {
            bytes: params.bytes,
            mimeType: params.mimeType,
            maxChars: limits.maxChars,
            maxPages: limits.maxPages,
            timeoutMs: limits.timeoutMs,
            text: '',
            markdown: '',
            meta: {}
        };
        if (!hookManager || typeof hookManager.executeForPlugin !== 'function') {
            return {
                ok: false,
                code: 'AI_NO_CONVERTER',
                error: noConverterMessage(params.mimeType)
            };
        }
        await hookManager.executeForPlugin('onDocumentConvert', converter.plugin, ctx);
        const text = String(ctx.markdown || ctx.text || '');
        const meta = ctx.meta && typeof ctx.meta === 'object' ? ctx.meta : {};
        if (isEmptyExtract(text, meta)) {
            lastEmpty = {
                ok: false,
                code: emptyExtractCode(meta.emptyCode),
                error: emptyExtractMessage({
                    name: params.name,
                    phrase: meta.emptyReason || meta.phrase,
                    emptyCode: meta.emptyCode
                }),
                meta
            };
            continue;
        }
        let out = text;
        let charTruncated = false;
        if (out.length > limits.maxChars) {
            out = out.slice(0, limits.maxChars);
            charTruncated = true;
        }
        return {
            ok: true,
            text: out,
            truncated: charTruncated || meta.pageTruncated === true || meta.truncated === true,
            truncatedBy: meta.pageTruncated ? 'pages' : (charTruncated ? 'chars' : null),
            unit: converterUnitLabel(converter),
            limit: meta.pageTruncated ? limits.maxPages : (charTruncated ? limits.maxChars : null),
            plugin: converter.plugin
        };
    }
    return lastEmpty || {
        ok: false,
        code: 'AI_SOURCE_EMPTY',
        error: emptyExtractMessage({ name: params.name })
    };
}

// EOF plugins/ai-core/webapp/utils/attachments/convert.js
