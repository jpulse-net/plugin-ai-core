/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Attachments / Stream
 * @tagline         Collect a streaming request body
 * @description     StreamBody.pipe into a capped in-memory buffer
 * @file            plugins/ai-core/webapp/utils/attachments/stream.js
 * @version         1.0.7
 * @release         2026-09-18
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { Writable } from 'stream';

/**
 * @param {object} req
 * @param {object} res
 * @param {number|string} [maxBytes]
 * @returns {Promise<Buffer|null>}
 */
export async function collectStreamBody(req, res, maxBytes) {
    const StreamBody = global.StreamBody;
    if (!StreamBody || typeof StreamBody.pipe !== 'function') {
        const err = new Error('Streaming request bodies are not available.');
        err.code = 'AI_NO_STREAM';
        throw err;
    }
    const chunks = [];
    const dest = new Writable({
        write(chunk, _enc, cb) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            cb();
        }
    });
    const options = maxBytes != null ? { maxBytes } : {};
    const bytes = await StreamBody.pipe(req, res, dest, options);
    if (bytes == null) {
        return null;
    }
    return Buffer.concat(chunks);
}

export function headerOrQuery(req, name) {
    const header = req.headers && (req.headers[name] || req.headers[name.toLowerCase()]);
    if (header != null && header !== '') {
        return String(header);
    }
    if (req.query && req.query[name] != null && req.query[name] !== '') {
        return String(req.query[name]);
    }
    return '';
}

export function sanitizeSourceMeta(list) {
    if (!Array.isArray(list)) {
        return [];
    }
    return list.map((row) => {
        if (!row || typeof row !== 'object') {
            return null;
        }
        const entry = {
            id: String(row.id || ''),
            name: String(row.name || '').slice(0, 120),
            origin: String(row.origin || 'file'),
            mimeType: String(row.mimeType || row.type || ''),
            chars: Number.isFinite(Number(row.chars)) ? Number(row.chars) : 0,
            sections: Number.isFinite(Number(row.sections)) ? Number(row.sections) : 0
        };
        if (row.url) {
            entry.url = String(row.url).slice(0, 240);
        }
        return entry.id ? entry : null;
    }).filter(Boolean);
}

export function sanitizeImageMeta(list) {
    if (!Array.isArray(list)) {
        return [];
    }
    return list.map((row) => {
        if (!row || typeof row !== 'object') {
            return null;
        }
        const entry = {
            id: String(row.id || ''),
            name: String(row.name || 'image').slice(0, 120),
            origin: String(row.origin || 'file'),
            mimeType: String(row.mimeType || ''),
            width: Number(row.width) || 0,
            height: Number(row.height) || 0
        };
        return entry.id ? entry : null;
    }).filter(Boolean);
}

// EOF plugins/ai-core/webapp/utils/attachments/stream.js
