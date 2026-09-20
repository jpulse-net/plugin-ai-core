/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Regressions
 * @tagline         1.0.8 and 1.0.9 product contracts that closed BubbleMap bugs
 * @file            plugins/ai-core/webapp/tests/unit/regressions.test.js
 * @version         1.0.13
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, expect, test } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { assemblePrompt, historyToMessages } from '../../utils/agent/prompt.js';
import { openUserContent } from '../../utils/agent/inputs.js';
import {
    appendManifestToUserContent,
    formatImagesBlock,
    formatSourcesBlock,
    formatSourcesEmptyBlock,
    formatTurnAttachmentManifest,
    stageImage,
    takeStagedImages,
    deleteStagedImage
} from '../../utils/attachments/index.js';
import { imageStageTtlOf } from '../../utils/attachments/images.js';
import { createHookManager, testActor } from './helpers.js';

const panel = fs.readFileSync(
    path.resolve(process.cwd(), 'plugins/ai-core/webapp/view/jpulse-common.js'),
    'utf8'
);
const css = fs.readFileSync(
    path.resolve(process.cwd(), 'plugins/ai-core/webapp/view/jpulse-common.css'),
    'utf8'
);
const enConf = fs.readFileSync(
    path.resolve(process.cwd(), 'plugins/ai-core/webapp/translations/en.conf'),
    'utf8'
);
const deConf = fs.readFileSync(
    path.resolve(process.cwd(), 'plugins/ai-core/webapp/translations/de.conf'),
    'utf8'
);

function fnBody(name) {
    const start = panel.indexOf(`function ${name}(`);
    expect(start).toBeGreaterThan(-1);
    const open = panel.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < panel.length; i += 1) {
        const ch = panel[i];
        if (ch === '{') {
            depth += 1;
        } else if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
                return panel.slice(open, i + 1);
            }
        }
    }
    return '';
}

