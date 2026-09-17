/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / WS Bridge
 * @tagline         Namespace authorization and client-host mapping
 * @file            plugins/ai-core/webapp/tests/unit/ws-bridge.test.js
 * @version         1.0.4
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import { chooseTransport } from '../../utils/transport/index.js';
import { authorizeAiSocket, executeClientTool, mapClientReply } from '../../utils/transport/ws.js';
import {
    AI_CLIENT_HOST,
    AI_RESULT_TOO_LARGE,
    clearTools,
    createBudgetState,
    executeTool,
    registerTools,
    RESULT_SIZE_CAP,
    stripMedia
} from '../../utils/tools/index.js';
import { testActor } from './helpers.js';

const schema = { type: 'object', properties: {} };

function settings(extra = {}) {
    return {
        enabled: true,
        allowedRoles: ['user', 'admin'],
        ...extra
    };
}

function threadModel(doc) {
    return {
        async findById() {
            return doc;
        }
    };
}

afterEach(() => {
    clearTools();
});

describe('AI WebSocket authorization', () => {
    test('owner is accepted with a resolved ctx', async () => {
        const ctx = await authorizeAiSocket(
            { user: { username: 'jdoe', roles: ['user'] } },
            { params: { threadId: 't1' } },
            {
                loadSettings: async () => settings(),
                threadModel: threadModel({
                    _id: 't1',
                    createdBy: 'jdoe',
                    scopeType: 'doc',
                    scopeId: 'd1'
                })
            }
        );
        expect(ctx.username).toBe('jdoe');
        expect(ctx.threadId).toBe('t1');
        expect(ctx.createdBy).toBe('jdoe');
    });

    test('non-owner is refused before the upgrade', async () => {
        const ctx = await authorizeAiSocket(
            { user: { username: 'other', roles: ['user'] } },
            { params: { threadId: 't1' } },
            {
                loadSettings: async () => settings(),
                threadModel: threadModel({ _id: 't1', createdBy: 'jdoe' })
            }
        );
        expect(ctx).toBeNull();
    });

    test('unknown thread is refused', async () => {
        const ctx = await authorizeAiSocket(
            { user: { username: 'jdoe', roles: ['user'] } },
            { params: { threadId: 'missing' } },
            {
                loadSettings: async () => settings(),
                threadModel: threadModel(null)
            }
        );
        expect(ctx).toBeNull();
    });

    test('disabled AI is refused', async () => {
        const ctx = await authorizeAiSocket(
            { user: { username: 'jdoe', roles: ['user'] } },
            { params: { threadId: 't1' } },
            {
                loadSettings: async () => settings({ enabled: false }),
                threadModel: threadModel({ _id: 't1', createdBy: 'jdoe' })
            }
        );
        expect(ctx).toBeNull();
    });

    test('wrong role is refused', async () => {
        const ctx = await authorizeAiSocket(
            { user: { username: 'jdoe', roles: ['guest'] } },
            { params: { threadId: 't1' } },
            {
                loadSettings: async () => settings(),
                threadModel: threadModel({ _id: 't1', createdBy: 'jdoe' })
            }
        );
        expect(ctx).toBeNull();
    });
});

describe('client-host bridge', () => {
    test('fake request executes a client tool', async () => {
        const result = await executeClientTool({
            clientId: 'c1',
            nsPath: '/api/1/ws/ai/t1',
            name: 'read_draft',
            args: {},
            request: async () => ({ success: true, data: { ok: true, data: { words: 3 }, summary: 'ok' } })
        });
        expect(result.ok).toBe(true);
        expect(result.data.words).toBe(3);
        expect(result.stall).toBe(false);
    });

    test('NOT_CONNECTED and CONNECTION_LOST set stall', () => {
        expect(mapClientReply({ success: false, code: 'NOT_CONNECTED' }).stall).toBe(true);
        expect(mapClientReply({ success: false, code: 'CONNECTION_LOST' }).stall).toBe(true);
    });

    test('REQUEST_TIMEOUT does not set stall', () => {
        const result = mapClientReply({ success: false, code: 'REQUEST_TIMEOUT' });
        expect(result.ok).toBe(false);
        expect(result.stall).toBe(false);
        expect(result.hint).toMatch(/narrow|retry/i);
    });

    test('oversize reply is AI_RESULT_TOO_LARGE', () => {
        expect(mapClientReply({ success: false, code: 'MESSAGE_TOO_LARGE' }).code).toBe(AI_RESULT_TOO_LARGE);
        expect(mapClientReply({ success: false, code: AI_RESULT_TOO_LARGE }).code).toBe(AI_RESULT_TOO_LARGE);
    });

    test('media is stripped and the size cap applies to client results', async () => {
        registerTools({
            name: 'read_view',
            description: 'View',
            schema,
            host: 'client',
            requires: null
        }, 'site');
        const result = await executeTool({
            name: 'read_view',
            actor: testActor(),
            budgetState: createBudgetState(),
            clientExecutor: async () => ({
                ok: true,
                data: { blob: 'x'.repeat(RESULT_SIZE_CAP) },
                media: { mime: 'image/png' }
            })
        });
        expect(result.code).toBe(AI_RESULT_TOO_LARGE);
        expect(result.media).toBe(null);
        const small = await executeTool({
            name: 'read_view',
            actor: testActor(),
            budgetState: createBudgetState(),
            clientExecutor: async () => ({
                ok: true,
                data: { n: 1 },
                media: { mime: 'image/png' }
            })
        });
        expect(small.ok).toBe(true);
        expect(small.media).toBe(null);
        expect(stripMedia({ ok: true, media: { x: 1 } }).media).toBe(null);
    });

    test('gates deny a client tool with no round trip', async () => {
        let called = 0;
        registerTools({
            name: 'append_draft',
            description: 'Append',
            schema,
            host: 'client',
            requires: 'scope:write',
            mutates: true
        }, 'site');
        const result = await executeTool({
            name: 'append_draft',
            actor: testActor(),
            scope: { canRead: true, canWrite: false },
            budgetState: createBudgetState(),
            clientExecutor: async () => {
                called += 1;
                return { ok: true };
            }
        });
        expect(result.code).toBe('AI_CAPABILITY_DENIED');
        expect(called).toBe(0);
    });

    test('HTTP path without an executor still answers AI_CLIENT_HOST', async () => {
        registerTools({
            name: 'read_view',
            description: 'View',
            schema,
            host: 'client',
            requires: null
        }, 'site');
        const result = await executeTool({
            name: 'read_view',
            actor: testActor(),
            budgetState: createBudgetState()
        });
        expect(result.code).toBe(AI_CLIENT_HOST);
        expect(chooseTransport([{ host: 'server' }])).toBe('http');
        expect(chooseTransport([{ host: 'client' }])).toBe('ws');
    });
});

// EOF plugins/ai-core/webapp/tests/unit/ws-bridge.test.js
