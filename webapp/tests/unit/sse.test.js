/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / SSE
 * @tagline         POST+SSE HTTP events do not abort the turn
 * @file            plugins/ai-core/webapp/tests/unit/sse.test.js
 * @version         1.0.2
 * @release         2026-09-17
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { EventEmitter } from 'events';
import { afterEach, describe, expect, test } from '@jest/globals';
import { clearAllCancels, isCancelRequested } from '../../utils/agent/cancel.js';
import { openSseTurn } from '../../utils/transport/sse.js';

afterEach(() => {
    clearAllCancels();
});

function mockReq() {
    const req = new EventEmitter();
    req.socket = new EventEmitter();
    return req;
}

function mockRes() {
    const res = new EventEmitter();
    res.statusCode = 200;
    res.writableEnded = false;
    res.headers = {};
    res.chunks = [];
    res.setHeader = (key, value) => {
        res.headers[key] = value;
    };
    res.flushHeaders = () => {};
    res.write = (chunk) => {
        res.chunks.push(chunk);
        return true;
    };
    res.end = () => {
        if (res.writableEnded) {
            return;
        }
        res.writableEnded = true;
        res.emit('close');
    };
    return res;
}

describe('openSseTurn', () => {
    test('writes an opening comment so the stream is live', () => {
        const req = mockReq();
        const res = mockRes();
        const { close } = openSseTurn(req, res, 'thread-sse');
        expect(res.chunks.some(chunk => String(chunk).includes(': connected'))).toBe(true);
        close();
    });

    test('request close after the POST body does not abort the turn', () => {
        const req = mockReq();
        const res = mockRes();
        const { abortSignal, close } = openSseTurn(req, res, 'thread-sse');
        req.emit('close');
        expect(abortSignal.aborted).toBe(false);
        expect(isCancelRequested('thread-sse')).toBe(false);
        expect(res.writableEnded).toBe(false);
        close();
    });

    test('response close after headers does not abort the turn', () => {
        const req = mockReq();
        const res = mockRes();
        const { abortSignal, close } = openSseTurn(req, res, 'thread-sse');
        res.emit('close');
        expect(abortSignal.aborted).toBe(false);
        expect(isCancelRequested('thread-sse')).toBe(false);
        expect(res.writableEnded).toBe(false);
        close();
    });

    test('socket close after the POST body does not abort the turn', () => {
        const req = mockReq();
        const res = mockRes();
        const { abortSignal, close } = openSseTurn(req, res, 'thread-sse');
        req.socket.emit('close');
        expect(abortSignal.aborted).toBe(false);
        expect(isCancelRequested('thread-sse')).toBe(false);
        expect(res.writableEnded).toBe(false);
        close();
    });

    test('request aborted after the POST body does not abort the turn', () => {
        const req = mockReq();
        const res = mockRes();
        const { abortSignal, close } = openSseTurn(req, res, 'thread-sse');
        req.emit('aborted');
        expect(abortSignal.aborted).toBe(false);
        expect(isCancelRequested('thread-sse')).toBe(false);
        expect(res.writableEnded).toBe(false);
        close();
    });

    test('real Express POST+SSE does not abort after the body is read', async () => {
        const express = (await import('express')).default;
        const http = await import('http');
        const app = express();
        app.use(express.json());
        let abortSignal;
        let close;
        app.post('/turn', (req, res) => {
            ({ abortSignal, close } = openSseTurn(req, res, 'thread-http'));
        });
        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        const port = server.address().port;
        const chunks = [];
        await new Promise((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port,
                path: '/turn',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, (res) => {
                res.on('data', (chunk) => chunks.push(chunk.toString()));
                res.on('error', reject);
            });
            req.on('error', reject);
            req.end(JSON.stringify({ text: '[mock:hang:20000]' }));
            setTimeout(() => {
                try {
                    expect(chunks.join('')).toContain(': connected');
                    expect(abortSignal.aborted).toBe(false);
                    expect(isCancelRequested('thread-http')).toBe(false);
                    close();
                    server.close();
                    resolve();
                } catch (error) {
                    close?.();
                    server.close();
                    reject(error);
                }
            }, 120);
        });
    });
});

// EOF plugins/ai-core/webapp/tests/unit/sse.test.js
