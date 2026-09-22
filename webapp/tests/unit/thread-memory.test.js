/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Thread Memory
 * @tagline         Per-user last-open thread key and ownership filter
 * @file            plugins/ai-core/webapp/tests/unit/thread-memory.test.js
 * @version         1.0.16
 * @release         2026-09-22
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, expect, test } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
    legacyThreadStorageKey,
    rememberedThreadId,
    threadStorageKey
} from '../../utils/panel/threadMemory.js';

const panelPath = path.resolve(process.cwd(), 'plugins/ai-core/webapp/view/jpulse-common.js');
const panel = fs.readFileSync(panelPath, 'utf8');
const controllerPath = path.resolve(process.cwd(), 'plugins/ai-core/webapp/controller/aiCore.js');
const controller = fs.readFileSync(controllerPath, 'utf8');

describe('thread storage keys', () => {
    test('scopes the last-open key by username', () => {
        expect(threadStorageKey('peter', 'hello-ai', 'demo'))
            .toBe('jp:ai:thread:peter:hello-ai:demo');
        expect(threadStorageKey('siteadmin', 'hello-ai', 'demo'))
            .toBe('jp:ai:thread:siteadmin:hello-ai:demo');
        expect(threadStorageKey('', 'hello-ai', 'demo'))
            .toBe('jp:ai:thread:_anon:hello-ai:demo');
        expect(legacyThreadStorageKey('hello-ai', 'demo'))
            .toBe('jp:ai:thread:hello-ai:demo');
    });

    test('keeps a stored id only when it is in the current user list', () => {
        const mine = [{ _id: 'aaa' }, { _id: 'bbb' }];
        expect(rememberedThreadId('aaa', 'zzz', mine)).toBe('aaa');
        expect(rememberedThreadId('', 'bbb', mine)).toBe('bbb');
        expect(rememberedThreadId('ccc', 'ddd', mine)).toBe('');
        expect(rememberedThreadId('ccc', 'ddd', [])).toBe('');
        expect(rememberedThreadId('aaa', 'bbb', [])).toBe('');
    });
});

describe('panel uses the ownership filter', () => {
    test('capability publishes the thread owner as username', () => {
        expect(controller).toMatch(/username:\s*threadOwner\(actor\)/);
    });

    test('init restores only a remembered id that is still owned', () => {
        expect(panel).toMatch(/threadKey = threadStorageKey\(/);
        expect(panel).toMatch(/rememberedThreadId\(userStored, legacyStored, state\.threads\)/);
    });

    test('openThread does not load turns or the socket for a foreign id', () => {
        const start = panel.indexOf('async function openThread(');
        expect(start).toBeGreaterThan(-1);
        const open = panel.slice(start, start + 1800);
        expect(open).toMatch(/if \(!currentThread\(\)\) \{/);
        expect(open.indexOf('if (!currentThread())')).toBeLessThan(
            open.indexOf('/api/1/ai/thread/')
        );
        expect(open.indexOf('if (!res.success)')).toBeLessThan(
            open.indexOf('connectWs')
        );
    });
});

// EOF plugins/ai-core/webapp/tests/unit/thread-memory.test.js
