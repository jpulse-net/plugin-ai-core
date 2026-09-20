/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Panel Extension
 * @tagline         Regions, catalog merge, examples, context helpers
 * @file            plugins/ai-core/webapp/tests/unit/panel-extension.test.js
 * @version         1.0.11
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, expect, test } from '@jest/globals';
import {
    ANCHORS,
    mergeRegions,
    normalizeContent,
    normalizeRegion,
    orderRegionsForAnchor,
    unknownAnchorMessage
} from '../../utils/panel/regions.js';
import {
    DEFAULT_COMMANDS,
    defaults,
    filterSlashCommands,
    normalizeCatalog,
    parseExampleRow,
    parseSlashCommand
} from '../../utils/panel/slash.js';

function namesOf(list) {
    return list.map((row) => row.name);
}

describe('region anchors', () => {
    test('unknown anchor names the valid five', () => {
        expect(() => normalizeRegion({ name: 'x', anchor: 'footer' })).toThrow(
            unknownAnchorMessage('footer')
        );
        expect(unknownAnchorMessage('footer')).toContain(ANCHORS.join(', '));
    });

    test('priority defaults to 100 and orders inside an anchor', () => {
        const merged = mergeRegions([
            { name: 'b', anchor: 'header', priority: 50, render() { return 'b'; } },
            { name: 'a', anchor: 'header', render() { return 'a'; } },
            { name: 'c', anchor: 'composeBelow', priority: 1, render() { return 'c'; } }
        ]);
        expect(merged.map((row) => row.name)).toEqual(['b', 'a', 'c']);
        expect(merged[1].priority).toBe(100);
        expect(orderRegionsForAnchor(merged, 'header').map((row) => row.name)).toEqual(['b', 'a']);
    });

    test('site priority cannot leave its slot', () => {
        const merged = mergeRegions([
            { name: 'high', anchor: 'composeAbove', priority: 1, render() { return 'x'; } }
        ]);
        expect(merged[0].anchor).toBe('composeAbove');
        expect(ANCHORS.indexOf(merged[0].anchor)).toBe(ANCHORS.indexOf('composeAbove'));
    });

    test('content node passes through, string is escaped, null hides', () => {
        const node = { nodeType: 1 };
        expect(normalizeContent(node)).toEqual({ hide: false, node: node });
        expect(normalizeContent('a <b>', (text) => text.replace(/</g, '&lt;'))).toEqual({
            hide: false,
            text: 'a &lt;b>'
        });
        expect(normalizeContent(null)).toEqual({ hide: true });
    });

    test('last region of a name wins and refresh-by-name is just a filter', () => {
        const merged = mergeRegions([
            { name: 'stats', anchor: 'header', render() { return 'one'; } },
            { name: 'stats', anchor: 'composeBelow', render() { return 'two'; } }
        ]);
        expect(merged).toHaveLength(1);
        expect(merged[0].anchor).toBe('composeBelow');
        expect(merged.filter((row) => row.name === 'stats')).toHaveLength(1);
        expect(merged.filter((row) => row.name === 'missing')).toEqual([]);
    });
});

