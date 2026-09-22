/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tools / Envelope
 * @tagline         Tool result envelope and size cap
 * @description     Normalized tool result shape and the hardcoded byte cap (TD-01)
 * @file            plugins/ai-core/webapp/utils/tools/envelope.js
 * @version         1.0.15
 * @release         2026-09-21
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export const RESULT_SIZE_CAP = 256 * 1024;

export const AI_UNKNOWN_TOOL = 'AI_UNKNOWN_TOOL';
export const AI_CAPABILITY_DENIED = 'AI_CAPABILITY_DENIED';
export const AI_POLICY_DENIED = 'AI_POLICY_DENIED';
export const AI_BUDGET_EXCEEDED = 'AI_BUDGET_EXCEEDED';
export const AI_DEDUPE = 'AI_DEDUPE';
export const AI_RESULT_TOO_LARGE = 'AI_RESULT_TOO_LARGE';
export const AI_CLIENT_HOST = 'AI_CLIENT_HOST';
export const AI_EXECUTE_FAILED = 'AI_EXECUTE_FAILED';
export const AI_MISSING_ADAPTER = 'AI_MISSING_ADAPTER';

/**
 * @param {object} [partial]
 * @returns {object}
 */
export function makeEnvelope(partial = {}) {
    return {
        ok: partial.ok === true,
        data: partial.data === undefined ? null : partial.data,
        summary: typeof partial.summary === 'string' ? partial.summary : '',
        error: typeof partial.error === 'string' ? partial.error : '',
        code: typeof partial.code === 'string' ? partial.code : '',
        hint: typeof partial.hint === 'string' ? partial.hint : '',
        ms: Number.isFinite(partial.ms) ? partial.ms : 0,
        media: partial.media == null ? null : partial.media,
        stall: partial.stall === true
    };
}

/**
 * @param {object} envelope
 * @returns {object} envelope without media (never persisted, never accepted from a client)
 */
export function stripMedia(envelope) {
    const next = makeEnvelope(envelope);
    next.media = null;
    return next;
}

/**
 * @param {*} value
 * @returns {number}
 */
export function byteSize(value) {
    try {
        return Buffer.byteLength(JSON.stringify(value === undefined ? null : value), 'utf8');
    } catch {
        return RESULT_SIZE_CAP + 1;
    }
}

/**
 * @param {object} envelope
 * @param {number} [cap]
 * @returns {object}
 */
export function enforceSizeCap(envelope, cap = RESULT_SIZE_CAP) {
    const sized = makeEnvelope(envelope);
    if (byteSize(sized.data) <= cap) {
        return sized;
    }
    return makeEnvelope({
        ok: false,
        code: AI_RESULT_TOO_LARGE,
        error: 'Tool result exceeded the size cap.',
        hint: 'Narrow the request — ask for a subtree, a page, or fewer fields — and try again.',
        summary: sized.summary || 'result too large',
        ms: sized.ms
    });
}

// EOF plugins/ai-core/webapp/utils/tools/envelope.js
