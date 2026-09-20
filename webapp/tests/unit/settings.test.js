/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Settings
 * @tagline         mergeSettings and plugin-config debugDumps
 * @file            plugins/ai-core/webapp/tests/unit/settings.test.js
 * @version         1.0.13
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { cacheSettings, loadSettings, mergeSettings } from '../../utils/agent/settings.js';

afterEach(() => {
    delete global.PluginModel;
    delete global.ConfigModel;
    delete global.appConfig;
    cacheSettings(null);
});

describe('settings', () => {
    test('PluginModel import from settings.js resolves', () => {
        const dest = path.resolve(
            process.cwd(),
            'plugins/ai-core/webapp/utils/agent',
            '../../../../../webapp/model/plugin.js'
        );
        expect(fs.existsSync(dest)).toBe(true);
    });

    test('proposalClaimPhrases default to the shipped list and accept a textarea', () => {
        const defaults = mergeSettings({ site: { enabled: true } });
        expect(defaults.proposalClaimPhrases.length).toBeGreaterThan(0);
        expect(defaults.proposalClaimPhrases).toContain('click Apply');
        const custom = mergeSettings({
            site: { proposalClaimPhrases: 'Ready for review\n/please apply/i' }
        });
        expect(custom.proposalClaimPhrases).toEqual(['Ready for review', '/please apply/i']);
    });

    test('maxConvertBytes and defaultToolTimeoutMs ship at 25 MB and 10 s', () => {
        const settings = mergeSettings({ site: { enabled: true } });
        expect(settings.maxConvertBytes).toBe(26214400);
        expect(settings.defaultToolTimeoutMs).toBe(10000);
        const custom = mergeSettings({
            site: { maxConvertBytes: 1048576, defaultToolTimeoutMs: 35000 }
        });
        expect(custom.maxConvertBytes).toBe(1048576);
        expect(custom.defaultToolTimeoutMs).toBe(35000);
    });

    test('debugDumps stays off without plugin or app.conf flag', () => {
        const settings = mergeSettings({ site: { enabled: true } });
        expect(settings.debugDumps).toBe(false);
    });

    test('debugDumps follows the plugin-config checkbox', () => {
        const settings = mergeSettings({
            plugin: { debugDumps: true }
        });
        expect(settings.debugDumps).toBe(true);
    });

    test('loadSettings reads PluginModel config, not only global.PluginModel', async () => {
        const pluginModel = {
            async getByName(name) {
                expect(name).toBe('ai-core');
                return { name, config: { debugDumps: true } };
            }
        };
        const settings = await loadSettings({ pluginModel, configModel: { findById: async () => null } });
        expect(settings.debugDumps).toBe(true);
    });

    test('config tabLabel is AI Agent / KI-Agent', () => {
        const en = fs.readFileSync(
            path.resolve(process.cwd(), 'plugins/ai-core/webapp/translations/en.conf'),
            'utf8'
        );
        const de = fs.readFileSync(
            path.resolve(process.cwd(), 'plugins/ai-core/webapp/translations/de.conf'),
            'utf8'
        );
        expect(en).toMatch(/tabLabel:\s*'AI Agent'/);
        expect(de).toMatch(/tabLabel:\s*'KI-Agent'/);
        expect(en).not.toMatch(/tabLabel:\s*'AI',/);
        expect(de).not.toMatch(/tabLabel:\s*'KI',/);
    });

    test('loadSettings leaves dumps off when plugin config is empty', async () => {
        const pluginModel = {
            async getByName() {
                return { name: 'ai-core', config: {} };
            }
        };
        const settings = await loadSettings({ pluginModel, configModel: { findById: async () => null } });
        expect(settings.debugDumps).toBe(false);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/settings.test.js
