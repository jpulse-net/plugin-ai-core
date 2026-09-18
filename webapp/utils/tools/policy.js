/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tools / Policy
 * @tagline         Admin tool policy with union-with-reviewed-names
 * @description     A newly added tool is on by default; an explicitly unchecked tool stays off
 * @file            plugins/ai-core/webapp/utils/tools/policy.js
 * @version         1.0.6
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

/**
 * @param {object} [policy]
 * @returns {{ reviewedToolNames: string[], disabledToolNames: string[] }}
 */
export function normalizePolicy(policy = {}) {
    const reviewed = Array.isArray(policy.reviewedToolNames)
        ? policy.reviewedToolNames.filter(n => typeof n === 'string')
        : [];
    const disabled = Array.isArray(policy.disabledToolNames)
        ? policy.disabledToolNames.filter(n => typeof n === 'string')
        : [];
    return { reviewedToolNames: reviewed, disabledToolNames: disabled };
}

/**
 * Enabled unless the admin explicitly unchecked it. Names the admin has never
 * seen (not in reviewed) are enabled so a new tool is not silently hidden.
 * @param {string} name
 * @param {object} policy
 * @returns {boolean}
 */
export function isToolEnabled(name, policy) {
    const normalized = normalizePolicy(policy);
    return !normalized.disabledToolNames.includes(name);
}

/**
 * Union current names into the reviewed set when the admin saves.
 * @param {object} policy
 * @param {string[]} allNames
 * @returns {object}
 */
export function seedReviewedNames(policy, allNames) {
    const normalized = normalizePolicy(policy);
    const reviewed = new Set(normalized.reviewedToolNames);
    for (const name of allNames || []) {
        if (name) {
            reviewed.add(name);
        }
    }
    return {
        reviewedToolNames: [...reviewed],
        disabledToolNames: normalized.disabledToolNames
    };
}

// EOF plugins/ai-core/webapp/utils/tools/policy.js
