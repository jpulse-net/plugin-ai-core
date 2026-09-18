/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Panel / Regions
 * @tagline         Named panel region anchors
 * @description     Anchor list, merge, priority, and content normalization
 * @file            plugins/ai-core/webapp/utils/panel/regions.js
 * @version         1.0.6
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export const ANCHORS = [
    'header',
    'transcriptTop',
    'transcriptBottom',
    'composeAbove',
    'composeBelow'
];

export function unknownAnchorMessage(anchor) {
    return `Unknown region anchor "${anchor}". Valid anchors: ${ANCHORS.join(', ')}`;
}

function isNode(value) {
    return !!(value && typeof value === 'object' && value.nodeType);
}

/**
 * @param {object} region
 * @returns {object}
 */
export function normalizeRegion(region) {
    if (!region || typeof region !== 'object' || !region.name) {
        throw new Error('A region needs a name');
    }
    const anchor = String(region.anchor || '');
    if (ANCHORS.indexOf(anchor) < 0) {
        throw new Error(unknownAnchorMessage(anchor));
    }
    const priority = Number(region.priority);
    return {
        name: String(region.name),
        anchor: anchor,
        priority: Number.isFinite(priority) ? priority : 100,
        render: typeof region.render === 'function' ? region.render : null,
        on: Array.isArray(region.on) ? region.on.slice() : []
    };
}

/**
 * @param {object[]} list
 * @returns {object[]}
 */
export function mergeRegions(list) {
    const byName = new Map();
    (Array.isArray(list) ? list : []).forEach((row) => {
        const region = normalizeRegion(row);
        byName.set(region.name, region);
    });
    const ordered = Array.from(byName.values());
    ordered.sort((a, b) => {
        const ai = ANCHORS.indexOf(a.anchor);
        const bi = ANCHORS.indexOf(b.anchor);
        if (ai !== bi) {
            return ai - bi;
        }
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
    return ordered;
}

/**
 * @param {object[]} regions
 * @param {string} anchor
 * @returns {object[]}
 */
export function orderRegionsForAnchor(regions, anchor) {
    return (regions || []).filter((row) => row.anchor === anchor);
}

/**
 * Node passes through, string is escaped by the caller, null hides.
 * @param {*} out
 * @param {function} [escapeText]
 * @returns {{ hide: true }|{ hide: false, node: Node }|{ hide: false, text: string }}
 */
export function normalizeContent(out, escapeText) {
    if (out == null) {
        return { hide: true };
    }
    if (isNode(out)) {
        return { hide: false, node: out };
    }
    const text = String(out);
    return {
        hide: false,
        text: typeof escapeText === 'function' ? escapeText(text) : text
    };
}

// EOF plugins/ai-core/webapp/utils/panel/regions.js
