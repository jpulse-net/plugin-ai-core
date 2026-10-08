/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Usage API
 * @tagline         Day and month usage response
 * @file            plugins/ai-core/webapp/tests/unit/usage-api.test.js
 * @version         1.0.20
 * @release         2026-10-08
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import AiCoreController from '../../controller/aiCore.js';
import AiTurnModel from '../../model/aiTurn.js';
import AiUsageModel from '../../model/aiUsage.js';
import { cacheSettings } from '../../utils/agent/settings.js';
import { memoryCollection } from './helpers.js';

function jsonRes() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
}

function ident(extra = {}) {
    return {
        day: '2099-01-15',
        username: 'ada',
        provider: 'anthropic',
        model: 'sonnet',
        scopeType: 'map',
        scopeId: 'm1',
        ...extra
    };
}

afterEach(() => {
    AiUsageModel.useCollection(null);
    AiTurnModel.useCollection(null);
    delete global.HookManager;
    delete global.ConfigModel;
    delete global.PluginModel;
    cacheSettings(null);
});

describe('usage API', () => {
    test('per defaults to day and rejects anything else', async () => {
        AiUsageModel.useCollection(memoryCollection());
        AiTurnModel.useCollection(memoryCollection());
        const ok = jsonRes();
        await AiCoreController.apiUsage({ query: {}, user: { username: 'root' }, originalUrl: '/api/1/ai/usage' }, ok);
        expect(ok.body.data.per).toBe('day');
        const bad = jsonRes();
        await AiCoreController.apiUsage({ query: { per: 'week' }, user: { username: 'root' }, originalUrl: '/api/1/ai/usage' }, bad);
        expect(bad.statusCode).toBe(400);
        expect(bad.body.code).toBe('AI_BAD_ARGS');
    });

    test('breakdowns, sorting, scope labels, and quota rows for the matching period', async () => {
        const today = new Date();
        const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        AiUsageModel.useCollection(memoryCollection());
        AiTurnModel.useCollection(memoryCollection());
        const ada = ident({ day, username: 'ada', scopeId: 'm1' });
        const bea = ident({
            day, username: 'bea', model: 'opus', scopeType: 'page', scopeId: 'p1'
        });
        await AiUsageModel.reserve(ada, { requests: 1 });
        await AiUsageModel.settle(ada, {
            requests: 1, tokensIn: 10, tokensOut: 0, cost: 2, scopeLabel: 'Q3 Roadmap'
        });
        await AiUsageModel.reserve(bea, { requests: 1 });
        await AiUsageModel.settle(bea, {
            requests: 1, tokensIn: 1, tokensOut: 1, cost: null, costUnknown: true, scopeLabel: 'Home'
        });
        await AiTurnModel.create({
            threadId: 't1',
            seq: 1,
            userText: 'hi',
            createdBy: 'ada',
            now: today
        });
        AiTurnModel.getCollection().docs[0].status = 'failed';
        global.ConfigModel = {
            async findById() {
                return {
                    data: {
                        ai: { maxUserRequestsPerDay: 1, maxUserTokensPerDay: 0, maxUserCostPerMonth: 25 }
                    }
                };
            }
        };
        global.HookManager = {
            async execute(name, ctx) {
                if (name !== 'onAiScopeTypes') {
                    return ctx;
                }
                ctx.scopeTypes.push({ scopeType: 'map', label: 'Map' });
                ctx.scopeTypes.push({ scopeType: 'map', label: 'Ignored' });
                throw new Error('later handler');
            }
        };
        const res = jsonRes();
        await AiCoreController.apiUsage({ query: { per: 'day' }, user: { username: 'root' }, originalUrl: '/api/1/ai/usage' }, res);
        const data = res.body.data;
        expect(data.cards.requests).toBe(2);
        expect(data.cards.conversations).toBe(1);
        expect(data.cards.failedOrStalled).toBe(1);
        expect(data.byUser.map((row) => row.username)).toEqual(['ada', 'bea']);
        expect(data.byUser[0].quota.rows.map((row) => row.dimension)).toEqual(['requests']);
        expect(data.byUser[0].quota.overQuota).toBe(true);
        expect(data.byModel.some((row) => row.costUnknown)).toBe(true);
        expect(data.scopeTypes).toEqual([
            { scopeType: 'map', label: 'Map' },
            { scopeType: 'page', label: 'page' }
        ]);
        expect(data.byScope.find((row) => row.scopeType === 'map').scopeLabel).toBe('Q3 Roadmap');
        expect(data.byScope.find((row) => row.scopeType === 'page').scopeTypeLabel).toBe('page');
        const month = jsonRes();
        await AiCoreController.apiUsage({ query: { per: 'month' }, user: { username: 'root' }, originalUrl: '/api/1/ai/usage' }, month);
        expect(month.body.data.byUser[0].quota.rows[0].dimension).toBe('cost');
        expect(month.body.data.history.length).toBeGreaterThan(0);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/usage-api.test.js
