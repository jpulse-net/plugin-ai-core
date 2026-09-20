/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Attachments / HTML
 * @tagline         Readability-lite HTML to markdown
 * @description     No DOM library; empty-shell verdict for client-rendered pages
 * @file            plugins/ai-core/webapp/utils/attachments/html.js
 * @version         1.0.12
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export const EMPTY_SHELL_MIN_CHARS = 500;
export const EMPTY_SHELL_MAX_RATIO = 0.02;
export const EMPTY_SHELL_MESSAGE = 'That page has almost no text. Paste the article instead.';

const DISCARD_TAGS = ['script', 'style', 'noscript', 'svg', 'template', 'iframe'];
const CHROME_TAGS = ['nav', 'header', 'footer', 'aside', 'form'];
const CHROME_ATTR = /\b(nav|menu|sidebar|comment|promo|cookie|share|related|footer)\b/i;
const NAMED_ENTITIES = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    ndash: '\u2013',
    mdash: '\u2014',
    hellip: '\u2026',
    copy: '\u00a9',
    reg: '\u00ae',
    trade: '\u2122',
    lsquo: '\u2018',
    rsquo: '\u2019',
    ldquo: '\u201c',
    rdquo: '\u201d'
};

function findMatchingClose(html, tagName, from) {
    const openRe = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
    const closeRe = new RegExp(`</${tagName}\\s*>`, 'gi');
    let depth = 1;
    let i = from;
    while (i < html.length && depth > 0) {
        openRe.lastIndex = i;
        closeRe.lastIndex = i;
        const open = openRe.exec(html);
        const close = closeRe.exec(html);
        if (!close) {
            return null;
        }
        if (open && open.index < close.index) {
            depth += 1;
            i = open.index + open[0].length;
        } else {
            depth -= 1;
            if (depth === 0) {
                return close.index;
            }
            i = close.index + close[0].length;
        }
    }
    return null;
}

function extractFirst(html, tagName) {
    const openRe = new RegExp(`<${tagName}\\b([^>]*)>`, 'gi');
    const match = openRe.exec(html);
    if (!match) {
        return null;
    }
    const innerStart = match.index + match[0].length;
    const closeAt = findMatchingClose(html, tagName, innerStart);
    return closeAt == null ? html.slice(innerStart) : html.slice(innerStart, closeAt);
}

function extractByRole(html, role) {
    const openRe = /<([a-z][\w-]*)\b([^>]*)>/gi;
    const wanted = String(role || '').toLowerCase();
    let match;
    while ((match = openRe.exec(html))) {
        const attrs = match[2] || '';
        const roleM = attrs.match(/\brole\s*=\s*["']([^"']+)["']/i);
        if (!roleM || String(roleM[1]).toLowerCase() !== wanted) {
            continue;
        }
        const tag = match[1];
        const innerStart = match.index + match[0].length;
        const closeAt = findMatchingClose(html, tag, innerStart);
        return closeAt == null ? html.slice(innerStart) : html.slice(innerStart, closeAt);
    }
    return null;
}

function removeElements(html, tagNames) {
    let out = String(html || '');
    for (const tag of tagNames) {
        const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
        let guard = 0;
        let match = openRe.exec(out);
        while (match && guard < 400) {
            guard += 1;
            const innerStart = match.index + match[0].length;
            const closeAt = findMatchingClose(out, tag, innerStart);
            const end = closeAt == null ? out.length : closeAt + (`</${tag}>`).length;
            out = out.slice(0, match.index) + out.slice(end);
            openRe.lastIndex = match.index;
            match = openRe.exec(out);
        }
        out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '');
    }
    return out;
}

function isChromeAttrs(attrs) {
    const id = ((attrs.match(/\bid\s*=\s*["']([^"']*)/i) || [])[1] || '');
    const cls = ((attrs.match(/\bclass\s*=\s*["']([^"']*)/i) || [])[1] || '');
    return CHROME_ATTR.test(`${id} ${cls}`);
}

function removeMatchingElements(html, pred) {
    let out = String(html || '');
    const openRe = /<([a-z][\w-]*)\b([^>]*)>/gi;
    let match;
    let guard = 0;
    openRe.lastIndex = 0;
    while ((match = openRe.exec(out)) && guard < 800) {
        guard += 1;
        const tag = match[1];
        const attrs = match[2] || '';
        if (!pred(tag, attrs)) {
            continue;
        }
        const innerStart = match.index + match[0].length;
        const closeAt = findMatchingClose(out, tag, innerStart);
        const end = closeAt == null ? out.length : closeAt + (`</${tag}>`).length;
        out = out.slice(0, match.index) + out.slice(end);
        openRe.lastIndex = match.index;
    }
    return out;
}

function safeChar(code) {
    if (!Number.isFinite(code) || code < 0) {
        return '';
    }
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        return '';
    }
    try {
        return String.fromCodePoint(code);
    } catch {
        return '';
    }
}

export function decodeEntities(text) {
    return String(text || '')
        .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => safeChar(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_m, dec) => safeChar(parseInt(dec, 10)))
        .replace(/&([a-z]+);/gi, (_m, name) => {
            const mapped = NAMED_ENTITIES[String(name).toLowerCase()];
            return mapped != null ? mapped : `&${name};`;
        });
}

function toMarkdown(html) {
    let out = String(html || '');
    out = out.replace(/<br\s*\/?>/gi, '\n');
    out = out.replace(/<\/p>/gi, '\n\n');
    out = out.replace(/<\/div>/gi, '\n');
    out = out.replace(/<\/h1>/gi, '\n\n');
    out = out.replace(/<\/h2>/gi, '\n\n');
    out = out.replace(/<\/li>/gi, '\n');
    out = out.replace(/<h1\b[^>]*>/gi, '# ');
    out = out.replace(/<h2\b[^>]*>/gi, '## ');
    out = out.replace(/<h3\b[^>]*>/gi, '### ');
    out = out.replace(/<li\b[^>]*>/gi, '- ');
    out = out.replace(/<\/?[a-zA-Z][^>]*>/g, ' ');
    out = out.replace(/<<<SOURCE/g, '<<<SOURCE');
    return decodeEntities(out)
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function extractTitle(html) {
    const raw = extractFirst(String(html || ''), 'title') || '';
    let name = decodeEntities(raw.replace(/<\/?[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    name = name.replace(/\s+[|\-–—:]\s+[^|\-–—:]{2,40}$/, '').trim();
    return name.slice(0, 120);
}

export function extractHtmlText(html) {
    let body = String(html || '');
    body = body.replace(/<!--[\s\S]*?-->/g, '');
    body = removeElements(body, DISCARD_TAGS);
    const main = extractFirst(body, 'article')
        || extractFirst(body, 'main')
        || extractByRole(body, 'main')
        || extractFirst(body, 'body')
        || body;
    let cleaned = removeElements(main, CHROME_TAGS);
    cleaned = removeMatchingElements(cleaned, (_tag, attrs) => isChromeAttrs(attrs));
    const text = toMarkdown(cleaned);
    return {
        text,
        name: extractTitle(html)
    };
}

export function isEmptyShell(text, decodedBytes) {
    const chars = String(text || '').trim().length;
    const bytes = Number(decodedBytes) || 0;
    if (bytes < EMPTY_SHELL_MIN_CHARS) {
        return false;
    }
    return chars / bytes < EMPTY_SHELL_MAX_RATIO;
}

// EOF plugins/ai-core/webapp/utils/attachments/html.js
