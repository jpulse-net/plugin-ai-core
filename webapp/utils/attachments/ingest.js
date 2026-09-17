/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Attachments / Ingest
 * @tagline         UrlFetch result mapping and provenance
 * @description     Content-type handling, empty-shell, and per-code messages
 * @file            plugins/ai-core/webapp/utils/attachments/ingest.js
 * @version         1.0.4
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import crypto from 'crypto';
import { extractHtmlText, isEmptyShell, EMPTY_SHELL_MESSAGE } from './html.js';

export const FETCH_ACCEPT_TYPES = ['text/plain', 'text/markdown', 'text/csv', 'text/html'];
export const DEFAULT_URL_MAX_BYTES = 5242880;
export const DEFAULT_URL_TIMEOUT_MS = 15000;

export function parseHostList(value) {
    if (Array.isArray(value)) {
        return value.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim());
    }
    if (typeof value === 'string' && value.trim()) {
        return value.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    }
    return [];
}

export function mediaType(contentType) {
    return String(contentType || '').trim().toLowerCase().split(';')[0].trim();
}

export function nameFromUrl(url) {
    try {
        const u = new URL(url);
        const segs = u.pathname.split('/').filter(Boolean);
        if (!segs.length) {
            return (u.hostname || 'Untitled').slice(0, 120);
        }
        const decoded = decodeURIComponent(segs[segs.length - 1]).replace(/\.[a-z0-9]{1,8}$/i, '');
        return (decoded || u.hostname || 'Untitled').slice(0, 120);
    } catch {
        return 'Untitled';
    }
}

export function clientFetchMessage(result) {
    const code = result && result.code;
    const host = result && result.details && result.details.host;
    const type = result && result.details && (result.details.contentType || result.details.type);
    switch (code) {
        case 'INVALID_URL':
            return 'That is not a valid URL.';
        case 'SCHEME_NOT_ALLOWED':
            return 'Only http and https URLs can be added as sources.';
        case 'CREDENTIALS_IN_URL':
            return 'Embedded credentials in the URL are not allowed.';
        case 'HOST_NOT_ALLOWED':
            return `Host not allowed${host ? `: ${host}` : ''}. An administrator can add it on Site Configuration → AI.`;
        case 'HOST_BLOCKED':
            return `Host blocked${host ? `: ${host}` : ''}.`;
        case 'PRIVATE_ADDRESS':
            return 'Private or non-public addresses cannot be fetched.';
        case 'RESPONSE_TOO_LARGE':
            return 'The page is over the URL size cap.';
        case 'CONTENT_TYPE_NOT_ALLOWED':
            return `Unsupported type${type ? ` ${type}` : ''}. Add a page of text, markdown, CSV, or HTML.`;
        case 'REQUEST_TIMEOUT':
            return 'The fetch timed out.';
        case 'DNS_FAILED':
            return 'Could not resolve that host.';
        case 'TOO_MANY_REDIRECTS':
            return 'Too many redirects.';
        case 'RATE_LIMIT_EXCEEDED':
            return 'Too many URL fetches. Try again shortly.';
        case 'UPSTREAM_ERROR': {
            const status = (result && result.status)
                || (result && result.details && result.details.status)
                || 0;
            return status ? `The page returned HTTP ${status}.` : 'The page could not be fetched.';
        }
        case 'AI_SOURCE_EMPTY_SHELL':
            return EMPTY_SHELL_MESSAGE;
        default:
            return (result && result.error) || 'Could not fetch that URL.';
    }
}

function sha256Hex(text) {
    return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

/**
 * @param {object} fetchResult
 * @param {{ maxSourceChars?: number }} [settings]
 * @returns {{ ok: true, text: string, name: string, mimeType: string, provenance: object, truncated: boolean }
 *   | { ok: false, code: string, error: string, suggestPaste?: boolean }}
 */
export function ingestFetchedBody(fetchResult, settings) {
    const res = fetchResult || {};
    const ctype = mediaType(res.contentType);
    const decodedBytes = typeof res.bytes === 'number' ? res.bytes : String(res.text || '').length;
    let text = '';
    let mimeType = 'text/plain';
    let name = '';

    if (ctype === 'text/html') {
        const extracted = extractHtmlText(res.text || '');
        text = extracted.text;
        name = extracted.name;
        mimeType = 'text/markdown';
        if (isEmptyShell(text, decodedBytes)) {
            return {
                ok: false,
                code: 'AI_SOURCE_EMPTY_SHELL',
                error: EMPTY_SHELL_MESSAGE,
                suggestPaste: true
            };
        }
    } else if (ctype === 'text/markdown') {
        text = String(res.text || '');
        mimeType = 'text/markdown';
    } else if (ctype === 'text/csv') {
        text = String(res.text || '');
        mimeType = 'text/csv';
    } else if (ctype === 'text/plain' || !ctype) {
        text = String(res.text || '');
        mimeType = 'text/plain';
    } else {
        return {
            ok: false,
            code: 'CONTENT_TYPE_NOT_ALLOWED',
            error: clientFetchMessage({
                code: 'CONTENT_TYPE_NOT_ALLOWED',
                details: { contentType: ctype || res.contentType }
            })
        };
    }

    const maxChars = typeof settings?.maxSourceChars === 'number' && settings.maxSourceChars > 0
        ? settings.maxSourceChars
        : 1000000;
    let truncated = false;
    if (text.length > maxChars) {
        text = text.slice(0, maxChars);
        truncated = true;
    }

    const finalUrl = res.finalUrl || '';
    if (!name) {
        name = nameFromUrl(finalUrl || '');
    }
    if (!name) {
        name = 'Untitled';
    }

    return {
        ok: true,
        text,
        name: name.slice(0, 120),
        mimeType,
        truncated,
        provenance: {
            sourceUrl: res.sourceUrl || '',
            finalUrl,
            fetchedAt: new Date().toISOString(),
            contentType: res.contentType || ctype || '',
            bytes: decodedBytes,
            sha256: sha256Hex(text),
            redirects: Array.isArray(res.redirects) ? res.redirects.length : 0
        }
    };
}

// EOF plugins/ai-core/webapp/utils/attachments/ingest.js
