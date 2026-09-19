/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Panel Strip
 * @tagline         Chip lifetime, mailbox delete routes, and send-time strip contracts
 * @file            plugins/ai-core/webapp/tests/unit/panel-strip.test.js
 * @version         1.0.9
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
import AiCoreController from '../../controller/aiCore.js';

const panelPath = path.resolve(process.cwd(), 'plugins/ai-core/webapp/view/jpulse-common.js');
const panel = fs.readFileSync(panelPath, 'utf8');

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

describe('panel strip lifetime', () => {
    test('sendText does not consume image or source chips', () => {
        const body = fnBody('sendText');
        expect(body).toMatch(/transport\.startTurn/);
        expect(body).toMatch(/body\.images = state\.images\.map/);
        expect(body).toMatch(/body\.sources = state\.sources\.map/);
        expect(body).not.toMatch(/state\.images = \[\]/);
        expect(body).not.toMatch(/state\.sources = \[\]/);
        expect(body).not.toMatch(/renderStrip\(\)/);
        expect(body).not.toMatch(/clearAttachments\(\)/);
    });

    test('clearAttachments wipes both families and deletes the thread mailbox', () => {
        const body = fnBody('clearAttachments');
        expect(body).toMatch(/state\.sources = \[\]/);
        expect(body).toMatch(/state\.images = \[\]/);
        expect(body).toMatch(/panelStore\.files\.clear\(\)/);
        expect(body).toMatch(/\/api\/1\/ai\/thread\/\$\{encodeURIComponent\(threadId\)\}\/images/);
        expect(body).toMatch(/jPulse\.api\.delete/);
    });

    test('openThread and createNew clear attachments only on a real switch', () => {
        const open = fnBody('openThread');
        expect(open).toMatch(/if \(!sameThread\) \{\s*await clearAttachments\(\);/);
        const create = fnBody('createNew');
        expect(create).toMatch(/await clearAttachments\(\)/);
    });

    test('image ✕ deletes that mailbox key and keeps sources', () => {
        expect(panel).toMatch(/data-remove-img/);
        expect(panel).toMatch(/state\.images = state\.images\.filter/);
        expect(panel).toMatch(/\/image\/\$\{encodeURIComponent\(id\)\}/);
        expect(panel).not.toMatch(/state\.sources = \[\][\s\S]{0,80}data-remove-img/);
    });

    test('handle.attachments still lists both families from live state', () => {
        expect(panel).toMatch(
            /return state\.sources\.map\(sourceMeta\)\.concat\(state\.images\.map\(imageMeta\)\)/
        );
        expect(panel).toMatch(/attachmentFile:\s*function \(id\)/);
        expect(panel).toMatch(/panelStore\.files\.get\(id\)/);
    });

    test('attachments() is the only list; 1.0.4 names stay gone', () => {
        expect(panel).not.toMatch(/handle\.sources\s*=/);
        expect(panel).not.toMatch(/handle\.images\s*=/);
        expect(panel).not.toMatch(/sourceFile:\s*function/);
        expect(panel).toMatch(/attachments:\s*function \(\)/);
    });
});

describe('mailbox delete routes', () => {
    test('controller publishes owned delete routes next to stage', () => {
        const routes = AiCoreController.routes;
        expect(routes).toEqual(expect.arrayContaining([
            expect.objectContaining({
                method: 'POST',
                path: '/api/1/ai/image/stage',
                handler: 'apiStageImage'
            }),
            expect.objectContaining({
                method: 'DELETE',
                path: '/api/1/ai/thread/:id/image/:imageId',
                handler: 'apiDeleteStagedImage',
                auth: 'user'
            }),
            expect.objectContaining({
                method: 'DELETE',
                path: '/api/1/ai/thread/:id/images',
                handler: 'apiDeleteStagedImages',
                auth: 'user'
            })
        ]));
        expect(typeof AiCoreController.apiDeleteStagedImage).toBe('function');
        expect(typeof AiCoreController.apiDeleteStagedImages).toBe('function');
    });

    test('delete handlers require an owned thread', () => {
        const src = fs.readFileSync(
            path.resolve(process.cwd(), 'plugins/ai-core/webapp/controller/aiCore.js'),
            'utf8'
        );
        expect(src).toMatch(/static async apiDeleteStagedImage[\s\S]*_ownedThread[\s\S]*deleteStagedImage/);
        expect(src).toMatch(/static async apiDeleteStagedImages[\s\S]*_ownedThread[\s\S]*deleteStagedThread/);
        expect(src).toMatch(/AI_THREAD_FORBIDDEN/);
    });
});

describe('prior strip regressions stay closed', () => {
    test('compose paste of text stays in the box', () => {
        expect(panel).not.toMatch(/text\.length > 400/);
        expect(panel).toMatch(/clipboardData\.files/);
    });

    test('rename Enter stops before saveRename', () => {
        expect(panel).toMatch(
            /if \(event\.key === 'Enter'\) \{\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*saveRename\(\);/
        );
    });

    test('destroy closes the socket and removes the node', () => {
        const body = fnBody('destroy');
        expect(body).toMatch(/transport\.disconnect\(\)/);
        expect(body).toMatch(/removeChild\(root\)/);
    });

    test('create forwards title and the three shell keys', () => {
        expect(panel).toMatch(/typeof options\.title === 'string'/);
        expect(panel).toMatch(/storageKey: options\.storageKey/);
        expect(panel).toMatch(/cascade: options\.cascade/);
        expect(panel).toMatch(/group: options\.group/);
        expect(panel).not.toMatch(/\.\.\.options/);
    });

    test('source ✕ does not delete the image mailbox', () => {
        const start = panel.indexOf("const removeSrc = event.target.closest('[data-remove]')");
        const img = panel.indexOf('if (removeImg)', start);
        const srcBranch = panel.slice(start, img);
        expect(srcBranch).toMatch(/state\.sources = state\.sources\.filter/);
        expect(srcBranch).toMatch(/panelStore\.files\.delete\(id\)/);
        expect(srcBranch).not.toMatch(/\/image\//);
        expect(srcBranch).not.toMatch(/\/images/);
        expect(srcBranch).not.toMatch(/jPulse\.api\.delete/);
    });

    test('same-thread openThread does not wipe the strip', () => {
        const open = fnBody('openThread');
        expect(open).toMatch(/const sameThread = String\(threadId \|\| ''\) === state\.threadId/);
        expect(open).toMatch(/if \(!sameThread\) \{\s*await clearAttachments\(\);/);
        expect(open).not.toMatch(/await clearAttachments\(\);\s*state\.threadId/);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/panel-strip.test.js
