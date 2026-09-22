/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Attachments
 * @tagline         Sources, ingest, convert, images, and loop purity
 * @file            plugins/ai-core/webapp/tests/unit/attachments.test.js
 * @version         1.0.16
 * @release         2026-09-22
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
    extractSections,
    isSourceTextRead,
    pasteName,
    run,
    SOURCE_OPEN,
    wrapSourceText
} from '../../utils/ai-tools/sources.js';
import {
    clientFetchMessage,
    convertDocument,
    convertLimits,
    deleteStagedImage,
    deleteStagedThread,
    maxConvertBytesOf,
    maxImageBytesOf,
    ROUTE_MAX_BYTES,
    EMPTY_SHELL_MESSAGE,
    extractHtmlText,
    fetchAcceptList,
    appendManifestToUserContent,
    formatImagesBlock,
    formatSourcesBlock,
    formatSourcesEmptyBlock,
    formatTurnAttachmentManifest,
    ingestFetchedBody,
    isAllowedImageMime,
    isEmptyShell,
    listConverters,
    normalizeImageMime,
    redisImagesAvailable,
    sourceRefsFrom,
    stageImage,
    takeStagedImage,
    takeStagedImages,
    threadHasStagedImages
} from '../../utils/attachments/index.js';
import { collectStreamBody } from '../../utils/attachments/stream.js';
import { sourceToolDescriptors } from '../../utils/attachments/tools.js';
import { assemblePrompt } from '../../utils/agent/prompt.js';
import { followFromResult, openUserContent, refsForTurn } from '../../utils/agent/inputs.js';
import { gateModelsForVision } from '../../utils/agent/providers.js';
import {
    clearTools,
    createBudgetState,
    executeTool,
    registerTools,
    resolveTools
} from '../../utils/tools/index.js';
import { createHookManager, testActor } from './helpers.js';

afterEach(() => {
    clearTools();
    delete global.RedisManager;
    delete global.StreamBody;
});

const md = [
    '# Title',
    '',
    'Preamble text.',
    '',
    '## First section',
    '',
    'Hello world.',
    '',
    '## Second section',
    '',
    'More text here.'
].join('\n');

