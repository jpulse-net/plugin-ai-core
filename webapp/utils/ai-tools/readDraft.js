/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Utils / AI Tools / Read Draft
 * @tagline         Pure scratch-pad reader
 * @description     Summarize textarea text and selection; no I/O
 * @file            plugins/ai-core/webapp/utils/ai-tools/readDraft.js
 * @version         1.0.3
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

/**
 * @param {{ text?: string, selection?: string }} data
 * @param {{ excerptChars?: number }} [args]
 * @returns {object}
 */
const EXCERPT_CHARS = 160;
const TEXT_CHARS = 32 * 1024;

export function run(data = {}, args = {}) {
    const text = String(data.text || '');
    const selection = String(data.selection || '');
    const excerptChars = Number.isFinite(args.excerptChars) ? args.excerptChars : EXCERPT_CHARS;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split(/\n/).length : 0;
    const excerpt = text.length > excerptChars ? `${text.slice(0, excerptChars).trim()}…` : text;
    const clipped = text.length > TEXT_CHARS;
    return {
        ok: true,
        data: {
            chars: text.length,
            words,
            lines,
            selection,
            excerpt,
            text: clipped ? text.slice(0, TEXT_CHARS) : text,
            truncated: clipped
        },
        summary: `read_draft ${words} words`
    };
}

// EOF plugins/ai-core/webapp/utils/ai-tools/readDraft.js
