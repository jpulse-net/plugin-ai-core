/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Threads
 * @tagline         One active thread per scope and user
 * @file            plugins/ai-core/webapp/tests/unit/threads.test.js
 * @version         1.0.1
 * @release         2026-09-17
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