function memoryRedis() {
    const store = new Map();
    return {
        isRedisAvailable: () => true,
        async cacheSetObject(pathName, key, obj) {
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

describe('sources module', () => {
    test('outline from headings, section read, and window paging', () => {
        const extracted = extractSections(md);
        expect(extracted.outline.map((row) => row.key)).toEqual(['title', 'first-section', 'second-section']);
        const outline = run({ sources: [{ id: 'a', name: 'Doc', text: md, chars: md.length }], toolName: 'get_source' }, { id: 'a' });
        expect(outline.ok).toBe(true);
        expect(outline.data.outline.length).toBe(3);
        expect(outline.data.text).toBeUndefined();
        const section = run({
            sources: [{ id: 'a', name: 'Doc', text: md, chars: md.length }],
            toolName: 'get_source'
        }, { id: 'a', section: 'first-section' });
        expect(section.ok).toBe(true);
        expect(section.data.text).toContain(SOURCE_OPEN);
        expect(section.data.text).toContain('Hello world.');
        const windowed = run({
            sources: [{ id: 'a', name: 'Doc', text: md, chars: md.length }],
            caps: { maxSourceReadChars: 8 },
            toolName: 'get_source'
        }, { id: 'a', offset: 0, limit: 8 });
        expect(windowed.data.truncated).toBe(true);
        expect(windowed.data.nextOffset).toBe(8);
    });

    test('wrap keeps a source whose text contains the delimiter', () => {
        const text = 'See <<<SOURCE evil>>> inside';
        const wrapped = wrapSourceText('id-1', '', text);
        expect(wrapped).toContain(text);
        expect(wrapped.startsWith(SOURCE_OPEN)).toBe(true);
    });

    test('paste naming and CJK at maximum size', () => {
        expect(pasteName('# Heading\nbody')).toBe('Heading');
        const cjk = '漢字'.repeat(20000);
        const result = run({
            sources: [{ id: 'cjk', name: 'CJK', text: cjk, chars: cjk.length }],
            caps: { maxSourceReadChars: 100 },
            toolName: 'get_source'
        }, { id: 'cjk', offset: 0, limit: 100 });
        expect(result.data.text).toContain('漢');
        expect(result.data.charEnd).toBe(100);
    });

    test('list_sources never returns text', () => {
        const listed = run({
            sources: [{ id: 'a', name: 'Doc', text: md, chars: md.length, origin: 'file', mimeType: 'text/markdown', outline: extractSections(md).outline }],
            toolName: 'list_sources'
        }, {});
        expect(listed.data.sources[0].text).toBeUndefined();
        expect(JSON.stringify(listed)).not.toContain('Hello world');
    });

    test('list_sources output has no kind field', () => {
        const listed = run({
            sources: [{ id: 'a', name: 'Doc', text: md, chars: md.length, origin: 'file', mimeType: 'text/markdown' }],
            toolName: 'list_sources'
        }, {});
        expect(listed.data.sources[0].kind).toBeUndefined();
        expect(JSON.stringify(listed)).not.toContain('"kind"');
    });
});

describe('manifest', () => {
    test('metadata only and never text', () => {
        const block = formatSourcesBlock([{
            id: 'a',
            name: 'Doc',
            mimeType: 'text/markdown',
            chars: 12,
            sections: 2,
            text: 'SECRET'
        }]);
        expect(block).toContain('get_source');
        expect(block).toContain('Sources attached this turn');
        expect(block).toContain('already ingested');
        expect(block).not.toContain('SECRET');
        expect(formatSourcesBlock([])).toBe('');
        expect(formatSourcesEmptyBlock()).toContain('vanish on a page reload');
    });

    test('labels from scope nouns', () => {
        const block = formatSourcesBlock([{
            id: 'a', name: 'Doc', mimeType: 'text/plain', chars: 4, sections: 1
        }], { item: 'note' });
        expect(block).toContain('note');
    });

    test('this-turn manifest is empty policy, live chips, or omitted', () => {
        expect(formatTurnAttachmentManifest({
            sources: [],
            sourcesEnabled: true
        })).toBe(formatSourcesEmptyBlock());
        const live = formatTurnAttachmentManifest({
            sources: [{ id: 'b', name: 'test.txt', mimeType: 'text/plain', chars: 8, sections: 1, text: 'SECRET' }],
            images: [{ id: 'i', name: 'shot.png', width: 8, height: 6 }],
            sourcesEnabled: true,
            includeImages: true
        });
        expect(live).toContain('test.txt');
        expect(live).toContain('shot.png');
        expect(live).not.toContain('SECRET');
        expect(formatTurnAttachmentManifest({
            sources: [],
            images: [{ id: 'i', name: 'shot.png' }],
            sourcesEnabled: false,
            includeImages: false
        })).toBe('');
        expect(appendManifestToUserContent('hi', formatSourcesEmptyBlock())).toContain('hi');
    });
});

describe('budget', () => {
    test('outline listing is free; the N+1st text read is refused', async () => {
        registerTools(sourceToolDescriptors(), 'ai-core');
        const hooks = createHookManager({
            onAiScopeResolve: (ctx) => {
                ctx.scope = { canRead: true, canWrite: false, nouns: { item: 'item', container: 'scope' } };
            }
        });
        const offered = await resolveTools(testActor(), {
            hookManager: hooks,
            policy: { reviewedToolNames: [], disabledToolNames: [] },
            settings: { sourcesEnabled: true, maxSourceReadsPerTurn: 1 },
            hasSources: true
        });
        expect(offered.tools.map((t) => t.name)).toEqual(expect.arrayContaining(['get_source', 'list_sources']));
        const budgetState = createBudgetState();
        const outline = await executeTool({
            name: 'get_source',
            args: { id: 'a' },
            tool: offered.tools.find((t) => t.name === 'get_source'),
            actor: testActor(),
            scope: { canRead: true },
            budgetState,
            settings: { maxSourceReadsPerTurn: 1 },
            clientExecutor: async () => run({
                sources: [{ id: 'a', name: 'Doc', text: md, chars: md.length }],
                toolName: 'get_source'
            }, { id: 'a' })
        });
        expect(outline.ok).toBe(true);
        expect(isSourceTextRead({ id: 'a' })).toBe(false);
        const first = await executeTool({
            name: 'get_source',
            args: { id: 'a', section: 'first-section' },
            tool: offered.tools.find((t) => t.name === 'get_source'),
            actor: testActor(),
            scope: { canRead: true },
            budgetState,
            settings: { maxSourceReadsPerTurn: 1 },
            clientExecutor: async () => ({ ok: true, data: { text: 'x' } })
        });
        expect(first.ok).toBe(true);
        const second = await executeTool({
            name: 'get_source',
            args: { id: 'a', offset: 0 },
            tool: offered.tools.find((t) => t.name === 'get_source'),
            actor: testActor(),
            scope: { canRead: true },
            budgetState,
            settings: { maxSourceReadsPerTurn: 1 },
            clientExecutor: async () => ({ ok: true })
        });
        expect(second.ok).toBe(false);
        expect(second.code).toBe('AI_BUDGET_EXCEEDED');
    });
});

describe('ingest', () => {
    test('each UrlFetch code maps to a message', () => {
        expect(clientFetchMessage({ code: 'SCHEME_NOT_ALLOWED' })).toMatch(/http and https/i);
        expect(clientFetchMessage({ code: 'HOST_NOT_ALLOWED', details: { host: 'evil.test' } })).toContain('evil.test');
        expect(clientFetchMessage({ code: 'PRIVATE_ADDRESS' })).toMatch(/Private/);
        expect(clientFetchMessage({ code: 'RESPONSE_TOO_LARGE' })).toMatch(/size cap/);
        expect(clientFetchMessage({ code: 'CONTENT_TYPE_NOT_ALLOWED', details: { contentType: 'image/png' } })).toContain('image/png');
        expect(clientFetchMessage({ code: 'AI_SOURCE_EMPTY_SHELL' })).toBe(EMPTY_SHELL_MESSAGE);
    });

    test('HTML to markdown on a hand-written fixture', () => {
        const html = [
            '<html><head><title>Hello World | Example</title><script>alert(1)</script>',
            '<style>body{color:red}</style></head>',
            '<body><nav>Menu</nav><article><h1>Hello</h1><p>Body text.</p>',
            '<ul><li>One</li></ul></article></body></html>'
        ].join('');
        const extracted = extractHtmlText(html);
        expect(extracted.name).toBe('Hello World');
        expect(extracted.text).toContain('# Hello');
        expect(extracted.text).toContain('Body text.');
        expect(extracted.text).toContain('- One');
        expect(extracted.text).not.toContain('alert');
        expect(extracted.text).not.toContain('color:red');
        expect(extracted.text).not.toContain('Menu');
    });

    test('empty-shell verdict and provenance', () => {
        expect(isEmptyShell('nav', 20000)).toBe(true);
        expect(isEmptyShell('plenty of article text here', 600)).toBe(false);
        const ingested = ingestFetchedBody({
            success: true,
            text: 'plain body',
            contentType: 'text/plain',
            finalUrl: 'https://example.com/a.txt',
            sourceUrl: 'https://example.com/a.txt',
            bytes: 10,
            redirects: ['https://example.com/old']
        }, { maxSourceChars: 100 });
        expect(ingested.ok).toBe(true);
        expect(ingested.provenance.finalUrl).toBe('https://example.com/a.txt');
        expect(ingested.provenance.sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(ingested.provenance.redirects).toBe(1);
    });

    test('converter types widen the accept list only when registered', () => {
        const base = fetchAcceptList({ sourceMimeTypes: ['text/plain'] }, []);
        expect(base).toEqual(['text/plain']);
        const widened = fetchAcceptList({ sourceMimeTypes: ['text/plain'] }, [
            { plugin: 'pdf', mimeTypes: ['application/pdf'] }
        ]);
        expect(widened).toContain('application/pdf');
    });
});

describe('convert', () => {
    test('upload cap is independent of maxSourceChars (the 4 MB regression)', () => {
        const shipped = { maxSourceChars: 1000000 };
        expect(maxConvertBytesOf(shipped)).toBe(ROUTE_MAX_BYTES);
        expect(maxConvertBytesOf({})).toBe(26214400);
        expect(maxConvertBytesOf({ maxConvertBytes: 2 * 1024 * 1024 })).toBe(2 * 1024 * 1024);
        expect(maxConvertBytesOf({ maxConvertBytes: 40 * 1024 * 1024 })).toBe(ROUTE_MAX_BYTES);
        expect(maxImageBytesOf({ maxImageBytes: 10 * 1024 * 1024 })).toBe(10 * 1024 * 1024);
        expect(maxImageBytesOf({ maxImageBytes: 40 * 1024 * 1024 })).toBe(ROUTE_MAX_BYTES);
    });

    test('a 25 MB convert is accepted at the shipped char cap; a lowered byte cap 413s', async () => {
        const seen = [];
        global.StreamBody = {
            async pipe(_req, res, dest, options) {
                seen.push(options.maxBytes);
                const declared = Number(_req.headers['content-length']);
                if (declared > options.maxBytes) {
                    res.statusCode = 413;
                    res.body = {
                        success: false,
                        code: 'PAYLOAD_TOO_LARGE',
                        error: 'Request body too large',
                        details: { limit: options.maxBytes, length: declared }
                    };
                    return null;
                }
                dest.write(Buffer.from('ok'));
                dest.end();
                return declared;
            }
        };
        const shipped = maxConvertBytesOf({ maxSourceChars: 1000000 });
        const okRes = {};
        const accepted = await collectStreamBody(
            { headers: { 'content-length': String(20 * 1024 * 1024) } },
            okRes,
            shipped
        );
        expect(accepted.length).toBe(2);
        expect(seen[0]).toBe(26214400);
        const lowered = maxConvertBytesOf({ maxConvertBytes: 1048576 });
        const refuseRes = { statusCode: 0, body: null };
        const refused = await collectStreamBody(
            { headers: { 'content-length': String(2 * 1024 * 1024) } },
            refuseRes,
            lowered
        );
        expect(refused).toBe(null);
        expect(refuseRes.statusCode).toBe(413);
        expect(JSON.stringify(refuseRes.body)).toContain('1048576');
        delete global.StreamBody;
    });

    test('cap merge, ordered retry, empty extract, and undefined hooks', async () => {
        const limits = convertLimits({ maxConvertPages: 10, maxSourceChars: 50 }, { maxPages: 3, unitLabel: 'page' });
        expect(limits.maxPages).toBe(3);
        expect(limits.maxChars).toBe(50);
        const none = await listConverters(createHookManager());
        expect(none).toEqual([]);
        const empty = await convertDocument({
            bytes: Buffer.from('x'),
            mimeType: 'application/pdf',
            name: 'scan.pdf',
            converters: [{ plugin: 'pdf', mimeTypes: ['application/pdf'] }],
            hookManager: createHookManager({
                'onDocumentConvert:pdf': (ctx) => {
                    ctx.meta = { empty: true, emptyCode: 'no-text-layer', emptyReason: 'no text layer' };
                }
            })
        });
        expect(empty.ok).toBe(false);
        expect(empty.code).toBe('AI_SOURCE_SCAN');
        expect(empty.error).toMatch(/no text layer/);
        expect(empty.error).not.toMatch(/paste/i);
        const retried = await convertDocument({
            bytes: Buffer.from('x'),
            mimeType: 'application/pdf',
            name: 'scan.pdf',
            converters: [
                { plugin: 'extract', mimeTypes: ['application/pdf'] },
                { plugin: 'ocr', mimeTypes: ['application/pdf'] }
            ],
            hookManager: createHookManager({
                'onDocumentConvert:extract': (ctx) => {
                    ctx.text = '';
                    ctx.meta = { empty: true };
                },
                'onDocumentConvert:ocr': (ctx) => {
                    ctx.markdown = 'Recovered text';
                }
            })
        });
        expect(retried.ok).toBe(true);
        expect(retried.text).toBe('Recovered text');
        expect(retried.plugin).toBe('ocr');
        const clipped = await convertDocument({
            bytes: Buffer.from('x'),
            mimeType: 'application/pdf',
            name: 'big.pdf',
            settings: { maxSourceChars: 5, maxConvertBytes: 26214400 },
            converters: [{ plugin: 'pdf', mimeTypes: ['application/pdf'] }],
            hookManager: createHookManager({
                'onDocumentConvert:pdf': (ctx) => {
                    ctx.markdown = '0123456789';
                }
            })
        });
        expect(clipped.text).toBe('01234');
        expect(clipped.truncatedBy).toBe('chars');
        expect(clipped.limit).toBe(5);
    });
});

describe('images', () => {
    test('MIME normalization, peek, and Redis absent', async () => {
        expect(normalizeImageMime('image/jpg')).toBe('image/jpeg');
        expect(isAllowedImageMime('image/png')).toBe(true);
        expect(isAllowedImageMime('application/pdf')).toBe(false);
        expect(redisImagesAvailable(null)).toBe(false);
        const redis = memoryRedis();
        await stageImage('jdoe', 't1', 'img-1', { data: 'abc', mimeType: 'image/png', name: 'a.png' }, {}, redis);
        const first = await takeStagedImage('jdoe', 't1', 'img-1', redis);
        expect(first.data).toBe('abc');
        const second = await takeStagedImage('jdoe', 't1', 'img-1', redis);
        expect(second.data).toBe('abc');
    });

    test('send-time gating uses the thread model; content parts stay in order', async () => {
        const menu = gateModelsForVision([
            { provider: 'ai-mock', model: 'mock-echo', capabilities: { vision: false } },
            { provider: 'ai-mock', model: 'mock-vision', capabilities: { vision: true } }
        ], { hasImages: true });
        expect(menu[0].available).toBe(false);
        expect(menu[1].available).not.toBe(false);
        const redis = memoryRedis();
        await stageImage('jdoe', 't1', 'img-1', { data: 'abc', mimeType: 'image/png', name: 'shot.png' }, {}, redis);
        const parts = await openUserContent({
            userText: 'What is this?',
            images: [{ id: 'img-1', name: 'shot.png', mimeType: 'image/png', width: 10, height: 8 }],
            actor: testActor(),
            threadId: 't1',
            redisManager: redis
        }, { imagesEnabled: true }, { capabilities: { vision: true } });
        expect(Array.isArray(parts)).toBe(true);
        expect(parts[0].type).toBe('text');
        expect(parts[0].text).toContain('What is this?');
        expect(parts[0].text).toContain('Images attached to this turn');
        expect(parts[0].text).toContain('shot.png');
        expect(parts[1].type).toBe('text');
        expect(parts[2].type).toBe('image');
        expect(parts[2].data).toBe('abc');
        const gated = await openUserContent({
            userText: 'What is this?',
            images: [{ id: 'img-1' }],
            actor: testActor(),
            threadId: 't1',
            redisManager: redis
        }, { imagesEnabled: true, sourcesEnabled: false }, { capabilities: { vision: false } });
        expect(gated).toBe('What is this?');
    });

    test('deleteStagedThread removes the index and each image', async () => {
        const redis = memoryRedis();
        await stageImage('jdoe', 't1', 'img-1', { data: 'x', mimeType: 'image/png' }, {}, redis);
        await stageImage('jdoe', 't1', 'img-2', { data: 'y', mimeType: 'image/png' }, {}, redis);
        expect(await deleteStagedThread('jdoe', 't1', redis)).toBe(2);
        expect(await takeStagedImage('jdoe', 't1', 'img-1', redis)).toBe(null);
        expect(await deleteStagedThread('jdoe', 't1', redis)).toBe(0);
    });

    test('takeStagedImages peeks and leaves the mailbox', async () => {
        const redis = memoryRedis();
        await stageImage('jdoe', 't1', 'img-1', { data: 'x', mimeType: 'image/png' }, {}, redis);
        const taken = await takeStagedImages('jdoe', 't1', [{ id: 'img-1', name: 'x' }], redis);
        expect(taken[0].data).toBe('x');
        expect((await takeStagedImage('jdoe', 't1', 'img-1', redis)).data).toBe('x');
        expect(await threadHasStagedImages('jdoe', 't1', redis)).toBe(true);
    });

    test('a follow-up openUserContent still sees the picture', async () => {
        const redis = memoryRedis();
        await stageImage('jdoe', 't1', 'img-1', { data: 'abc', mimeType: 'image/png', name: 'shot.png' }, {}, redis);
        const first = await openUserContent({
            userText: 'Look',
            images: [{ id: 'img-1', name: 'shot.png', mimeType: 'image/png', width: 10, height: 8 }],
            actor: testActor(),
            threadId: 't1',
            redisManager: redis
        }, { imagesEnabled: true }, { capabilities: { vision: true } });
        const second = await openUserContent({
            userText: 'Again',
            images: [{ id: 'img-1', name: 'shot.png', mimeType: 'image/png', width: 10, height: 8 }],
            actor: testActor(),
            threadId: 't1',
            redisManager: redis
        }, { imagesEnabled: true }, { capabilities: { vision: true } });
        expect(first.find((part) => part.type === 'image').data).toBe('abc');
        expect(second.find((part) => part.type === 'image').data).toBe('abc');
        expect(second[0].text).toContain('Again');
    });

    test('deleteStagedImage removes one image and leaves the sibling', async () => {
        const redis = memoryRedis();
        await stageImage('jdoe', 't1', 'img-1', { data: 'x', mimeType: 'image/png' }, {}, redis);
        await stageImage('jdoe', 't1', 'img-2', { data: 'y', mimeType: 'image/png' }, {}, redis);
        await deleteStagedImage('jdoe', 't1', 'img-1', redis);
        expect(await takeStagedImage('jdoe', 't1', 'img-1', redis)).toBe(null);
        expect((await takeStagedImage('jdoe', 't1', 'img-2', redis)).data).toBe('y');
        expect(await threadHasStagedImages('jdoe', 't1', redis)).toBe(true);
        await deleteStagedImage('jdoe', 't1', 'img-2', redis);
        expect(await threadHasStagedImages('jdoe', 't1', redis)).toBe(false);
    });

    test('delete after peek removes bytes a later send would have used', async () => {
        const redis = memoryRedis();
        await stageImage('jdoe', 't1', 'img-1', { data: 'abc', mimeType: 'image/png', name: 'shot.png' }, {}, redis);
        await takeStagedImages('jdoe', 't1', [{ id: 'img-1' }], redis);
        await deleteStagedImage('jdoe', 't1', 'img-1', redis);
        const after = await openUserContent({
            userText: 'Gone',
            images: [{ id: 'img-1', name: 'shot.png', mimeType: 'image/png' }],
            actor: testActor(),
            threadId: 't1',
            redisManager: redis
        }, { imagesEnabled: true }, { capabilities: { vision: true } });
        const imagePart = Array.isArray(after) ? after.find((part) => part.type === 'image') : null;
        expect(imagePart).toBeFalsy();
        expect(String(Array.isArray(after) ? after[0].text : after)).toContain('Gone');
    });
});

describe('data.media', () => {
    test('lifted out of data; tool-result stays text-only', async () => {
        registerTools({
            name: 'get_photo',
            description: 'Photo',
            schema: { type: 'object', properties: {} },
            requires: null
        }, 'site');
        const hooks = createHookManager({
            'onAiToolExecute:site': (ctx) => {
                ctx.result = {
                    ok: true,
                    data: {
                        label: 'front',
                        media: [{ type: 'image', mimeType: 'image/png', data: 'abc', name: 'front.png' }]
                    },
                    summary: 'get_photo'
                };
            }
        });
        const result = await executeTool({
            name: 'get_photo',
            actor: testActor(),
            budgetState: createBudgetState(),
            hookManager: hooks
        });
        expect(result.data.media).toBeUndefined();
        expect(result.data.label).toBe('front');
        expect(result.media[0].data).toBe('abc');
        const extra = followFromResult(result);
        expect(extra.role).toBe('user');
        expect(extra.content[0].type).toBe('image');
    });
});

describe('prompt and refs', () => {
    test('live list is on this turn\'s user message; earlier names are stale', async () => {
        const empty = await assemblePrompt({
            actor: testActor(),
            scope: { nouns: { item: 'item', container: 'scope' } },
            tools: [],
            sources: [],
            hookManager: createHookManager()
        });
        expect(empty.system).not.toMatch(/Sources attached/);
        expect(empty.system).toContain('earlier replies are stale');
        const noneAttached = await assemblePrompt({
            actor: testActor(),
            scope: { nouns: { item: 'item', container: 'scope' } },
            tools: [],
            withheld: [
                { name: 'list_sources', reason: 'no-sources' },
                { name: 'get_source', reason: 'no-sources' }
            ],
            sources: [],
            hookManager: createHookManager()
        });
        expect(noneAttached.system).not.toContain('vanish on a page reload');
        const withSrc = await assemblePrompt({
            actor: testActor(),
            scope: { nouns: { item: 'note', container: 'scope' } },
            tools: [{ name: 'get_source' }],
            sources: [{ id: 'a', name: 'Copyright.txt', mimeType: 'text/plain', chars: 419, sections: 1, text: 'NOPE' }],
            hookManager: createHookManager()
        });
        expect(withSrc.system).not.toContain('Copyright.txt');
        expect(withSrc.system).not.toContain('NOPE');
        expect(withSrc.system).toContain('earlier replies are stale');
        const listed = await openUserContent({
            userText: 'check again, you should see the test.txt file',
            sources: [{ id: 'b', name: 'test.txt', mimeType: 'text/plain', chars: 399, sections: 1, text: 'SECRET' }],
            actor: testActor(),
            scope: { nouns: { item: 'note', container: 'scope' } }
        }, { sourcesEnabled: true }, {});
        expect(listed).toContain('check again, you should see the test.txt file');
        expect(listed).toContain('Sources attached this turn');
        expect(listed).toContain('test.txt');
        expect(listed).toContain('note');
        expect(listed).not.toContain('SECRET');
        expect(listed).not.toContain('Copyright.txt');
        const emptyUser = await openUserContent({
            userText: '/sources',
            sources: [],
            actor: testActor()
        }, { sourcesEnabled: true }, {});
        expect(emptyUser).toContain('/sources');
        expect(emptyUser).toContain('vanish on a page reload');
        expect(emptyUser).toContain('Filenames in earlier replies are stale');
        expect(formatImagesBlock([{ id: 'i', name: 'shot', mimeType: 'image/png', width: 8, height: 6 }])).toContain('8×6');
        const refs = refsForTurn({
            sources: [{ id: 'a', name: 'Doc', origin: 'file', mimeType: 'text/plain', text: 'secret' }],
            images: [{ id: 'i', name: 'shot', mimeType: 'image/png' }]
        });
        expect(JSON.stringify(refs)).not.toContain('secret');
        expect(sourceRefsFrom(refs.sourceRefs).length).toBeGreaterThan(0);
    });
});

describe('opt-in and loop purity', () => {
    test('sources disabled or empty withhold the tools', async () => {
        registerTools(sourceToolDescriptors(), 'ai-core');
        const hooks = createHookManager({
            onAiScopeResolve: (ctx) => {
                ctx.scope = { canRead: true };
            }
        });
        const off = await resolveTools(testActor(), {
            hookManager: hooks,
            policy: {},
            settings: { sourcesEnabled: false },
            hasSources: true
        });
        expect(off.tools.map((t) => t.name)).not.toContain('get_source');
        const empty = await resolveTools(testActor(), {
            hookManager: hooks,
            policy: {},
            settings: { sourcesEnabled: true },
            hasSources: false
        });
        expect(empty.withheld.some((row) => row.reason === 'no-sources')).toBe(true);
    });

    test('panel handle is attachments() with kind, not sources/images/sourceFile', () => {
        const text = fs.readFileSync(
            path.resolve(process.cwd(), 'plugins/ai-core/webapp/view/jpulse-common.js'),
            'utf8'
        );
        expect(text).toMatch(/handle\.attachments = /);
        expect(text).toMatch(/handle\.attachmentFile = /);
        expect(text).toMatch(/kind: 'source'/);
        expect(text).toMatch(/kind: 'image'/);
        expect(text).toMatch(/origin: \(opts && opts\.origin\) \|\| 'file'/);
        expect(text).toMatch(/origin: 'paste'/);
        expect(text).not.toMatch(/handle\.sources = /);
        expect(text).not.toMatch(/handle\.images = /);
        expect(text).not.toMatch(/handle\.sourceFile = /);
        expect(text).not.toMatch(/sourceAttachable/);
    });

    test('turnLoop.js contains no attachment vocabulary', () => {
        const text = fs.readFileSync(
            path.resolve(process.cwd(), 'plugins/ai-core/webapp/utils/agent/turnLoop.js'),
            'utf8'
        );
        expect(text).not.toMatch(/mimeType|base64|<<<SOURCE|cacheSetObject|Redis|image\/png/);
        expect(text).toMatch(/content: userContent/);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/attachments.test.js
