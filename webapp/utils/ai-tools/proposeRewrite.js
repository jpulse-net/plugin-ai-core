/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Utils / AI Tools / Propose Rewrite
 * @tagline         Pure scratch-pad rewrite proposal
 * @description     Validate a replacement; never write the pad
 * @file            plugins/ai-core/webapp/utils/ai-tools/proposeRewrite.js
 * @version         1.0.4
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

const TEXT_CHARS = 32 * 1024;

function previewLine(current, next) {
    const from = String(current || '').replace(/\s+/g, ' ').trim();
    const to = String(next || '').replace(/\s+/g, ' ').trim();
    const clip = (value) => (value.length > 80 ? `${value.slice(0, 77)}...` : value);
    return `Replace ${from ? clip(from) : '(empty)'} → ${to ? clip(to) : '(empty)'}`;
}

/**
 * @param {{ text?: string }} data
 * @param {{ text?: string }} [args]
 * @returns {object}
 */
export function run(data = {}, args = {}) {
    const current = String(data.text || '');
    const text = String(args.text || '');
    if (!text.trim()) {
        return {
            ok: false,
            code: 'AI_BAD_ARGS',
            error: 'text is required.',
            hint: 'Pass the full replacement text for the scratch pad.'
        };
    }
    if (text.length > TEXT_CHARS) {
        return {
            ok: false,
            code: 'AI_PROPOSAL_TOO_LARGE',
            error: `Proposed text is ${text.length} characters; the cap is ${TEXT_CHARS}.`
        };
    }
    return {
        ok: true,
        data: {
            proposal: {
                kind: 'rewrite',
                preview: previewLine(current, text),
                payload: {
                    text,
                    expectedChars: current.length
                }
            }
        },
        summary: `propose_draft_rewrite ${text.length} chars`
    };
}

// EOF plugins/ai-core/webapp/utils/ai-tools/proposeRewrite.js
