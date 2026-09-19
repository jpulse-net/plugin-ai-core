/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Utils / AI Tools / Sources
 * @tagline         Pure attached-source reader
 * @description     Outline, section, and window reads; no I/O
 * @file            plugins/ai-core/webapp/utils/ai-tools/sources.js
 * @version         1.0.9
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export const SOURCE_OPEN = '<<<SOURCE';
export const SOURCE_CLOSE = '<<<END SOURCE>>>';
export const HARD_MAX_READ_CHARS = 64000;
export const NAME_MAX = 120;

const DEFAULT_CAPS = {
    maxSourceReadChars: 24000
};

function asInt(value, fallback) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? n : fallback;
}

function clipName(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

function slugify(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function uniqueKey(label, used) {
    let key = slugify(label) || 'section';
    if (!used[key]) {
        used[key] = true;
        return key;
    }
    let n = 2;
    while (used[`${key}-${n}`]) {
        n += 1;
    }
    key = `${key}-${n}`;
    used[key] = true;
    return key;
}

export function extractSections(markdown) {
    const text = String(markdown || '');
    const lines = text.split('\n');
    let inFence = false;
    const chunks = [{ heading: '', lines: [] }];
    for (const line of lines) {
        if (/^ {0,3}```/.test(line)) {
            inFence = !inFence;
        }
        if (!inFence && /^## /.test(line)) {
            chunks.push({ heading: line.replace(/^##\s+/, '').trim(), lines: [line] });
        } else {
            chunks[chunks.length - 1].lines.push(line);
        }
    }
    const used = {};
    const sections = [];
    for (const chunk of chunks) {
        const body = chunk.lines.join('\n').trim();
        if (!body) {
            continue;
        }
        let label = chunk.heading;
        if (!label) {
            const firstLine = body.split('\n')[0].replace(/^#\s+/, '').trim();
            label = firstLine || 'Overview';
        }
        sections.push({
            key: uniqueKey(label, used),
            label,
            text: body,
            chars: body.length
        });
    }
    return {
        sections,
        outline: sections.map((row) => ({ key: row.key, label: row.label, chars: row.chars }))
    };
}

export function wrapSourceText(id, section, text) {
    let head = `${SOURCE_OPEN} ${String(id || '')}`;
    if (section) {
        head += ` section=${JSON.stringify(String(section))}`;
    }
    head += '>>>';
    return `${head}\n${String(text == null ? '' : text)}\n${SOURCE_CLOSE}`;
}

export function isSourceTextRead(args) {
    const a = args || {};
    if (a.section != null && String(a.section).trim() !== '') {
        return true;
    }
    if (a.offset != null && a.offset !== '') {
        return true;
    }
    if (a.limit != null && a.limit !== '') {
        return true;
    }
    return false;
}

export function pasteName(text, userName) {
    const typed = clipName(userName);
    if (typed) {
        return typed;
    }
    const raw = String(text == null ? '' : text);
    const heading = raw.match(/^\s{0,3}#{1,6}\s+(.+)$/m);
    if (heading && heading[1] && heading[1].trim()) {
        return clipName(heading[1].trim());
    }
    const words = raw.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (!words.length) {
        return 'Pasted text';
    }
    let name = words.slice(0, 8).join(' ');
    if (words.length > 8) {
        name += '\u2026';
    }
    return clipName(name);
}

function findSection(sections, wanted) {
    const w = String(wanted || '').trim();
    if (!w) {
        return null;
    }
    const lower = w.toLowerCase();
    return sections.find((row) => row.key === w)
        || sections.find((row) => String(row.label).toLowerCase() === lower)
        || null;
}

function listSources(sources) {
    const list = Array.isArray(sources) ? sources : [];
    const rows = list.map((src) => ({
        id: src.id,
        name: src.name,
        origin: src.origin,
        mimeType: src.mimeType,
        chars: src.chars,
        sections: Array.isArray(src.outline) ? src.outline.length : 0
    }));
    const totalChars = list.reduce((sum, src) => sum + asInt(src && src.chars, 0), 0);
    return {
        ok: true,
        data: { sources: rows, count: rows.length, totalChars },
        summary: rows.length === 1 ? '1 source' : `${rows.length} sources`
    };
}

function getSource(sources, args, caps) {
    const cfg = { ...DEFAULT_CAPS, ...(caps || {}) };
    const id = typeof args.id === 'string' ? args.id.trim() : '';
    if (!id) {
        return {
            ok: false,
            code: 'AI_BAD_ARGS',
            error: 'id is required.',
            hint: 'Pass the source id from list_sources.',
            summary: 'get_source missing id'
        };
    }
    const list = Array.isArray(sources) ? sources : [];
    const src = list.find((row) => row && row.id === id);
    if (!src) {
        return {
            ok: false,
            code: 'AI_SOURCE_NOT_FOUND',
            error: `Unknown source ${id}.`,
            hint: 'Call list_sources. The source may have been removed.',
            summary: 'get_source not found'
        };
    }
    if (!isSourceTextRead(args)) {
        const outline = src.outline || extractSections(src.text || '').outline;
        return {
            ok: true,
            data: {
                id: src.id,
                name: src.name,
                chars: src.chars,
                outline
            },
            summary: `outline ${outline.length} sections`
        };
    }
    if (args.offset != null && args.offset !== '') {
        const offCheck = Math.floor(Number(args.offset));
        if (!Number.isFinite(offCheck) || offCheck < 0 || offCheck !== Number(args.offset)) {
            return {
                ok: false,
                code: 'AI_BAD_ARGS',
                error: 'offset must be a non-negative integer.',
                summary: 'get_source bad offset'
            };
        }
    }
    if (args.limit != null && args.limit !== '') {
        const limCheck = Math.floor(Number(args.limit));
        if (!Number.isFinite(limCheck) || limCheck < 0 || limCheck !== Number(args.limit)) {
            return {
                ok: false,
                code: 'AI_BAD_ARGS',
                error: 'limit must be a non-negative integer.',
                summary: 'get_source bad limit'
            };
        }
    }
    let maxRead = Math.min(asInt(cfg.maxSourceReadChars, DEFAULT_CAPS.maxSourceReadChars), HARD_MAX_READ_CHARS);
    if (args.limit != null && args.limit !== '') {
        maxRead = Math.min(maxRead, Math.floor(Number(args.limit)), HARD_MAX_READ_CHARS);
    }
    let text = String(src.text || '');
    let sectionLabel = '';
    if (args.section != null && String(args.section).trim() !== '') {
        const extracted = extractSections(text);
        const found = findSection(extracted.sections, args.section);
        if (!found) {
            const keys = extracted.outline.map((row) => row.key).join(', ');
            return {
                ok: false,
                code: 'AI_SOURCE_NO_SECTION',
                error: `No section '${String(args.section).trim()}'.`,
                hint: `Valid keys: ${keys || '(none)'}`,
                summary: 'get_source no section'
            };
        }
        text = found.text;
        sectionLabel = found.label;
    }
    let offset = 0;
    if (args.offset != null && args.offset !== '') {
        offset = Math.floor(Number(args.offset));
    }
    if (offset > text.length) {
        offset = text.length;
    }
    const slice = text.slice(offset, offset + maxRead);
    const truncated = (offset + slice.length) < text.length;
    const data = {
        id: src.id,
        name: src.name,
        text: wrapSourceText(src.id, sectionLabel, slice),
        charStart: offset,
        charEnd: offset + slice.length,
        totalChars: text.length,
        truncated
    };
    if (sectionLabel) {
        data.section = sectionLabel;
    }
    if (truncated) {
        data.nextOffset = offset + slice.length;
    }
    return {
        ok: true,
        data,
        summary: `${src.name} ${slice.length} chars`
    };
}

/**
 * @param {{ sources?: object[], caps?: object, toolName?: string }} data
 * @param {object} [args]
 * @returns {object}
 */
export function run(data = {}, args = {}) {
    const sources = data.sources || [];
    const caps = data.caps || {};
    const name = data.toolName || args._toolName || 'get_source';
    if (name === 'list_sources') {
        return listSources(sources);
    }
    return getSource(sources, args, caps);
}

export default { run };

// EOF plugins/ai-core/webapp/utils/ai-tools/sources.js
