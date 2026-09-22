/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Modules
 * @tagline         Hashing, purity, dataScope, two-host run
 * @file            plugins/ai-core/webapp/tests/unit/modules.test.js
 * @version         1.0.15
 * @release         2026-09-21
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHookManager, testActor } from './helpers.js';
import {
    clearTools,
    createBudgetState,
    discoverToolModules,
    executeTool,
    getModuleByHash,
    hashSource,
    registerTools,
    resetModuleCatalog,
    resolveTools,
    scanModuleSource,
    scanToolModules
} from '../../utils/tools/index.js';

const schema = { type: 'object', properties: {} };

function tempRoot(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tools-'));
    for (const [name, source] of Object.entries(files)) {
        fs.writeFileSync(path.join(dir, name), source);
    }
    return dir;
}

afterEach(() => {
    clearTools();
    resetModuleCatalog();
});

describe('shared tool modules', () => {
    test('hashing is stable across reads', () => {
        const source = 'export function run(data) { return data; }\n';
        expect(hashSource(source)).toBe(hashSource(source));
        expect(hashSource(source)).toHaveLength(16);
    });

    test('site overrides a plugin module by name', () => {
        const pluginDir = tempRoot({
            'shared.js': 'export function run() { return { from: "plugin" }; }\n'
        });
        const siteDir = tempRoot({
            'shared.js': 'export function run() { return { from: "site" }; }\n'
        });
        const catalog = discoverToolModules({ roots: [siteDir, pluginDir] });
        expect(catalog.get('shared').source).toContain('site');
    });

    test('impure fixture is refused at import and at serve', () => {
        const dir = tempRoot({
            'bad.js': 'import fs from "fs";\nexport function run() { return fs; }\n'
        });
        const scanned = scanToolModules({ roots: [dir] });
        expect(scanned[0].ok).toBe(false);
        discoverToolModules({ roots: [dir] });
        expect(getModuleByHash(scanned[0].hash, 'bad')).toBeTruthy();
        expect(getModuleByHash(scanned[0].hash, 'bad').ok).toBe(false);
        expect(scanModuleSource('import fs from "fs";', path.join(dir, 'bad.js'), dir).ok).toBe(false);
    });

    test('scanner covers the plugin ai-tools directory', () => {
        const pluginDir = path.resolve(process.cwd(), 'plugins/ai-core/webapp/utils/ai-tools');
        const scanned = scanToolModules({ roots: [pluginDir] });
        expect(scanned.map(row => row.name)).toContain('sources');
        expect(scanned.find(row => row.name === 'sources').ok).toBe(true);
        expect(scanned.map(row => row.name)).not.toContain('readDraft');
        expect(scanned.map(row => row.name)).not.toContain('proposeRewrite');
    });

    test('stale hash is not served', () => {
        const dir = tempRoot({
            'ok.js': 'export function run() { return 1; }\n'
        });
        discoverToolModules({ roots: [dir] });
        expect(getModuleByHash('deadbeefdeadbeef', 'ok')).toBeNull();
    });

    test('dataScope turn builds once and call builds per call', async () => {
        const dir = tempRoot({
            'count.js': 'export function run(data) { return { n: data.n }; }\n'
        });
        discoverToolModules({ roots: [dir] });
        registerTools({
            name: 'count_once',
            description: 'Count',
            schema,
            module: 'count',
            dataScope: 'turn',
            requires: null
        }, 'site');
        let builds = 0;
        const hooks = createHookManager({
            onAiToolData: (ctx) => {
                builds += 1;
                ctx.data = { n: builds };
                return ctx;
            }
        });
        const cache = new Map();
        const first = await executeTool({
            name: 'count_once',
            actor: testActor(),
            budgetState: createBudgetState(),
            hookManager: hooks,
            moduleDataCache: cache
        });
        const second = await executeTool({
            name: 'count_once',
            actor: testActor(),
            budgetState: createBudgetState(),
            hookManager: hooks,
            moduleDataCache: cache
        });
        expect(first.data.n).toBe(1);
        expect(second.data.n).toBe(1);
        expect(builds).toBe(1);

        registerTools({
            name: 'count_each',
            description: 'Count',
            schema,
            module: 'count',
            dataScope: 'call',
            requires: null
        }, 'site');
        const third = await executeTool({
            name: 'count_each',
            actor: testActor(),
            budgetState: createBudgetState(),
            hookManager: hooks,
            moduleDataCache: cache
        });
        expect(builds).toBe(2);
        expect(third.data.n).toBe(2);
    });

    test('a discovered module is offered when registered', async () => {
        const dir = tempRoot({
            'count.js': 'export function run(data) { return { n: data.n || 0 }; }\n'
        });
        registerTools({
            name: 'count_offered',
            description: 'Count',
            schema,
            host: 'client',
            module: 'count',
            requires: 'scope:read'
        }, 'site');
        discoverToolModules({ roots: [dir] });
        const offered = await resolveTools(testActor({ scopeType: 'doc' }), {
            scope: { canRead: true },
            policy: { reviewedToolNames: [], disabledToolNames: [] }
        });
        expect(offered.tools.map(tool => tool.name)).toContain('count_offered');
    });
});

// EOF plugins/ai-core/webapp/tests/unit/modules.test.js
