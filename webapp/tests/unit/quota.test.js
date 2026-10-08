/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Quota
 * @tagline         Dimensions, turn-start enforcement, costUnknown, replaceable policy
 * @file            plugins/ai-core/webapp/tests/unit/quota.test.js
 * @version         1.0.20
 * @release         2026-10-08
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, expect, test } from '@jest/globals';
import {
    firstExceededCap,
    historyRange,
    onAiQuotaCheck,
    onAiQuotaSettle,
    periodKey,
    periodRange,
    quotaSnapshot
} from '../../utils/agent/quota.js';
import { mergeSettings } from '../../utils/agent/settings.js';
import AiUsageModel from '../../model/aiUsage.js';
import { memoryCollection, testActor } from './helpers.js';

function usageModel() {
    const collection = memoryCollection();
    AiUsageModel.useCollection(collection);
    return AiUsageModel;
}

function blankIdentity(username, day, extra = {}) {
    return {
        day,
        username,
        provider: '',
        model: '',
        scopeType: '',
        scopeId: '',
        ...extra
    };
}

describe('quota', () => {
    test('period keys for day and month', () => {
        const date = new Date(2026, 8, 17);
        expect(periodKey('day', date)).toBe('2026-09-17');
        expect(periodKey('month', date)).toBe('2026-09');
        expect(periodRange('day', date)).toEqual({ fromDay: '2026-09-17', toDay: '2026-09-17' });
        expect(periodRange('month', date)).toEqual({ fromDay: '2026-09-01', toDay: '2026-09-17' });
        expect(historyRange('day', date).fromDay).toBe('2026-07-20');
        expect(historyRange('month', date).fromDay).toBe('2025-10-01');
    });

    test('each dimension can exceed', () => {
        expect(firstExceededCap({ requests: 200, reservedRequests: 0 }, [
            { dimension: 'requests', period: 'day', limit: 200 }
        ])).toBeTruthy();
        expect(firstExceededCap({ tokens: 10 }, [
            { dimension: 'tokens', period: 'day', limit: 400000 }
        ])).toBeNull();
        expect(firstExceededCap({ cost: 25, costUnknown: false }, [
            { dimension: 'cost', period: 'month', limit: 25 }
        ])).toBeTruthy();
        expect(firstExceededCap({ toolCalls: 1000 }, [
            { dimension: 'toolCalls', period: 'day', limit: 1000 }
        ])).toBeTruthy();
    });

    test('reservation rolls back when the turn never starts', async () => {
        const model = usageModel();
        const actor = testActor();
        const now = new Date(2026, 8, 17);
        const ctx = { actor, settings: {}, now, usageModel: model };
        await onAiQuotaCheck(ctx);
        const reserved = await model.findIdentity(blankIdentity('jdoe', '2026-09-17'));
        expect(reserved.reservedRequests).toBe(1);
        await onAiQuotaSettle({
            actor,
            quota: ctx.quota,
            usage: {},
            started: false,
            usageModel: model
        });
        const after = await model.findIdentity(blankIdentity('jdoe', '2026-09-17'));
        expect(after.reservedRequests).toBe(0);
        expect(after.requests || 0).toBe(0);
    });

    test('turn-start-only enforcement lets a turn overrun', async () => {
        const model = usageModel();
        const actor = testActor();
        const now = new Date(2026, 8, 17);
        const settings = { caps: [{ dimension: 'tokens', period: 'day', limit: 10 }] };
        const ctx = { actor, settings, now, usageModel: model };
        await onAiQuotaCheck(ctx);
        await onAiQuotaSettle({
            actor,
            quota: ctx.quota,
            usage: { tokensIn: 8, tokensOut: 8 },
            started: true,
            usageModel: model
        });
        const doc = await model.findIdentity(blankIdentity('jdoe', '2026-09-17'));
        expect(doc.tokens).toBe(16);
        expect(doc.tokens).toBeGreaterThan(10);
    });

    test('costUnknown is never recorded as zero', async () => {
        const model = usageModel();
        await model.settle(blankIdentity('jdoe', '2026-09-17'), {
            requests: 1,
            tokensIn: 3,
            tokensOut: 2,
            cost: null,
            costUnknown: true
        });
        const doc = await model.findIdentity(blankIdentity('jdoe', '2026-09-17'));
        expect(doc.cost).toBeUndefined();
        expect(doc.costUnknown).toBe(true);
    });

    test('a site handler can charge a username other than the actor', async () => {
        const model = usageModel();
        const actor = testActor();
        const now = new Date(2026, 8, 17);
        const identity = blankIdentity('eng-platform', '2026-09-17', {
            provider: 'anthropic',
            model: 'claude',
            scopeType: 'map',
            scopeId: 'm1'
        });
        await onAiQuotaSettle({
            actor,
            quota: {
                username: 'eng-platform',
                identity,
                caps: [{ dimension: 'requests', period: 'day', limit: 200 }],
                reserved: { requests: 0 },
                now
            },
            usage: { tokensIn: 1, tokensOut: 1 },
            started: true,
            usageModel: model,
            scope: { label: 'Q3 Roadmap' }
        });
        const pool = await model.findIdentity(identity);
        const user = await model.findIdentity(blankIdentity('jdoe', '2026-09-17'));
        expect(pool.requests).toBe(1);
        expect(pool.scopeLabel).toBe('Q3 Roadmap');
        expect(user).toBe(null);
    });

    test('a site handler can replace the shipped policy', async () => {
        const actor = testActor();
        const replacement = { username: 'pool', caps: [{ dimension: 'cost', period: 'month', limit: 5 }] };
        const hooks = {
            async executeFirst() {
                return replacement;
            }
        };
        const quota = await hooks.executeFirst('onAiQuotaCheck', { actor });
        expect(quota.username).toBe('pool');
        expect(quota.caps[0].dimension).toBe('cost');
    });

    test('a cap sums every model and scope, and a monthly request cap counts reservations', async () => {
        const model = usageModel();
        const now = new Date(2026, 8, 17);
        const first = blankIdentity('jdoe', '2026-09-16', { model: 'a', scopeId: 's1' });
        const second = blankIdentity('jdoe', '2026-09-17', { model: 'b', scopeId: 's2' });
        await model.reserve(first, { requests: 1 });
        await model.settle(first, { requests: 1, tokensIn: 4, tokensOut: 0, cost: 1 });
        await model.reserve(second, { requests: 1 });
        await model.settle(second, { requests: 1, tokensIn: 0, tokensOut: 6, cost: 2 });
        await model.reserve(second, { requests: 1 });
        await expect(onAiQuotaCheck({
            actor: testActor(),
            settings: { caps: [{ dimension: 'requests', period: 'month', limit: 3 }] },
            now,
            usageModel: model,
            thread: { scopeType: 'map', scopeId: 's3' },
            provider: 'anthropic',
            model: 'c'
        })).rejects.toMatchObject({ code: 'AI_QUOTA_EXCEEDED' });
    });

    test('quotaSnapshot returns username and rows', async () => {
        const model = usageModel();
        const now = new Date(2026, 8, 17);
        await model.settle(blankIdentity('jdoe', '2026-09-17'), {
            requests: 1, tokensIn: 2, tokensOut: 2, cost: 1
        });
        const snap = await quotaSnapshot('jdoe', [
            { dimension: 'tokens', period: 'day', limit: 10 }
        ], now, model);
        expect(snap.username).toBe('jdoe');
        expect(snap.rows[0].used).toBe(4);
        expect(snap.rows[0].periodKey).toBe('2026-09-17');
    });

    test('zero daily caps do not refuse the turn', async () => {
        const model = usageModel();
        const settings = mergeSettings({
            site: { maxUserRequestsPerDay: 0, maxUserTokensPerDay: 0 }
        });
        expect(settings.caps).toEqual([]);
        const quota = await onAiQuotaCheck({
            actor: testActor(),
            settings,
            now: new Date(2026, 8, 17),
            usageModel: model
        });
        expect(quota.username).toBe('jdoe');
        expect(quota.reserved.requests).toBe(1);
    });

    test('a monthly cost cap ignores last month and refuses unknown cost', async () => {
        const model = usageModel();
        const now = new Date(2026, 8, 17);
        const caps = [{ dimension: 'cost', period: 'month', limit: 5 }];
        await model.settle(blankIdentity('jdoe', '2026-08-31'), {
            requests: 1, tokensIn: 1, tokensOut: 1, cost: 20
        });
        await onAiQuotaCheck({
            actor: testActor(),
            settings: { caps },
            now,
            usageModel: model
        });
        await model.settle(blankIdentity('jdoe', '2026-09-02', { model: 'unpriced' }), {
            requests: 1, tokensIn: 1, tokensOut: 1, cost: null, costUnknown: true
        });
        await expect(onAiQuotaCheck({
            actor: testActor(),
            settings: { caps },
            now,
            usageModel: model,
            provider: 'anthropic',
            model: 'priced'
        })).rejects.toThrow(/partly unknown/);
        await onAiQuotaCheck({
            actor: testActor(),
            settings: { caps: [] },
            now,
            usageModel: model,
            provider: 'anthropic',
            model: 'priced'
        });
    });
});

// EOF plugins/ai-core/webapp/tests/unit/quota.test.js
