/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Scope
 * @tagline         AiCore.deleteByScope cascade
 * @file            plugins/ai-core/webapp/tests/unit/scope.test.js
 * @version         1.0.16
 * @release         2026-09-22
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import { deleteByScope } from '../../utils/agent/scope.js';
import { deleteStagedThread, stageImage } from '../../utils/attachments/index.js';
import AiThreadModel from '../../model/aiThread.js';
import AiTurnModel from '../../model/aiTurn.js';
import AiUsageModel from '../../model/aiUsage.js';
import { memoryCollection } from './helpers.js';

function memoryRedis() {
    const store = new Map();
    return {
        isRedisAvailable: () => true,
        async cacheSetObject(pathName, key, obj) {
            store.set(`${pathName}:${key}`, obj);
            return true;
        },
        async cacheGetObject(pathName, key) {
            return store.has(`${pathName}:${key}`) ? store.get(`${pathName}:${key}`) : null;
        },
        async cacheDel(pathName, key) {
            store.delete(`${pathName}:${key}`);
            return true;
        }
    };
}

afterEach(() => {
    AiThreadModel.useCollection(null);
    AiTurnModel.useCollection(null);
    AiUsageModel.useCollection(null);
    delete global.LogController;
    delete global.RedisManager;
});

describe('deleteByScope', () => {
    test('missing scopeType or scopeId throws AI_BAD_ARGS', async () => {
        await expect(deleteByScope({}, {
            threadModel: AiThreadModel,
            turnModel: AiTurnModel
        })).rejects.toMatchObject({ code: 'AI_BAD_ARGS' });
        await expect(deleteByScope({ scopeType: 'map' }, {
            threadModel: AiThreadModel,
            turnModel: AiTurnModel
        })).rejects.toMatchObject({ code: 'AI_BAD_ARGS' });
    });

    test('unknown scope returns zeros; a second call is a no-op', async () => {
        AiThreadModel.useCollection(memoryCollection());
        AiTurnModel.useCollection(memoryCollection());
        const first = await deleteByScope({ scopeType: 'map', scopeId: 'missing' }, {
            threadModel: AiThreadModel,
            turnModel: AiTurnModel
        });
        expect(first).toEqual({ threads: 0, turns: 0, images: 0 });
        const again = await deleteByScope({ scopeType: 'map', scopeId: 'missing' }, {
            threadModel: AiThreadModel,
            turnModel: AiTurnModel
        });
        expect(again).toEqual({ threads: 0, turns: 0, images: 0 });
    });

    test('wipes every user on the scope and leaves usage and other scopes', async () => {
        const threads = memoryCollection();
        const turns = memoryCollection();
        const usage = memoryCollection();
        AiThreadModel.useCollection(threads);
        AiTurnModel.useCollection(turns);
        AiUsageModel.useCollection(usage);
        const redis = memoryRedis();
        const a = await AiThreadModel.findOrCreateActive({
            scopeType: 'map',
            scopeId: 'm1',
            createdBy: 'alice'
        });
        const b = await AiThreadModel.findOrCreateActive({
            scopeType: 'map',
            scopeId: 'm1',
            createdBy: 'bob'
        });
        const other = await AiThreadModel.findOrCreateActive({
            scopeType: 'map',
            scopeId: 'm2',
            createdBy: 'alice'
        });
        await AiTurnModel.create({
            threadId: String(a._id),
            seq: 1,
            userText: 'hi',
            createdBy: 'alice'
        });
        await AiTurnModel.create({
            threadId: String(b._id),
            seq: 1,
            userText: 'yo',
            createdBy: 'bob'
        });
        await AiTurnModel.create({
            threadId: String(other._id),
            seq: 1,
            userText: 'keep',
            createdBy: 'alice'
        });
        await AiUsageModel.reserve('alice', '2026-09-18', { requests: 1 });
        await stageImage('alice', String(a._id), 'img-1', { data: 'x', mimeType: 'image/png' }, {}, redis);
        const counts = await deleteByScope({ scopeType: 'map', scopeId: 'm1' }, {
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            deleteStagedThread,
            redisManager: redis
        });
        expect(counts.threads).toBe(2);
        expect(counts.turns).toBe(2);
        expect(counts.images).toBe(1);
        expect(await AiThreadModel.listByScope({ scopeType: 'map', scopeId: 'm1' })).toEqual([]);
        expect((await AiThreadModel.listByScope({ scopeType: 'map', scopeId: 'm2' })).map((row) => String(row._id)))
            .toEqual([String(other._id)]);
        expect(await AiTurnModel.listByThread(String(other._id))).toHaveLength(1);
        expect(await AiUsageModel.getByKey('alice', '2026-09-18')).toBeTruthy();
        const again = await deleteByScope({ scopeType: 'map', scopeId: 'm1' }, {
            threadModel: AiThreadModel,
            turnModel: AiTurnModel,
            deleteStagedThread,
            redisManager: redis
        });
        expect(again).toEqual({ threads: 0, turns: 0, images: 0 });
    });
});

// EOF plugins/ai-core/webapp/tests/unit/scope.test.js