function memoryRedis() {
    const store = new Map();
    const sets = [];
    return {
        sets,
        isRedisAvailable: () => true,
        async cacheSetObject(pathName, key, obj, opts) {
            sets.push({ pathName, key, ttl: opts && opts.ttl });
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

function sourceMeta(src) {
    return {
        kind: 'source',
        id: src.id,
        name: src.name,
        origin: src.origin,
        mimeType: src.mimeType
    };
}

function imageMeta(img) {
    return {
        kind: 'image',
        id: img.id,
        name: img.name,
        origin: img.origin || 'file',
        mimeType: img.mimeType
    };
}

function attachmentsFromState(sources, images) {
    return sources.map(sourceMeta).concat(images.map(imageMeta));
}

function siteProposeImage(handle, imageId) {
    const row = (handle.attachments() || []).find((item) => item.kind === 'image' && item.id === imageId);
    if (!row) {
        return { ok: false, error: 'That picture is no longer attached' };
    }
    if (!handle.attachmentFile(imageId)) {
        return { ok: false, error: 'That picture is no longer attached' };
    }
    return { ok: true, id: row.id, name: row.name };
}

function menuOpensToLeft(addLeft, addWidth, clipLeft, clipWidth) {
    return addLeft + addWidth / 2 >= clipLeft + clipWidth / 2;
}

describe('1.0.8 extras.prompt is unused', () => {
    test('assemblePrompt ignores leftover sources on extras and params', async () => {
        const assembled = await assemblePrompt({
            actor: testActor(),
            scope: { nouns: { item: 'item', container: 'scope' } },
            tools: [],
            sources: [{ id: 'a', name: 'Copyright.txt', text: 'NOPE' }],
            extras: {
                prompt: {
                    sources: [{ id: 'a', name: 'Copyright.txt', text: 'NOPE' }]
                }
            },
            hookManager: createHookManager()
        });
        expect(assembled.system).not.toContain('Copyright.txt');
        expect(assembled.system).not.toContain('NOPE');
        expect(assembled.system).not.toMatch(/Sources attached/);
        expect(assembled.system).toContain('Only the list on this turn\'s user message is attached');
    });
});

describe('1.0.8 create() chrome', () => {
    test('title is create-time and handle.setTitle can restamp it', () => {
        expect(panel).toMatch(/typeof options\.title === 'string' && options\.title\.trim\(\)/);
        expect(panel).toMatch(/function setTitle\(value\)/);
        expect(panel).toMatch(/handle\.setTitle = setTitle/);
        expect(panel).not.toMatch(/I18N\.title\s*=/);
    });

    test('shell bag is the named keys, not a spread', () => {
        expect(panel).toMatch(/storageKey: options\.storageKey/);
        expect(panel).toMatch(/cascade: options\.cascade/);
        expect(panel).toMatch(/group: options\.group/);
        expect(panel).toMatch(/mobile: options\.mobile/);
        expect(panel).toMatch(/\.\.\.\(options\.defaults \|\| \{\}\)/);
        expect(panel).toMatch(/minWidth: options\.minWidth != null \? options\.minWidth : 320/);
        expect(panel).toMatch(/minHeight: options\.minHeight != null \? options\.minHeight : 360/);
        expect(panel).not.toMatch(/floatPanel\.create\(\{[\s\S]*?\.\.\.options(?!\.defaults)/);
    });

    test('rename Enter and Escape both stop before the input hides', () => {
        expect(panel).toMatch(
            /if \(event\.key === 'Enter'\) \{\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*saveRename\(\);/
        );
        expect(panel).toMatch(
            /if \(event\.key === 'Escape'\) \{\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*cancelRename\(\);/
        );
    });

    test('destroy disconnects the socket before removing the node', () => {
        const start = panel.indexOf('function destroy()');
        const body = panel.slice(start, start + 1200);
        expect(body.indexOf('transport.disconnect()')).toBeGreaterThan(-1);
        expect(body.indexOf('removeChild(root)')).toBeGreaterThan(-1);
        expect(body.indexOf('transport.disconnect()')).toBeLessThan(body.indexOf('removeChild(root)'));
        expect(body.indexOf('floatDestroy()')).toBeLessThan(body.indexOf('removeChild(root)'));
        expect(body).toMatch(/if \(destroyed\) \{\s*return;/);
    });
});

describe('1.0.8 add-menu clip', () => {
    test('CSS default is left: 0; right: 0 is not in the block', () => {
        const addMenu = css.match(/\.plg-ai-add-menu\s*\{[^}]+\}/);
        expect(addMenu[0]).toMatch(/left:\s*0/);
        expect(addMenu[0]).not.toMatch(/right:\s*0/);
    });

    test('left-half (+) opens right; right-half opens left', () => {
        expect(menuOpensToLeft(8, 28, 0, 420)).toBe(false);
        expect(menuOpensToLeft(380, 28, 0, 420)).toBe(true);
        expect(menuOpensToLeft(196, 28, 0, 420)).toBe(true);
        expect(panel).toMatch(/addRect\.left \+ addRect\.width \/ 2 >= clipRect\.left \+ clipRect\.width \/ 2/);
        expect(panel).toMatch(/style\.right = '0px'/);
        expect(panel).toMatch(/style\.left = '0px'/);
        expect(panel).not.toMatch(/document\.body\.appendChild\(els\.addMenu\)/);
    });

    test('plugin CSS does not change .jp-float-panel overflow', () => {
        expect(css).not.toMatch(/\.jp-float-panel[^{]*\{[^}]*overflow/);
        expect(css).not.toMatch(/jp-float-panel[\s\S]{0,80}overflow:\s*(visible|auto)/);
    });
});

describe('1.0.8 compose paste', () => {
    test('text\/plain paste is not turned into a source', () => {
        const start = panel.indexOf("els.input.addEventListener('paste'");
        const body = panel.slice(start, panel.indexOf('});', start) + 3);
        expect(body).toMatch(/clipboardData\.files/);
        expect(body).toMatch(/if \(!files\.length\) \{\s*return;/);
        expect(body).toMatch(/addDroppedFile\(file, \{ origin: 'paste' \}\)/);
        expect(body).not.toMatch(/addTextSource/);
        expect(body).not.toMatch(/400/);
        expect(panel).not.toMatch(/text\.length > 400/);
    });

    test('slash Escape stops at the picker, not the map', () => {
        expect(panel).toMatch(
            /if \(event\.key === 'Escape'\) \{\s*if \(pickerOpen\) \{\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);/
        );
    });
});

describe('1.0.8 user-message manifest', () => {
    test('empty tab still gets the this-turn policy, not a system-prompt slot', async () => {
        const system = await assemblePrompt({
            actor: testActor(),
            scope: { nouns: { item: 'item', container: 'scope' } },
            tools: [],
            hookManager: createHookManager()
        });
        expect(system.system).toContain('earlier replies are stale');
        expect(system.system).not.toMatch(/Sources attached this turn/);
        expect(system.system).not.toContain('vanish on a page reload');
        const empty = formatTurnAttachmentManifest({ sources: [], sourcesEnabled: true });
        expect(empty).toBe(formatSourcesEmptyBlock());
        expect(empty).toContain('this turn');
        expect(empty).toContain('Filenames in earlier replies are stale');
    });

    test('a prior assistant filename cannot invert the live chip list', async () => {
        const history = historyToMessages([
            {
                userText: 'read the file',
                agentText: 'I read Copyright.txt (419 chars). test.txt looks stale.'
            }
        ], 10000);
        expect(history[0].content).toBe('read the file');
        expect(history[0].content).not.toContain('Sources attached');
        expect(history[1].content).toContain('Copyright.txt');
        const live = await openUserContent({
            userText: 'check again',
            sources: [{ id: 'b', name: 'test.txt', mimeType: 'text/plain', chars: 399, sections: 1, text: 'SECRET' }],
            actor: testActor()
        }, { sourcesEnabled: true }, {});
        expect(live).toContain('test.txt');
        expect(live).toContain('Sources attached this turn');
        expect(live).not.toContain('Copyright.txt');
        expect(live).not.toContain('SECRET');
        expect(formatSourcesBlock([{ id: 'b', name: 'test.txt', text: 'SECRET', chars: 399 }])).not.toContain('SECRET');
    });

    test('image metadata rides the user message only when vision is on', () => {
        const off = formatTurnAttachmentManifest({
            sources: [],
            images: [{ id: 'i', name: 'shot.png' }],
            sourcesEnabled: true,
            includeImages: false
        });
        expect(off).not.toContain('shot.png');
        const on = formatTurnAttachmentManifest({
            sources: [],
            images: [{ id: 'i', name: 'shot.png', width: 8, height: 6 }],
            sourcesEnabled: false,
            includeImages: true
        });
        expect(on).toContain('shot.png');
        expect(on).toContain(formatImagesBlock([{ id: 'i', name: 'shot.png', width: 8, height: 6 }]));
        expect(on).not.toContain('No file or URL is attached');
    });

    test('appendManifestToUserContent keeps vision parts in order', () => {
        const parts = appendManifestToUserContent([
            { type: 'text', text: 'Look' },
            { type: 'image', data: 'abc' }
        ], 'Images attached this turn:\n  i "shot.png"');
        expect(parts[0].text).toContain('Look');
        expect(parts[0].text).toContain('shot.png');
        expect(parts[1].type).toBe('image');
        expect(parts[1].data).toBe('abc');
        expect(appendManifestToUserContent('hi', '')).toBe('hi');
        expect(appendManifestToUserContent('', 'extra')).toBe('extra');
        const prepended = appendManifestToUserContent(
            [{ type: 'image', data: 'abc' }],
            'Images attached this turn'
        );
        expect(prepended[0]).toEqual({ type: 'text', text: 'Images attached this turn' });
        expect(prepended[1]).toEqual({ type: 'image', data: 'abc' });
        expect(formatTurnAttachmentManifest({
            sources: [],
            sourcesEnabled: false,
            includeImages: false
        })).toBe('');
    });
});

describe('1.0.9 chip and mailbox lifetime', () => {
    test('a site propose_image still sees the picture after send', async () => {
        const sources = [{ id: 'src-1', name: 'test.txt', origin: 'file', mimeType: 'text/plain' }];
        const images = [{ id: 'img-1', name: 'shot.png', origin: 'file', mimeType: 'image/png' }];
        const files = new Map([['img-1', { name: 'shot.png' }]]);
        const redis = memoryRedis();
        await stageImage('jdoe', 't1', 'img-1', { data: 'abc', mimeType: 'image/png', name: 'shot.png' }, {}, redis);
        await takeStagedImages('jdoe', 't1', images, redis);
        const handle = {
            attachments() {
                return attachmentsFromState(sources, images);
            },
            attachmentFile(id) {
                return files.get(id) || null;
            }
        };
        expect(handle.attachments().map((row) => row.kind)).toEqual(['source', 'image']);
        expect(siteProposeImage(handle, 'img-1')).toEqual({
            ok: true,
            id: 'img-1',
            name: 'shot.png'
        });
        expect((await takeStagedImages('jdoe', 't1', images, redis))[0].data).toBe('abc');
    });

    test('propose_image fails only after the chip or file is gone', async () => {
        const images = [{ id: 'img-1', name: 'shot.png', origin: 'file', mimeType: 'image/png' }];
        const files = new Map([['img-1', { name: 'shot.png' }]]);
        const handle = {
            attachments() {
                return attachmentsFromState([], images);
            },
            attachmentFile(id) {
                return files.get(id) || null;
            }
        };
        expect(siteProposeImage(handle, 'img-1').ok).toBe(true);
        files.delete('img-1');
        expect(siteProposeImage(handle, 'img-1')).toEqual({
            ok: false,
            error: 'That picture is no longer attached'
        });
        const empty = {
            attachments() {
                return attachmentsFromState(
                    [{ id: 'src-1', name: 'test.txt', origin: 'file' }],
                    []
                );
            },
            attachmentFile() {
                return null;
            }
        };
        expect(siteProposeImage(empty, 'img-1')).toEqual({
            ok: false,
            error: 'That picture is no longer attached'
        });
    });

    test('peek refreshes TTL and does not cacheDel', async () => {
        const redis = memoryRedis();
        await stageImage('jdoe', 't1', 'img-1', { data: 'x', mimeType: 'image/png' }, { imageStageTtlSec: 120 }, redis);
        const before = redis.sets.length;
        await takeStagedImages('jdoe', 't1', [{ id: 'img-1' }], redis, { imageStageTtlSec: 120 });
        const afterPeek = redis.sets.slice(before);
        expect(afterPeek.some((row) => row.ttl === 120)).toBe(true);
        expect(imageStageTtlOf({ imageStageTtlSec: 120 })).toBe(120);
        expect(imageStageTtlOf({})).toBe(300);
        expect(imageStageTtlOf({ imageStageTtlSec: 0 })).toBe(300);
        expect(imageStageTtlOf({ imageStageTtlSec: -1 })).toBe(300);
        expect(imageStageTtlOf({ imageStageTtlSec: 'nope' })).toBe(300);
        await deleteStagedImage('jdoe', 't1', 'img-1', redis);
        expect(await takeStagedImages('jdoe', 't1', [{ id: 'img-1' }], redis)).toEqual([]);
    });

    test('panel attachments() is live state, same shape the site adapter walks', () => {
        expect(panel).toMatch(/kind: 'source'/);
        expect(panel).toMatch(/kind: 'image'/);
        expect(panel).toMatch(
            /return state\.sources\.map\(sourceMeta\)\.concat\(state\.images\.map\(imageMeta\)\)/
        );
        expect(panel).toMatch(/handle\.attachments = panelApi\.attachments/);
        expect(panel).toMatch(/handle\.attachmentFile = panelApi\.attachmentFile/);
    });

    test('hello-ai still has no propose_image', () => {
        const helloCtrl = fs.readFileSync(
            path.resolve(process.cwd(), 'plugins/hello-ai/webapp/controller/helloAi.js'),
            'utf8'
        );
        expect(helloCtrl).not.toMatch(/propose_image/);
        expect(helloCtrl).toMatch(/name: 'propose_draft_rewrite'/);
    });
});

describe('1.0.10 chip attach, shell, destroy cancel', () => {
    test('⋯ ships only when adapter.attach is a function', () => {
        expect(panel).toMatch(/typeof adapter\.attach === 'function'/);
        expect(panel).toMatch(/function chipAttachChrome/);
        expect(panel).toMatch(/data-chip-more/);
        expect(panel).toMatch(/adapter\.attach\(row, handle\.attachmentFile\(row\.id\)\)/);
        expect(panel).toMatch(/adapter\.canAttach/);
        expect(panel).not.toMatch(/sourceAttachable/);
    });

    test('destroy fires cancel before disconnect', () => {
        const start = panel.indexOf('function destroy()');
        const body = panel.slice(start, start + 900);
        expect(body).toMatch(/state\.running && state\.threadId/);
        expect(body).toMatch(/\/api\/1\/ai\/thread\/\$\{encodeURIComponent\(state\.threadId\)\}\/cancel/);
        expect(body.indexOf('/cancel')).toBeGreaterThan(-1);
        expect(body.indexOf('/cancel')).toBeLessThan(body.indexOf('transport.disconnect()'));
    });

    test('/new and a chip-dropping switch share one confirm helper', () => {
        expect(panel).toMatch(/function confirmDropAttachments/);
        expect(panel).toMatch(/function confirmDropAttachmentsForSwitch/);
        expect(panel).toMatch(/state\.sources\.length \+ state\.images\.length/);
        expect(panel).toMatch(/I18N\.newConfirmBody/);
        expect(panel).toMatch(/confirmDropAttachmentsForSwitch\(thread\._id\)/);
        expect(panel).toMatch(/confirmDropAttachmentsForSwitch\(id\)/);
        const neu = fnBody('confirmDropAttachments');
        expect(neu).toMatch(/I18N\.newConfirmTitle/);
        expect(neu).toMatch(/I18N\.newConversation/);
        expect(neu).not.toMatch(/I18N\.switchConfirmTitle/);
        const sw = fnBody('confirmDropAttachmentsForSwitch');
        expect(sw).toMatch(/I18N\.switchConfirmTitle/);
        expect(sw).toMatch(/I18N\.switchConfirmAction/);
        expect(sw).not.toMatch(/confirmDropAttachments\(\);/);
    });

    test('startTurn does not wait for the socket and does not treat a false send as an error', () => {
        const start = panel.indexOf('async function startTurn(');
        expect(start).toBeGreaterThan(-1);
        const open = panel.indexOf('{', start);
        let depth = 0;
        let end = open;
        for (let i = open; i < panel.length; i += 1) {
            if (panel[i] === '{') {
                depth += 1;
            } else if (panel[i] === '}') {
                depth -= 1;
                if (depth === 0) {
                    end = i;
                    break;
                }
            }
        }
        const body = panel.slice(open, end + 1);
        expect(body).not.toMatch(/waitForWs/);
        expect(body).toMatch(/wsConn\.send\(\{ type: 'turn', data: body \}\)/);
        expect(body).not.toMatch(/if \(!wsConn\.send/);
        expect(body).not.toMatch(/type: 'error'/);
        expect(panel).not.toMatch(/function waitForWs/);
    });

    test('compose pads the home indicator and the chip menu stays inside', () => {
        expect(css).toMatch(/safe-area-inset-bottom/);
        const chipMenu = css.match(/\.plg-ai-chip-menu\s*\{[^}]+\}/);
        expect(chipMenu[0]).toMatch(/left:\s*0/);
        expect(chipMenu[0]).not.toMatch(/right:\s*0/);
        expect(css).not.toMatch(/\.jp-float-panel[^{]*\{[^}]*overflow/);
    });

    test('bundle requires jPulse >=2.0.5', () => {
        const core = fs.readFileSync(
            path.resolve(process.cwd(), 'plugins/ai-core/plugin.json'),
            'utf8'
        );
        const mock = fs.readFileSync(
            path.resolve(process.cwd(), 'plugins/ai-mock/plugin.json'),
            'utf8'
        );
        const hello = fs.readFileSync(
            path.resolve(process.cwd(), 'plugins/hello-ai/plugin.json'),
            'utf8'
        );
        expect(core).toMatch(/"jpulseVersion":\s*">=2\.0\.5"/);
        expect(mock).toMatch(/"jpulseVersion":\s*">=2\.0\.5"/);
        expect(hello).toMatch(/"jpulseVersion":\s*">=2\.0\.5"/);
    });
});

describe('1.0.11 chip tooltip, switch confirm, compose Enter', () => {
    test('blocked Attach uses jp-tooltip, never title=', () => {
        expect(panel).toMatch(/function syncChipAttachItem/);
        expect(panel).toMatch(/function unbindChipAttachTooltip/);
        expect(panel).toMatch(/plg-ai-chip-attach-tip/);
        expect(panel).not.toMatch(/item\.title\s*=/);
        expect(panel).not.toMatch(/\.title\s*=\s*gate/);
        const body = fnBody('syncChipAttachItem');
        expect(body).toMatch(/classList\.add\('jp-tooltip'\)/);
        expect(body).toMatch(/setAttribute\('data-tooltip', reason\)/);
        expect(body).toMatch(/gate\.reason \|\| I18N\.chipAttachBlocked/);
        expect(body).toMatch(/removeAttribute\('title'\)/);
        expect(body).not.toMatch(/\.title\s*=/);
        expect(body).toMatch(/unbindChipAttachTooltip\(tip\)/);
        expect(body).toMatch(/gate\.ok \|\| prev !== reason/);
        expect(body).not.toMatch(/_jpTooltip\.innerHTML/);
        expect(body).toMatch(/tooltip\.initAll/);
        expect(css).toMatch(/\.plg-ai-chip-attach-tip/);
    });

    test('enabled Attach destroys the blocked tooltip, not just closeActive', () => {
        const unbind = fnBody('unbindChipAttachTooltip');
        expect(unbind).toMatch(/tip\._jpTooltip/);
        expect(unbind).toMatch(/removeEventListener\('keydown'/);
        expect(unbind).toMatch(/removeEventListener\('click'/);
        expect(unbind).toMatch(/parentNode\.removeChild\(popup\)/);
        expect(unbind).toMatch(/cloneNode\(true\)/);
        expect(unbind).toMatch(/replaceChild\(clone, tip\)/);
        expect(unbind).toMatch(/removeAttribute\('data-jp-tooltip-initialized'\)/);
        expect(unbind).toMatch(/classList\.remove\('jp-tooltip'\)/);
        const hide = fnBody('hideChipMenus');
        expect(hide).toMatch(/unbindChipAttachTooltip\(tip\)/);
    });

    test('switch confirm has its own title and primary', () => {
        const neu = fnBody('confirmDropAttachments');
        expect(neu).toMatch(/\(copy && copy\.title\) \|\| I18N\.newConfirmTitle/);
        expect(neu).toMatch(/\(copy && copy\.action\) \|\| I18N\.newConversation/);
        expect(neu).toMatch(/I18N\.newConfirmBody/);
        expect(neu).toMatch(/buttons: \[I18N\.cancel, action\]/);
        expect(neu).not.toMatch(/I18N\.switchConfirmTitle/);
        const sw = fnBody('confirmDropAttachmentsForSwitch');
        expect(sw).toMatch(/title:\s*I18N\.switchConfirmTitle/);
        expect(sw).toMatch(/action:\s*I18N\.switchConfirmAction/);
        expect(sw).not.toMatch(/confirmDropAttachments\(\);/);
        expect(sw).not.toMatch(/I18N\.newConfirmTitle/);
        expect(sw).not.toMatch(/I18N\.newConversation/);
        expect(panel).toMatch(/new:\s*async function \(\) \{\s*if \(!\(await confirmDropAttachments\(\)\)\)/);
        expect(enConf).toMatch(/switchConfirmTitle:\s*'Switch conversation\?'/);
        expect(enConf).toMatch(/switchConfirmAction:\s*'Switch'/);
        expect(deConf).toMatch(/switchConfirmTitle:\s*'Gespräch wechseln\?'/);
        expect(deConf).toMatch(/switchConfirmAction:\s*'Wechseln'/);
    });

    test('compose Enter stops before send.click', () => {
        expect(panel).toMatch(
            /if \(event\.key === 'Enter' && !event\.shiftKey\) \{\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*els\.send\.click\(\);/
        );
        const start = panel.indexOf("if (event.key === 'Enter' && !event.shiftKey)");
        expect(start).toBeGreaterThan(-1);
        const body = panel.slice(start, start + 180);
        expect(body.indexOf('stopPropagation')).toBeGreaterThan(-1);
        expect(body.indexOf('stopPropagation')).toBeLessThan(body.indexOf('els.send.click'));
    });
});

describe('1.0.13 cancel unsticks, toolbar reset, tab label, empty archives', () => {
    test('cancelTurn unsticks after POST and is not only the transport handler', () => {
        const body = fnBody('cancelTurn');
        expect(body).toMatch(/jPulse\.api\.post/);
        expect(body).toMatch(/\/cancel/);
        expect(body).toMatch(/setRunning\(false\)/);
        expect(body).toMatch(/state\.pendingUser = ''/);
        expect(body).toMatch(/state\.streaming = ''/);
        expect(body).toMatch(/showNotice\('', false\)/);
        expect(body).toMatch(/await renderTurns\(\)/);
        expect(body.indexOf('/cancel')).toBeLessThan(body.indexOf('setRunning(false)'));
        expect(body.indexOf('if (!res.success)')).toBeLessThan(body.indexOf('setRunning(false)'));
        const onStart = panel.indexOf('transport.on(');
        const onSlice = panel.slice(onStart, onStart + 1600);
        expect(onSlice).toMatch(/event\.type === 'canceled'/);
        expect(onSlice).toMatch(/setRunning\(false\)/);
    });

    test('toolbar dblclick resets size and corner; close is ignored', () => {
        expect(panel).toMatch(/const resetRect = \{/);
        expect(panel).toMatch(/options\.resetOnTitleDblclick !== false/);
        expect(panel).toMatch(/querySelector\('\.plg-ai-toolbar'\)/);
        expect(panel).toMatch(/addEventListener\('dblclick'/);
        expect(panel).not.toMatch(/\.plg-ai-thread-row[\s\S]{0,120}addEventListener\('dblclick'/);
        expect(panel).toMatch(/\[data-jp-panel-close\]/);
        expect(panel).toMatch(/setRect\(\{ x: null, y: null, w: resetRect\.w, h: resetRect\.h \}\)/);
        expect(panel).not.toMatch(/resetOnTitleDblclick: options/);
    });

    test('config tabLabel is AI Agent / KI-Agent', () => {
        expect(enConf).toMatch(/tabLabel:\s*'AI Agent'/);
        expect(deConf).toMatch(/tabLabel:\s*'KI-Agent'/);
        expect(enConf).not.toMatch(/tabLabel:\s*'AI',/);
        expect(deConf).not.toMatch(/tabLabel:\s*'KI',/);
    });

    test('apiListThreads filters husks then slices', () => {
        const src = fs.readFileSync(
            path.resolve(process.cwd(), 'plugins/ai-core/webapp/controller/aiCore.js'),
            'utf8'
        );
        const start = src.indexOf('static async apiListThreads');
        const body = src.slice(start, start + 1400);
        expect(body).toMatch(/limit: 100/);
        expect(body).toMatch(/threadIdsWithTurns/);
        expect(body).toMatch(/visible\.slice/);
        expect(body.indexOf('limit: 100')).toBeLessThan(body.indexOf('threadIdsWithTurns'));
        expect(body.indexOf('threadIdsWithTurns')).toBeLessThan(body.indexOf('visible.slice'));
    });
});

describe('1.0.12 /sources footer counts both families', () => {
    test('runSources lists images and does not use sources.length as the only count', () => {
        const body = fnBody('runSources');
        expect(body).toMatch(/state\.sources\.forEach/);
        expect(body).toMatch(/state\.images\.forEach/);
        expect(body).toMatch(/fillToken\(I18N\.slashSourcesCap, '%USED%', state\.sources\.length\)/);
        expect(body).toMatch(/'%MAX%'/);
        expect(body).toMatch(/I18N\.slashImagesCap.*state\.images\.length/);
        expect(body).not.toMatch(
            /slashSourcesCap\}: \$\{state\.sources\.length\} \/ \$\{cap\.maxSourcesPerConversation\}/
        );
        expect(enConf).toMatch(/sourcesCap:\s*'Sources: %USED% of %MAX% maximum'/);
        expect(enConf).toMatch(/imagesCap:\s*'Images'/);
        expect(deConf).toMatch(/sourcesCap:\s*'Quellen: %USED% von maximal %MAX%'/);
        expect(deConf).toMatch(/imagesCap:\s*'Bilder'/);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/regressions.test.js
