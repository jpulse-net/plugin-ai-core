/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Providers
 * @tagline         configured filter, pair choice, vision gate
 * @file            plugins/ai-core/webapp/tests/unit/providers.test.js
 * @version         1.0.18
 * @release         2026-09-30
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, expect, test } from '@jest/globals';
import AiMockController from '../../../../ai-mock/webapp/controller/aiMock.js';
import {
    chooseProviderModel,
    filterAllowedModels,
    gateModelsForVision,
    normalizeProvider,
    pairOnMenu,
    pickDefaultModel,
    providerMap,
    queryHasImages,
    safeSvgIcon
} from '../../utils/agent/providers.js';

const mock = {
    plugin: 'ai-mock',
    label: 'Mock',
    configured: true,
    capabilities: { vision: false },
    models: [
        { id: 'mock-echo', label: 'Mock Echo' },
        { id: 'mock-unpriced', label: 'Mock Unpriced' }
    ]
};

const claude = {
    plugin: 'ai-anthropic',
    label: 'Anthropic',
    configured: false,
    capabilities: { vision: true },
    models: [{ id: 'claude-sonnet-5', label: 'Claude Sonnet 5' }]
};

describe('normalizeProvider', () => {
    test('keeps configured and defaults a missing flag to true', () => {
        expect(normalizeProvider({ plugin: 'ai-mock', configured: false }).configured).toBe(false);
        expect(normalizeProvider({ plugin: 'ai-mock' }).configured).toBe(true);
    });
});

describe('filterAllowedModels', () => {
    test('drops a provider whose configured flag is false', () => {
        const menu = filterAllowedModels([mock, claude], {});
        expect(menu.map((row) => row.provider)).toEqual(['ai-mock', 'ai-mock']);
        expect(menu.some((row) => row.provider === 'ai-anthropic')).toBe(false);
    });

    test('keeps a configured provider even when an allowed list is empty', () => {
        const menu = filterAllowedModels([mock], {});
        expect(menu.map((row) => row.model)).toEqual(['mock-echo', 'mock-unpriced']);
    });
});

describe('pickDefaultModel', () => {
    const menu = filterAllowedModels([
        mock,
        { ...claude, configured: true }
    ], {});

    test('exact pair wins when both admin fields are set', () => {
        const withTwo = filterAllowedModels([
            mock,
            {
                ...claude,
                configured: true,
                models: [
                    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
                    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' }
                ]
            }
        ], {});
        expect(pickDefaultModel(withTwo, {
            defaultProvider: 'ai-anthropic',
            defaultModel: 'claude-haiku-4-5'
        }).model).toBe('claude-haiku-4-5');
    });

    test('provider alone picks that provider\'s first menu row', () => {
        expect(pickDefaultModel(menu, {
            defaultProvider: 'ai-anthropic',
            defaultModel: ''
        })).toEqual(expect.objectContaining({
            provider: 'ai-anthropic',
            model: 'claude-sonnet-5'
        }));
    });

    test('unknown pair falls back to the provider, then menu[0]', () => {
        expect(pickDefaultModel(menu, {
            defaultProvider: 'ai-anthropic',
            defaultModel: 'claude-missing'
        }).model).toBe('claude-sonnet-5');
        expect(pickDefaultModel(menu, {
            defaultProvider: '',
            defaultModel: ''
        }).model).toBe('mock-echo');
    });
});

describe('chooseProviderModel', () => {
    const menu = filterAllowedModels([mock], {});

    test('explicit pair wins', () => {
        const chosen = chooseProviderModel(menu, {}, {
            provider: 'ai-mock',
            model: 'mock-unpriced'
        }, { provider: 'ai-mock', model: 'mock-echo' });
        expect(chosen.model).toBe('mock-unpriced');
    });

    test('thread pair is used when the turn does not name one', () => {
        const chosen = chooseProviderModel(menu, {}, {}, {
            provider: 'ai-mock',
            model: 'mock-unpriced'
        });
        expect(chosen.model).toBe('mock-unpriced');
    });

    test('a thread pair that left the menu falls back to the default', () => {
        const chosen = chooseProviderModel(menu, {
            defaultProvider: 'ai-mock',
            defaultModel: 'mock-echo'
        }, {}, {
            provider: 'ai-anthropic',
            model: 'claude-sonnet-5'
        });
        expect(chosen).toEqual(expect.objectContaining({
            provider: 'ai-mock',
            model: 'mock-echo'
        }));
    });
});

