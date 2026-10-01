/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Agent / Quota
 * @tagline         Named quota dimensions and the shipped period policy
 * @description     Username is resolved, not assumed; turn-start only, permissive (TD-02)
 * @file            plugins/ai-core/webapp/utils/agent/quota.js
 * @version         1.0.19
 * @release         2026-10-01
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

/**
 * Inclusive day-string range for a cap period or the usage page switch.
 * @param {'day'|'month'|string} period
 * @param {Date} [now]
 * @returns {{ fromDay: string, toDay: string }}
 */
export function periodRange(period, now = new Date()) {
    const today = periodKey('day', now);
    if (period === 'day') {
        return { fromDay: today, toDay: today };
    }
    if (period === 'month') {
        return { fromDay: `${periodKey('month', now)}-01`, toDay: today };
    }
    throw new Error(`Unknown quota period '${period}'`);
}

/**
 * History window: 60 days, or 12 months ending this month.
 * @param {'day'|'month'} per
 * @param {Date} [now]
 * @returns {{ fromDay: string, toDay: string }}
 */
export function historyRange(per, now = new Date()) {
    if (per === 'day') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59);
        return { fromDay: periodKey('day', start), toDay: periodKey('day', now) };
    }
    if (per === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        return { fromDay: periodKey('day', start), toDay: periodKey('day', now) };
    }
    throw new Error(`Unknown quota period '${per}'`);
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

/**
 * An explicit caps array, including [], is the decision. DEFAULT_CAPS apply
 * only when the caller did not pass settings.caps at all.
 */
export function defaultQuotaDecision(actor, settings = {}) {
    const caps = Array.isArray(settings.caps) ? settings.caps : DEFAULT_CAPS;
    return {
        username: actor?.username || '',
        caps
    };
}

function quotaDoc(totals) {
    return {
        requests: totals.requests || 0,
        reservedRequests: 0,
        tokens: totals.tokens || 0,
        cost: totals.cost || 0,
        costUnknown: totals.costUnknown === true,
        toolCalls: totals.toolCalls || 0
    };
}

function turnIdentity(ctx, username, now) {
    const thread = ctx.thread || {};
    return {
        day: periodKey('day', now),
        username,
        provider: ctx.provider || '',
        model: ctx.model || '',
        scopeType: thread.scopeType || '',
        scopeId: thread.scopeId != null && thread.scopeId !== '' ? String(thread.scopeId) : ''
    };
}

function settleIdentity(ctx) {
    const quota = ctx.quota || {};
    const now = quota.now || ctx.now || new Date();
    const username = quota.username || quota.identity?.username || ctx.actor?.username || '';
    const base = quota.identity || turnIdentity(ctx, username, now);
    return { ...base, username, day: base.day || periodKey('day', now) };
}

/**
 * Shipped onAiQuotaCheck. Priority 1000 so a site handler at default 100 can replace it
 * by returning { username, caps }.
 */
export async function onAiQuotaCheck(ctx) {
    const decision = defaultQuotaDecision(ctx.actor, ctx.settings);
    const now = ctx.now || new Date();
    const usageModel = ctx.usageModel || AiUsageModel;

    for (const cap of decision.caps) {
        const totals = await usageModel.sumForUser(
            decision.username,
            periodRange(cap.period, now)
        );
        const exceeded = firstExceededCap(quotaDoc(totals), [cap]);
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

    const identity = turnIdentity(ctx, decision.username, now);
    await usageModel.reserve(identity, { requests: 1 });
    ctx.quota = {
        username: decision.username,
        caps: decision.caps,
        identity,
        reserved: { requests: 1 },
        now
    };
    return ctx.quota;
}

/**
 * Shipped onAiQuotaSettle. One write on the reserved identity.
 */
export async function onAiQuotaSettle(ctx) {
    const quota = ctx.quota || {};
    const usageModel = ctx.usageModel || AiUsageModel;
    const identity = settleIdentity(ctx);
    const usage = ctx.usage || {};
    const delta = {
        requests: ctx.started === false ? 0 : 1,
        tokensIn: usage.tokensIn || 0,
        tokensOut: usage.tokensOut || 0,
        cacheWrite: usage.cacheWrite || 0,
        cacheRead: usage.cacheRead || 0,
        toolCalls: usage.toolCalls || 0,
        scopeLabel: ctx.scope?.label || ''
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
        const requests = quota.reserved?.requests || 0;
        if (requests) {
            await usageModel.rollbackReserve(identity, { requests });
        }
        return ctx;
    }

    await usageModel.settle(identity, delta);
    return ctx;
}

/**
 * Snapshot for the capability probe.
 * sumForUser already folds reservations into requests.
 */
export async function quotaSnapshot(username, caps, now = new Date(), usageModel = AiUsageModel) {
    const rows = [];
    for (const cap of caps || DEFAULT_CAPS) {
        const range = periodRange(cap.period, now);
        const totals = await usageModel.sumForUser(username, range);
        rows.push({
            dimension: cap.dimension,
            period: cap.period,
            periodKey: cap.period === 'month' ? periodKey('month', now) : range.fromDay,
            limit: cap.limit,
            used: readDimension(quotaDoc(totals), cap.dimension),
            costUnknown: totals.costUnknown === true
        });
    }
    return { username, rows };
}

// EOF plugins/ai-core/webapp/utils/agent/quota.js
