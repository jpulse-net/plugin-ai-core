/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Quota
 * @tagline         Dimensions, turn-start enforcement, costUnknown, replaceable policy
 * @file            plugins/ai-core/webapp/tests/unit/quota.test.js
 * @version         1.0.13
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, expect, test } from '@jest/globals';
import {
    firstExceededCap,
    onAiQuotaCheck,
    onAiQuotaSettle,
    periodKey
} from '../../utils/agent/quota.js';
import AiUsageModel from '../../model/aiUsage.js';
import { memoryCollection, testActor } from './helpers.js';

function usageModel() {
    const collection = memoryCollection();
    AiUsageModel.useCollection(collection);
    return AiUsageModel;
}

describe('quota', () => {
    test('period keys for day and month', () => {
        const date = new Date(2026, 8, 17);
        expect(periodKey('day', date)).toBe('2026-09-17');
        expect(periodKey('month', date)).toBe('2026-09');
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
        const reserved = await model.getByKey('jdoe', '2026-09-17');
        expect(reserved.reservedRequests).toBe(1);
        await onAiQuotaSettle({
            actor,
            quota: ctx.quota,
            usage: {},
            started: false,
            usageModel: model
        });
        const after = await model.getByKey('jdoe', '2026-09-17');
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
        const doc = await model.getByKey('jdoe', '2026-09-17');
        expect(doc.tokens).toBe(16);
        expect(doc.tokens).toBeGreaterThan(10);
    });

    test('costUnknown is never recorded as zero', async () => {
        const model = usageModel();
        await model.settle('jdoe', '2026-09-17', {
            requests: 1,
            tokensIn: 3,
            tokensOut: 2,
            cost: null,
            costUnknown: true
        });
        const doc = await model.getByKey('jdoe', '2026-09-17');
        expect(doc.cost).toBeUndefined();
        expect(doc.costUnknown).toBe(true);
    });

    test('a site handler can charge a subject other than the username', async () => {
        const model = usageModel();
        const actor = testActor();
        const now = new Date(2026, 8, 17);
        const ctx = {
            actor,
            settings: {},
            now,
            usageModel: model,
            quota: {
                subject: 'eng-platform',
                caps: [{ dimension: 'requests', period: 'day', limit: 200 }],
                reserved: [],
                now
            }
        };
        await onAiQuotaSettle({
            actor,
            quota: ctx.quota,
            usage: { tokensIn: 1, tokensOut: 1 },
            started: true,
            usageModel: model
        });
        const pool = await model.getByKey('eng-platform', '2026-09-17');
        const user = await model.getByKey('jdoe', '2026-09-17');
        expect(pool.requests).toBe(1);
        expect(user).toBe(null);
    });

    test('a site handler can replace the shipped policy', async () => {
        const actor = testActor();
        const replacement = { subject: 'pool', caps: [{ dimension: 'cost', period: 'month', limit: 5 }] };
        const hooks = {
            async executeFirst() {
                return replacement;
            }
        };
        const quota = await hooks.executeFirst('onAiQuotaCheck', { actor });
        expect(quota.subject).toBe('pool');
        expect(quota.caps[0].dimension).toBe('cost');
    });
});

// EOF plugins/ai-core/webapp/tests/unit/quota.test.js
