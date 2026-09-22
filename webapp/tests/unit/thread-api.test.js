/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Thread API
 * @tagline         List surviving stamps and delete leaves usage
 * @file            plugins/ai-core/webapp/tests/unit/thread-api.test.js
 * @version         1.0.16
 * @release         2026-09-22
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import AiCoreController from '../../controller/aiCore.js';
import AiThreadModel from '../../model/aiThread.js';
import AiTurnModel from '../../model/aiTurn.js';
import AiUsageModel from '../../model/aiUsage.js';
import { memoryCollection, testActor } from './helpers.js';

const originalGate = AiCoreController._gate;

function jsonRes() {
    const res = {
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
    return res;
}

function stubGate(actor = testActor()) {
    AiCoreController._gate = async () => ({
        settings: { enabled: true },
        actor
    });
}

afterEach(() => {
    AiCoreController._gate = originalGate;
    AiThreadModel.useCollection(null);
    AiTurnModel.useCollection(null);
    AiUsageModel.useCollection(null);
});

describe('thread API', () => {
    test('apiListThreads stamps surviving and minSeq and omits husks', async () => {
        const threads = memoryCollection();
        const turns = memoryCollection();
        AiThreadModel.useCollection(threads);
        AiTurnModel.useCollection(turns);
        stubGate(testActor({ scopeType: 'doc', scopeId: 'doc-stats' }));
        const husk = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-stats',
            createdBy: 'jdoe',
            label: 'Husk',
            now: new Date('2026-01-01T00:00:00Z')
        });
        await AiThreadModel.archive(husk._id);
        const gapped = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-stats',
            createdBy: 'jdoe',
            label: 'Gapped',
            now: new Date('2026-02-01T00:00:00Z')
        });
        await AiTurnModel.create({
            threadId: String(gapped._id),
            seq: 4,
            userText: 'kept',
            createdBy: 'jdoe'
        });
        await AiTurnModel.create({
            threadId: String(gapped._id),
            seq: 5,
            userText: 'also kept',
            createdBy: 'jdoe'
        });
        await AiThreadModel.archive(gapped._id);
        const empty = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-stats',
            createdBy: 'jdoe',
            label: 'Active empty',
            now: new Date('2026-03-01T00:00:00Z')
        });
        const res = jsonRes();
        await AiCoreController.apiListThreads({
            query: { scopeType: 'doc', scopeId: 'doc-stats' }
        }, res);
        expect(res.body.success).toBe(true);
        const listed = res.body.data;
        expect(listed.map((row) => row.label).sort()).toEqual(['Active empty', 'Gapped']);
        expect(listed.some((row) => String(row._id) === String(husk._id))).toBe(false);
        const gappedRow = listed.find((row) => String(row._id) === String(gapped._id));
        expect(gappedRow.surviving).toBe(2);
        expect(gappedRow.minSeq).toBe(4);
        const emptyRow = listed.find((row) => String(row._id) === String(empty._id));
        expect(emptyRow.surviving).toBe(0);
        expect(emptyRow.minSeq).toBe(0);
    });

    test('apiDeleteThread removes the thread and leaves usage counters', async () => {
        const threads = memoryCollection();
        const turns = memoryCollection();
        const usage = memoryCollection();
        AiThreadModel.useCollection(threads);
        AiTurnModel.useCollection(turns);
        AiUsageModel.useCollection(usage);
        stubGate(testActor({ scopeType: 'doc', scopeId: 'doc-usage' }));
        const thread = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-usage',
            createdBy: 'jdoe',
            label: 'Spend',
            provider: 'ai-mock',
            model: 'mock-echo'
        });
        await AiTurnModel.create({
            threadId: String(thread._id),
            seq: 1,
            userText: 'hello',
            createdBy: 'jdoe'
        });
        await AiUsageModel.reserve('jdoe', '2026-09-21', { requests: 1 });
        await AiUsageModel.settle('jdoe', '2026-09-21', {
            requests: 1,
            tokensIn: 12,
            tokensOut: 8
        });
        const before = { ...(await AiUsageModel.getByKey('jdoe', '2026-09-21')) };
        const res = jsonRes();
        await AiCoreController.apiDeleteThread({
            params: { id: thread._id },
            query: { scopeType: 'doc', scopeId: 'doc-usage' }
        }, res);
        expect(res.body).toEqual(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                deleted: true,
                thread: expect.objectContaining({
                    status: 'active'
                })
            })
        }));
        expect(String(res.body.data.thread._id)).not.toBe(String(thread._id));
        expect(await AiThreadModel.findById(thread._id)).toBeNull();
        expect(await AiTurnModel.listByThread(String(thread._id))).toEqual([]);
        expect(await AiUsageModel.getByKey('jdoe', '2026-09-21')).toEqual(before);
        expect(before.requests).toBe(1);
        expect(before.tokensIn).toBe(12);
        expect(before.tokensOut).toBe(8);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/thread-api.test.js
