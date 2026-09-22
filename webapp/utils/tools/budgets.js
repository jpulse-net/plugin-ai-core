/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tools / Budgets
 * @tagline         Declarative per-turn budgets and argument dedupe
 * @description     Generic counters and argument-identical deduplication
 * @file            plugins/ai-core/webapp/utils/tools/budgets.js
 * @version         1.0.15
 * @release         2026-09-21
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { AI_BUDGET_EXCEEDED, AI_DEDUPE, makeEnvelope } from './envelope.js';

export function createBudgetState() {
    return {
        counts: Object.create(null),
        seen: new Set()
    };
}

/**
 * @param {object} tool
 * @param {object} args
 * @param {object} settings
 * @returns {number}
 */
export function budgetMax(tool, settings = {}) {
    const spec = tool?.budget;
    if (!spec) {
        return Infinity;
    }
    if (typeof spec.max === 'number' && Number.isFinite(spec.max)) {
        return spec.max;
    }
    if (typeof spec.max === 'string' && spec.max) {
        const value = settings[spec.max];
        if (Number.isFinite(value)) {
            return value;
        }
    }
    return Infinity;
}

/**
 * @param {object} tool
 * @param {object} args
 * @returns {boolean}
 */
export function shouldCount(tool, args) {
    const spec = tool?.budget;
    if (!spec) {
        return false;
    }
    if (typeof spec.countWhen === 'function') {
        return spec.countWhen(args || {}) === true;
    }
    return true;
}

function argsKey(name, args) {
    try {
        return `${name}:${JSON.stringify(args || {})}`;
    } catch {
        return `${name}:[unserializable]`;
    }
}

/**
 * Check budget and dedupe before execution. Does not increment.
 * @returns {object|null} denial envelope, or null if the call may proceed
 */
export function checkBudgetAndDedupe(tool, args, state, settings = {}) {
    if (tool.dedupeArgs) {
        const key = argsKey(tool.name, args);
        if (state.seen.has(key)) {
            return makeEnvelope({
                ok: false,
                code: AI_DEDUPE,
                error: `Duplicate ${tool.name} call with the same arguments in this turn.`,
                hint: 'Reuse the earlier result instead of calling the tool again.',
                summary: `${tool.name} deduped`
            });
        }
    }
    if (!tool.budget || !shouldCount(tool, args)) {
        return null;
    }
    const max = budgetMax(tool, settings);
    const used = state.counts[tool.budget.key] || 0;
    if (used >= max) {
        const message = (tool.budget.overMessage || 'This turn already made %MAX% calls of this kind.')
            .replace('%MAX%', String(max));
        return makeEnvelope({
            ok: false,
            code: AI_BUDGET_EXCEEDED,
            error: message,
            hint: tool.budget.overHint || 'Use what you already have, or reply.',
            summary: `${tool.name} budget ${tool.budget.key}`
        });
    }
    return null;
}

/**
 * Charge budget and remember args after a call is accepted.
 */
export function recordBudgetAndDedupe(tool, args, state) {
    if (tool.dedupeArgs) {
        state.seen.add(argsKey(tool.name, args));
    }
    if (tool.budget && shouldCount(tool, args)) {
        const key = tool.budget.key;
        state.counts[key] = (state.counts[key] || 0) + 1;
    }
}

// EOF plugins/ai-core/webapp/utils/tools/budgets.js
