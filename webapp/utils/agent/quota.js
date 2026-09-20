/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Agent / Quota
 * @tagline         Named quota dimensions and the shipped period policy
 * @description     Subject is resolved, not assumed; turn-start only, permissive (TD-02)
 * @file            plugins/ai-core/webapp/utils/agent/quota.js
 * @version         1.0.11
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import AiUsageModel from '../../model/aiUsage.js';

export const DEFAULT_CAPS = [
    { dimension: 'requests', period: 'day', limit: 200 },
    { dimension: 'tokens', period: 'day', limit: 400000 }
];

/**
 * Named period-key function so week is additive (TD-09).
 * Local calendar date, not UTC, so a daily cap matches the user's day.
 * @param {'day'|'month'|string} period
 * @param {Date} [date]
 * @returns {string}
 */
export function periodKey(period, date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    if (period === 'day') {
        return `${y}-${m}-${d}`;
    }
    if (period === 'month') {
        return `${y}-${m}`;
    }
    throw new Error(`Unknown quota period '${period}'`);
}

export function usageDocumentKey(subject, period, date) {
    return `${subject}:${periodKey(period, date)}`;
}

function readDimension(doc, dimension) {
    if (!doc) {
        return 0;
    }
    if (dimension === 'requests') {
        return (doc.requests || 0) + (doc.reservedRequests || 0);
    }
    if (dimension === 'tokens') {
        return doc.tokens || 0;
    }
    if (dimension === 'cost') {
        return doc.cost || 0;
    }
    if (dimension === 'toolCalls') {
        return doc.toolCalls || 0;
    }
    return doc[dimension] || 0;
}

/**
 * @param {object} doc
 * @param {object[]} caps
 * @returns {object|null} first exceeded cap, or null
 */
export function firstExceededCap(doc, caps) {
    for (const cap of caps || []) {
        if (!Number.isFinite(cap.limit)) {
            continue;
        }
        if (readDimension(doc, cap.dimension) >= cap.limit) {
            return cap;
        }
        if (cap.dimension === 'cost' && doc?.costUnknown) {
            return { ...cap, costUnknown: true };
        }
    }
    return null;
}

export function defaultQuotaDecision(actor, settings = {}) {
    const caps = Array.isArray(settings.caps) && settings.caps.length
        ? settings.caps
        : DEFAULT_CAPS;
    return {
        subject: actor?.username || '',
        caps
    };
}

/**
 * Shipped onAiQuotaCheck. Priority 1000 so a site handler at default 100 can replace it
 * by returning { subject, caps }.
 */
export async function onAiQuotaCheck(ctx) {
    const decision = defaultQuotaDecision(ctx.actor, ctx.settings);
    const now = ctx.now || new Date();
    const usageModel = ctx.usageModel || AiUsageModel;

    for (const cap of decision.caps) {
        const key = periodKey(cap.period, now);
        const doc = await usageModel.getByKey(decision.subject, key);
        const exceeded = firstExceededCap(doc, [cap]);
        if (exceeded) {
            const err = new Error(
                exceeded.costUnknown
                    ? 'Quota cost is partly unknown; refusing new turns until it is resolved.'
                    : `Quota exceeded: ${cap.dimension} / ${cap.period} limit ${cap.limit}`
            );
            err.code = 'AI_QUOTA_EXCEEDED';
            err.cap = exceeded;
            throw err;
        }
    }

    const dayKey = periodKey('day', now);
    await usageModel.reserve(decision.subject, dayKey, { requests: 1 });
    ctx.quota = {
        subject: decision.subject,
        caps: decision.caps,
        reserved: [{ period: 'day', periodKey: dayKey, requests: 1 }],
        now
    };
    return ctx.quota;
}

/**
 * Shipped onAiQuotaSettle. Writes daily and monthly documents on every settle.
 */
export async function onAiQuotaSettle(ctx) {
    const quota = ctx.quota || {};
    const subject = quota.subject || ctx.actor?.username || '';
    const now = quota.now || ctx.now || new Date();
    const usageModel = ctx.usageModel || AiUsageModel;
    const usage = ctx.usage || {};
    const delta = {
        requests: ctx.started === false ? 0 : 1,
        tokensIn: usage.tokensIn || 0,
        tokensOut: usage.tokensOut || 0,
        cacheWrite: usage.cacheWrite || 0,
        cacheRead: usage.cacheRead || 0,
        toolCalls: usage.toolCalls || 0
    };
    if (usage.cost == null) {
        if (usage.costUnknown === true || ctx.costUnknown === true) {
            delta.cost = null;
            delta.costUnknown = true;
        }
    } else {
        delta.cost = usage.cost;
    }

    if (ctx.started === false) {
        for (const reserved of quota.reserved || []) {
            await usageModel.rollbackReserve(subject, reserved.periodKey, {
                requests: reserved.requests || 0
            });
        }
        return ctx;
    }

    await usageModel.settle(subject, periodKey('day', now), delta);
    await usageModel.settle(subject, periodKey('month', now), delta);
    return ctx;
}

/**
 * Snapshot for the capability probe / usage page.
 */
export async function quotaSnapshot(subject, caps, now = new Date(), usageModel = AiUsageModel) {
    const rows = [];
    for (const cap of caps || DEFAULT_CAPS) {
        const key = periodKey(cap.period, now);
        const doc = await usageModel.getByKey(subject, key);
        rows.push({
            dimension: cap.dimension,
            period: cap.period,
            periodKey: key,
            limit: cap.limit,
            used: readDimension(doc, cap.dimension),
            costUnknown: doc?.costUnknown === true
        });
    }
    return { subject, rows };
}

// EOF plugins/ai-core/webapp/utils/agent/quota.js
