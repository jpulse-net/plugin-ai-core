/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Threads
 * @tagline         One active thread per scope and user
 * @file            plugins/ai-core/webapp/tests/unit/threads.test.js
 * @version         1.0.9
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, expect, test } from '@jest/globals';
import AiThreadModel, { AI_THREADS_INDEXES } from '../../model/aiThread.js';
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
});

// EOF plugins/ai-core/webapp/tests/unit/threads.test.js
