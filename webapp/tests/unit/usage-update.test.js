/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Usage Update
 * @tagline         One document per identity; counters stay out of $setOnInsert
 * @file            plugins/ai-core/webapp/tests/unit/usage-update.test.js
 * @version         1.0.19
 * @release         2026-10-01
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import AiUsageModel from '../../model/aiUsage.js';
import { memoryCollection } from './helpers.js';

function ident(extra = {}) {
    return {
        day: '2026-09-15',
        username: 'jdoe',
        provider: 'anthropic',
        model: 'claude-sonnet-4.5',
        scopeType: 'map',
        scopeId: 'map-1',
        ...extra
    };
}

function mongoConflictCollection() {
    const inner = memoryCollection();
    return {
        ...inner,
        docs: inner.docs,
        async updateOne(query, update, extra) {
            const insertKeys = Object.keys(update.$setOnInsert || {});
            const incKeys = Object.keys(update.$inc || {});
            const overlap = incKeys.filter((key) => insertKeys.includes(key));
            if (overlap.length) {
                throw new Error(
                    `Updating the path '${overlap[0]}' would create a conflict at '${overlap[0]}'`
                );
            }
            return inner.updateOne(query, update, extra);
        },
        aggregate(pipeline) {
            return inner.aggregate(pipeline);
        },
        async findOne(query) {
            return inner.findOne(query);
        }
    };
}

afterEach(() => {
    AiUsageModel.useCollection(null);
});

describe('AiUsageModel upsert', () => {
    test('reserve and settle hit one document and add up', async () => {
        AiUsageModel.useCollection(mongoConflictCollection());
        const id = ident();
        await AiUsageModel.reserve(id, { requests: 1 });
        await AiUsageModel.settle(id, { requests: 1, tokensIn: 12, tokensOut: 8, cost: 0.1 });
        await AiUsageModel.reserve(id, { requests: 1 });
        const doc = await AiUsageModel.settle(id, { requests: 1, tokensIn: 3, tokensOut: 2, cost: 0.2 });
        expect(doc.requests).toBe(2);
        expect(doc.tokens).toBe(25);
        expect(doc.reservedRequests).toBe(0);
        expect(doc.cost).toBeCloseTo(0.3);
        expect(innerCount()).toBe(1);
    });

    test('a different model or scope is a separate document', async () => {
        AiUsageModel.useCollection(memoryCollection());
        await AiUsageModel.settle(ident(), { requests: 1, tokensIn: 1, tokensOut: 1, cost: 1 });
        await AiUsageModel.settle(ident({ model: 'other' }), { requests: 1, tokensIn: 1, tokensOut: 1, cost: 2 });
        await AiUsageModel.settle(ident({ scopeId: 'map-2' }), { requests: 1, tokensIn: 1, tokensOut: 1, cost: 3 });
        expect(AiUsageModel.getCollection().docs).toHaveLength(3);
    });

    test('costUnknown stays true and scopeLabel is kept when the next label is empty', async () => {
        AiUsageModel.useCollection(memoryCollection());
        const id = ident();
        const first = await AiUsageModel.settle(id, {
            requests: 1,
            tokensIn: 1,
            tokensOut: 1,
            cost: null,
            costUnknown: true,
            scopeLabel: 'Q3 Roadmap'
        });
        expect(first.cost).toBeUndefined();
        expect(first.costUnknown).toBe(true);
        expect(first.scopeLabel).toBe('Q3 Roadmap');
        const second = await AiUsageModel.settle(id, {
            requests: 1,
            tokensIn: 1,
            tokensOut: 1,
            cost: 0.5,
            scopeLabel: ''
        });
        expect(second.costUnknown).toBe(true);
        expect(second.scopeLabel).toBe('Q3 Roadmap');
        expect(second.cost).toBe(0.5);
    });
});

function innerCount() {
    return AiUsageModel.getCollection().docs.length;
}

// EOF plugins/ai-core/webapp/tests/unit/usage-update.test.js
