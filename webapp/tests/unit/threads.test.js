/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Threads
 * @tagline         One active thread per scope and user
 * @file            plugins/ai-core/webapp/tests/unit/threads.test.js
 * @version         1.0.13
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, expect, test } from '@jest/globals';
import AiThreadModel, { AI_THREADS_INDEXES } from '../../model/aiThread.js';
import AiTurnModel from '../../model/aiTurn.js';
import { memoryCollection } from './helpers.js';

describe('threads', () => {
    test('partial unique index is declared on the active triple', () => {
        const spec = AI_THREADS_INDEXES.find(index => index.unique);
        expect(spec.partialFilterExpression).toEqual({ status: 'active' });
        expect(spec.key).toEqual({ scopeType: 1, scopeId: 1, createdBy: 1 });
    });

    test('rejects a second active thread and permits archived ones', async () => {
        const collection = memoryCollection();
        AiThreadModel.useCollection(collection);
        await AiThreadModel.ensureIndexes();
        const first = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-1',
            createdBy: 'jdoe'
        });
        const again = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-1',
            createdBy: 'jdoe'
        });
        expect(String(again._id)).toBe(String(first._id));
        await AiThreadModel.archive(first._id);
        const next = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-1',
            createdBy: 'jdoe'
        });
        expect(String(next._id)).not.toBe(String(first._id));
        expect(collection.docs.filter(d => d.scopeId === 'doc-1')).toHaveLength(2);
    });

    test('startNew archives the active slot instead of reopening it', async () => {
        const collection = memoryCollection();
        AiThreadModel.useCollection(collection);
        const first = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-new',
            createdBy: 'jdoe'
        });
        await AiThreadModel.archive(first._id);
        const second = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-new',
            createdBy: 'jdoe'
        });
        const reused = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-new',
            createdBy: 'jdoe'
        });
        expect(String(reused._id)).toBe(String(second._id));
        const started = await AiThreadModel.startNew({
            scopeType: 'doc',
            scopeId: 'doc-new',
            createdBy: 'jdoe'
        });
        expect(String(started._id)).not.toBe(String(first._id));
        expect(String(started._id)).not.toBe(String(second._id));
        expect(started.status).toBe('active');
        const listed = await AiThreadModel.listForOwner({
            createdBy: 'jdoe',
            scopeType: 'doc',
            scopeId: 'doc-new'
        });
        expect(listed).toHaveLength(3);
        const secondAfter = listed.find((row) => String(row._id) === String(second._id));
        expect(secondAfter.status).toBe('archived');
    });

    test('listForOwner is newest first and honors limit', async () => {
        const collection = memoryCollection();
        AiThreadModel.useCollection(collection);
        const first = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-list',
            createdBy: 'jdoe',
            now: new Date('2026-01-01T00:00:00Z')
        });
        await AiThreadModel._update(first._id, {
            status: 'archived',
            updatedAt: new Date('2026-01-01T00:00:00Z')
        });
        const second = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-list',
            createdBy: 'jdoe',
            now: new Date('2026-02-01T00:00:00Z')
        });
        await AiThreadModel._update(second._id, {
            status: 'archived',
            updatedAt: new Date('2026-02-01T00:00:00Z')
        });
        const third = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-list',
            createdBy: 'jdoe',
            now: new Date('2026-03-01T00:00:00Z')
        });
        const listed = await AiThreadModel.listForOwner({
            createdBy: 'jdoe',
            scopeType: 'doc',
            scopeId: 'doc-list',
            limit: 2
        });
        expect(listed).toHaveLength(2);
        expect(String(listed[0]._id)).toBe(String(third._id));
        expect(String(listed[1]._id)).toBe(String(second._id));
    });

    test('touch moves a thread to the front of listForOwner', async () => {
        const collection = memoryCollection();
        AiThreadModel.useCollection(collection);
        const first = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-touch',
            createdBy: 'jdoe',
            now: new Date('2026-01-01T00:00:00Z')
        });
        await AiThreadModel._update(first._id, {
            status: 'archived',
            updatedAt: new Date('2026-01-01T00:00:00Z'),
            label: 'Just a hello'
        });
        const second = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-touch',
            createdBy: 'jdoe',
            now: new Date('2026-09-17T00:00:00Z')
        });
        await AiThreadModel._update(second._id, {
            status: 'archived',
            updatedAt: new Date('2026-09-17T12:00:00Z'),
            label: 'Attachment tests'
        });
        const third = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-touch',
            createdBy: 'jdoe',
            now: new Date('2026-09-17T18:00:00Z'),
            label: 'German'
        });
        let listed = await AiThreadModel.listForOwner({
            createdBy: 'jdoe',
            scopeType: 'doc',
            scopeId: 'doc-touch'
        });
        expect(listed.map((row) => row.label)).toEqual(['German', 'Attachment tests', 'Just a hello']);
        await AiThreadModel.touch(first._id);
        listed = await AiThreadModel.listForOwner({
            createdBy: 'jdoe',
            scopeType: 'doc',
            scopeId: 'doc-touch'
        });
        expect(String(listed[0]._id)).toBe(String(first._id));
        expect(listed[0].label).toBe('Just a hello');
        expect(String(listed[1]._id)).toBe(String(third._id));
    });

    test('updateThread can set label and the provider/model pair', async () => {
        const collection = memoryCollection();
        AiThreadModel.useCollection(collection);
        const thread = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-2',
            createdBy: 'jdoe'
        });
        const updated = await AiThreadModel.updateThread(thread._id, {
            label: 'Outline',
            provider: 'ai-mock',
            model: 'mock-echo'
        });
        expect(updated.label).toBe('Outline');
        expect(updated.provider).toBe('ai-mock');
        expect(updated.model).toBe('mock-echo');
        const again = await AiThreadModel.setProviderModel(thread._id, 'ai-mock', 'mock-unpriced');
        expect(again.model).toBe('mock-unpriced');
        expect(again.label).toBe('Outline');
    });

    test('threadIdsWithTurns returns only ids with at least one turn', async () => {
        const turns = memoryCollection();
        AiTurnModel.useCollection(turns);
        await AiTurnModel.create({
            threadId: 'alive',
            seq: 1,
            userText: 'hello',
            createdBy: 'jdoe'
        });
        const ids = await AiTurnModel.threadIdsWithTurns(['alive', 'empty', '']);
        expect([...ids]).toEqual(['alive']);
    });

    test('threadIdsWithTurns empty input is a no-query empty set', async () => {
        const turns = memoryCollection();
        let finds = 0;
        const origFind = turns.find.bind(turns);
        turns.find = function (query) {
            finds += 1;
            return origFind(query);
        };
        AiTurnModel.useCollection(turns);
        const none = await AiTurnModel.threadIdsWithTurns([]);
        expect(none.size).toBe(0);
        expect(finds).toBe(0);
        const alsoNone = await AiTurnModel.threadIdsWithTurns(null);
        expect(alsoNone.size).toBe(0);
        expect(finds).toBe(0);
    });

    test('list omits archived threads with zero surviving turns and keeps the rest', async () => {
        const threads = memoryCollection();
        const turns = memoryCollection();
        AiThreadModel.useCollection(threads);
        AiTurnModel.useCollection(turns);
        const husk = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-husk',
            createdBy: 'jdoe',
            label: 'Husk'
        });
        await AiThreadModel.archive(husk._id);
        const kept = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-husk',
            createdBy: 'jdoe',
            label: 'Kept archive'
        });
        await AiTurnModel.create({
            threadId: String(kept._id),
            seq: 1,
            userText: 'still here',
            createdBy: 'jdoe'
        });
        await AiThreadModel.archive(kept._id);
        const active = await AiThreadModel.findOrCreateActive({
            scopeType: 'doc',
            scopeId: 'doc-husk',
            createdBy: 'jdoe',
            label: 'Active empty'
        });
        const listed = await AiThreadModel.listForOwner({
            createdBy: 'jdoe',
            scopeType: 'doc',
            scopeId: 'doc-husk',
            limit: 100
        });
        const withTurns = await AiTurnModel.threadIdsWithTurns(listed.map((row) => row._id));
        const visible = listed.filter((row) => (
            row.status !== 'archived' || withTurns.has(String(row._id))
        ));
        expect(visible.map((row) => row.label).sort()).toEqual(['Active empty', 'Kept archive']);
        expect(visible.some((row) => String(row._id) === String(husk._id))).toBe(false);
        expect(visible.some((row) => String(row._id) === String(active._id))).toBe(true);
        expect(visible.some((row) => String(row._id) === String(kept._id))).toBe(true);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/threads.test.js