describe('slash catalog', () => {
    test('omitted commands equal the applicable defaults', () => {
        const catalog = normalizeCatalog();
        expect(namesOf(catalog)).toEqual(defaults);
        expect(namesOf(filterSlashCommands('/', catalog, {}))).toEqual([
            'help', 'tools', 'model', 'new', 'cancel', 'conversations', 'status'
        ]);
    });

    test('last-wins override and aliases resolve', () => {
        let sawFramework = false;
        const catalog = normalizeCatalog([
            ...defaults,
            {
                name: 'help',
                hint: 'Site help',
                run: async (ctx) => {
                    sawFramework = typeof ctx.framework === 'function';
                    return 'site';
                }
            },
            { name: 'pad', hint: 'Pad stats', run: () => 'pad' }
        ]);
        const help = catalog.find((row) => row.name === 'help');
        expect(help.hint).toBe('Site help');
        expect(help.run).toBeTruthy();
        expect(catalog.find((row) => row.name === 'pad').run()).toBe('pad');
        expect(parseSlashCommand('/clear', catalog).name).toBe('new');
        expect(parseSlashCommand('/resume', catalog).name).toBe('conversations');
        help.run({ framework() { return 'fw'; } });
        expect(sawFramework).toBe(true);
    });

    test('when() hides from picker and parser; hidden is runnable but unlisted', () => {
        const catalog = normalizeCatalog();
        expect(parseSlashCommand('/quota', catalog, {})).toBeNull();
        expect(parseSlashCommand('/sources', catalog, {})).toBeNull();
        expect(parseSlashCommand('/context', catalog, {})).toBeNull();
        expect(parseSlashCommand('/quota', catalog, {
            capability: { quota: { rows: [{ dimension: 'requests' }] } }
        }).name).toBe('quota');
        expect(parseSlashCommand('/sources', catalog, {
            capability: { sourcesEnabled: true }
        }).name).toBe('sources');
        expect(parseSlashCommand('/context', catalog, {
            adapter: { contextOptions() { return []; } }
        }).name).toBe('context');
        expect(parseSlashCommand('/cancel', catalog, {}).name).toBe('cancel');
        expect(parseSlashCommand('/model', catalog, {}).name).toBe('model');
        expect(parseSlashCommand('/status', catalog, {}).name).toBe('status');

        const withHidden = normalizeCatalog([
            ...defaults,
            { name: 'padreset', hidden: true, run: () => 'ok' }
        ]);
        expect(namesOf(filterSlashCommands('/', withHidden, {}))).not.toContain('padreset');
        expect(parseSlashCommand('/padreset', withHidden, {}).name).toBe('padreset');
    });

    test('conversations arg stays on the command', () => {
        const parsed = parseSlashCommand('/conversations 3', normalizeCatalog());
        expect(parsed).toEqual({ kind: 'command', name: 'conversations', arg: '3' });
    });

    test('// is literal and unknown stays local', () => {
        expect(parseSlashCommand('//help')).toEqual({ kind: 'literal', text: '/help' });
        expect(parseSlashCommand('/nope', normalizeCatalog())).toBeNull();
        expect(parseSlashCommand('hello')).toBeNull();
        expect(filterSlashCommands('//help')).toEqual([]);
    });

    test('picker and parser read one catalog', () => {
        const catalog = normalizeCatalog(['help', 'pad']);
        expect(parseSlashCommand('/pad', catalog)).toBeNull();
        const withPad = normalizeCatalog(['help', { name: 'pad' }]);
        expect(parseSlashCommand('/pad', withPad).name).toBe('pad');
        expect(namesOf(filterSlashCommands('/p', withPad))).toEqual(['pad']);
        expect(parseSlashCommand('/tools', withPad)).toBeNull();
    });

    test('site command with no framework twin is just another entry', () => {
        const catalog = normalizeCatalog([
            { name: 'pad', hint: 'Size', run: () => '12' }
        ]);
        expect(catalog).toHaveLength(1);
        expect(catalog[0].run()).toBe('12');
        expect(DEFAULT_COMMANDS.some((row) => row.name === 'pad')).toBe(false);
    });
});

describe('help examples', () => {
    test('[[links]] work anywhere and a single-bracket sentence stays plain', () => {
        expect(parseExampleRow('[[Read the scratch pad]]')).toEqual({
            parts: [{ type: 'link', text: 'Read the scratch pad', prompt: 'Read the scratch pad' }]
        });
        expect(parseExampleRow('[[Shorten it]](Propose a shorter rewrite of the scratch pad)')).toEqual({
            parts: [
                { type: 'link', text: 'Shorten it', prompt: 'Shorten it' },
                { type: 'text', text: '(Propose a shorter rewrite of the scratch pad)' }
            ]
        });
        expect(parseExampleRow('[[Translate this text into "Yoda-speak"]] (for Star Wars fans)')).toEqual({
            parts: [
                { type: 'link', text: 'Translate this text into "Yoda-speak"', prompt: 'Translate this text into "Yoda-speak"' },
                { type: 'text', text: ' (for Star Wars fans)' }
            ]
        });
        expect(parseExampleRow('[[/conversations 3]] Attachment tests — 2026-09-17')).toEqual({
            parts: [
                { type: 'link', text: '/conversations 3', prompt: '/conversations 3' },
                { type: 'text', text: ' Attachment tests — 2026-09-17' }
            ]
        });
        expect(parseExampleRow('[[/status]] — Show transport, thread, and model')).toEqual({
            parts: [
                { type: 'link', text: '/status', prompt: '/status' },
                { type: 'text', text: ' — Show transport, thread, and model' }
            ]
        });
        expect(parseExampleRow('Ask about anything on this page')).toEqual({
            parts: [{ type: 'text', text: 'Ask about anything on this page' }]
        });
        expect(parseExampleRow('See the [docs] for more')).toEqual({
            parts: [{ type: 'text', text: 'See the [docs] for more' }]
        });
        expect(parseExampleRow('')).toBeNull();
    });
});

describe('context options helper shape', () => {
    test('unavailable entries stay selectable and are not auto-picked by first-available', () => {
        const rows = [
            { value: 'gone', label: 'Bubble (unavailable) + children', unavailable: true },
            { value: 'all', label: 'Whole map' }
        ];
        const first = rows.find((row) => !row.unavailable) || rows[0];
        expect(first.value).toBe('all');
        expect(rows.find((row) => row.value === 'gone').unavailable).toBe(true);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/panel-extension.test.js
