/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Retention
 * @tagline         Turn purge at startup and every 24 hours
 * @file            plugins/ai-core/webapp/tests/unit/retention.test.js
 * @version         1.0.20
 * @release         2026-10-08
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, jest, test } from '@jest/globals';
import AiCoreController from '../../controller/aiCore.js';
import AiTurnModel from '../../model/aiTurn.js';
import { cacheSettings } from '../../utils/agent/settings.js';
import { memoryCollection } from './helpers.js';

afterEach(() => {
    AiCoreController.stopRetentionTimer();
    AiTurnModel.useCollection(null);
    delete global.ConfigModel;
    delete global.PluginModel;
    delete global.LogController;
    cacheSettings(null);
    jest.useRealTimers();
});

function config(retentionDays) {
    global.ConfigModel = {
        async findById() {
            return { data: { ai: { retentionDays } } };
        }
    };
}

describe('turn retention', () => {
    test('purges at startup and again after 24 hours, and skips when retention is 0', async () => {
        jest.useFakeTimers();
        const collection = memoryCollection();
        AiTurnModel.useCollection(collection);
        await collection.insertOne({
            threadId: 'old',
            seq: 1,
            createdAt: new Date(Date.now() - 3 * 86400000)
        });
        await collection.insertOne({
            threadId: 'new',
            seq: 1,
            createdAt: new Date()
        });
        config(1);
        expect(await AiCoreController.purgeOldTurns()).toBe(1);
        expect(collection.docs).toHaveLength(1);

        await collection.insertOne({
            threadId: 'older',
            seq: 1,
            createdAt: new Date(Date.now() - 3 * 86400000)
        });
        AiCoreController.startRetentionTimer();
        await jest.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
        expect(collection.docs).toHaveLength(1);

        config(0);
        await collection.insertOne({
            threadId: 'kept',
            seq: 1,
            createdAt: new Date(Date.now() - 10 * 86400000)
        });
        expect(await AiCoreController.purgeOldTurns()).toBe(0);
        expect(collection.docs).toHaveLength(2);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/retention.test.js
