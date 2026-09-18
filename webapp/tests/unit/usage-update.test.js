/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Usage Update
 * @tagline         Upsert updates must not overlap $setOnInsert and $inc paths
 * @file            plugins/ai-core/webapp/tests/unit/usage-update.test.js
 * @version         1.0.5
 * @release         2026-09-17
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import AiUsageModel from '../../model/aiUsage.js';
import { memoryCollection } from './helpers.js';

function mongoConflictCollection() {
    const inner = memoryCollection();
    return {
        ...inner,
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
        }
    };
}

afterEach(() => {
    AiUsageModel.useCollection(null);
});

describe('AiUsageModel upsert', () => {
    test('reserve upsert does not conflict $setOnInsert with $inc', async () => {
        AiUsageModel.useCollection(mongoConflictCollection());
        const doc = await AiUsageModel.reserve('jdoe', '2026-09-15', { requests: 1 });
        expect(doc.reservedRequests).toBe(1);
    });

    test('settle upsert does not conflict $setOnInsert with $inc', async () => {
        AiUsageModel.useCollection(mongoConflictCollection());
        const doc = await AiUsageModel.settle('jdoe', '2026-09-15', {
            requests: 1,
            tokensIn: 12,
            tokensOut: 8
        });
        expect(doc.requests).toBe(1);
        expect(doc.tokensIn).toBe(12);
        expect(doc.tokensOut).toBe(8);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/usage-update.test.js