describe('gateModelsForVision', () => {
    test('marks non-vision rows when hasImages is set', () => {
        const menu = filterAllowedModels([
            mock,
            { ...claude, configured: true }
        ], {});
        const gated = gateModelsForVision(menu, { hasImages: true });
        const mockRow = gated.find((row) => row.model === 'mock-echo');
        const visionRow = gated.find((row) => row.model === 'claude-sonnet-5');
        expect(mockRow).toEqual(expect.objectContaining({
            available: false,
            reason: 'vision'
        }));
        expect(visionRow.available).toBeUndefined();
        expect(visionRow.reason).toBeUndefined();
    });

    test('leaves the menu alone when hasImages is off', () => {
        const menu = filterAllowedModels([mock], {});
        expect(gateModelsForVision(menu, { hasImages: false })).toBe(menu);
    });
});

describe('queryHasImages', () => {
    test('accepts 1 and true', () => {
        expect(queryHasImages({ hasImages: '1' })).toBe(true);
        expect(queryHasImages({ hasImages: 'true' })).toBe(true);
        expect(queryHasImages({ hasImages: '0' })).toBe(false);
        expect(queryHasImages({})).toBe(false);
    });
});

describe('pairOnMenu', () => {
    test('matches provider and model', () => {
        const menu = filterAllowedModels([mock], {});
        expect(pairOnMenu(menu, 'ai-mock', 'mock-echo')).toBe(true);
        expect(pairOnMenu(menu, 'ai-anthropic', 'claude-sonnet-5')).toBe(false);
    });
});

describe('ai-mock descriptor', () => {
    test('registers configured true and a vision row', async () => {
        const ctx = { providers: [] };
        await AiMockController.onAiProviderRegister(ctx);
        expect(ctx.providers[0].configured).toBe(true);
        expect(ctx.providers[0].plugin).toBe('ai-mock');
        const vision = ctx.providers[0].models.find((row) => row.id === 'mock-vision');
        expect(vision.capabilities.vision).toBe(true);
        const menu = filterAllowedModels([normalizeProvider(ctx.providers[0])], {});
        const echo = menu.find((row) => row.model === 'mock-echo');
        const seen = menu.find((row) => row.model === 'mock-vision');
        expect(echo.capabilities.vision).toBe(false);
        expect(seen.capabilities.vision).toBe(true);
    });
});

describe('safeSvgIcon', () => {
    test('accepts a plain inline SVG and trims it', () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18"/></svg>';
        expect(safeSvgIcon(`  ${svg}\n`)).toBe(svg);
    });

    test('rejects non-SVG, scripts, event handlers, and javascript: URLs', () => {
        expect(safeSvgIcon('')).toBe('');
        expect(safeSvgIcon(null)).toBe('');
        expect(safeSvgIcon('<img src="x.png">')).toBe('');
        expect(safeSvgIcon('<svgfoo></svgfoo>')).toBe('');
        expect(safeSvgIcon('<svg><script>alert(1)</script></svg>')).toBe('');
        expect(safeSvgIcon('<svg onload="alert(1)"></svg>')).toBe('');
        expect(safeSvgIcon('<svg><a href="javascript:alert(1)"></a></svg>')).toBe('');
        expect(safeSvgIcon('<svg><foreignObject></foreignObject></svg>')).toBe('');
    });
});

describe('providerMap', () => {
    const coreIcon = '<svg viewBox="0 0 24 24"><rect width="16" height="12"/></svg>';
    const claudeIcon = '<svg viewBox="0 0 24 24"><path d="M5 20 12 4"/></svg>';
    const pluginManager = {
        getPlugin(name) {
            const icons = {
                'ai-core': coreIcon,
                'ai-anthropic': claudeIcon,
                'ai-mock': '<svg onload="x()"></svg>'
            };
            return name in icons ? { metadata: { icon: icons[name] } } : null;
        }
    };

    test('one entry per provider, icon from its plugin.json', () => {
        const menu = [
            { provider: 'ai-anthropic', model: 'claude-sonnet-5' },
            { provider: 'ai-anthropic', model: 'claude-opus-5' }
        ];
        expect(providerMap(menu, [claude], pluginManager)).toEqual({
            'ai-anthropic': { label: 'Anthropic', icon: claudeIcon }
        });
    });

    test('an unsafe or missing icon falls back to the ai-core icon', () => {
        const menu = [
            { provider: 'ai-mock', model: 'mock-echo' },
            { provider: 'ai-other', model: 'x' }
        ];
        expect(providerMap(menu, [mock], pluginManager)).toEqual({
            'ai-mock': { label: 'Mock', icon: coreIcon },
            'ai-other': { label: 'ai-other', icon: coreIcon }
        });
    });

    test('no plugin manager yields empty icons', () => {
        const menu = [{ provider: 'ai-mock', model: 'mock-echo' }];
        expect(providerMap(menu, [mock], null)).toEqual({
            'ai-mock': { label: 'Mock', icon: '' }
        });
    });
});

// EOF plugins/ai-core/webapp/tests/unit/providers.test.js
