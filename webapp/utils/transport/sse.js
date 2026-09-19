/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Transport / SSE
 * @tagline         HTTP Server-Sent Events for a turn
 * @description     Live emit sink and heartbeat; cancel is POST /cancel, not HTTP close
 * @file            plugins/ai-core/webapp/utils/transport/sse.js
 * @version         1.0.9
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { attachTurnAbort, detachTurnAbort } from '../agent/cancel.js';

export const SSE_HEARTBEAT_MS = 15000;

/**
 * @param {object} res
 */
export function writeSseHeaders(res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
    }
}

/**
 * @param {object} res
 * @param {object} event
 */
export function writeSseEvent(res, event) {
    if (res.writableEnded) {
        return false;
    }
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    return true;
}

export function writeSseComment(res, text) {
    if (res.writableEnded) {
        return false;
    }
    res.write(`: ${text}\n\n`);
    return true;
}

/**
 * @param {object} req
 * @param {object} res
 * @param {string} threadId
 * @param {object} [options]
 * @returns {{ sink: Function, close: Function }}
 */
export function openSseTurn(req, res, threadId, options = {}) {
    writeSseHeaders(res);
    const heartbeatMs = options.heartbeatMs == null ? SSE_HEARTBEAT_MS : options.heartbeatMs;
    let closed = false;
    const abort = options.abortController || new AbortController();
    attachTurnAbort(threadId, abort);
    const heartbeat = heartbeatMs > 0
        ? setInterval(() => writeSseComment(res, 'ping'), heartbeatMs)
        : null;

    const close = () => {
        if (closed) {
            return;
        }
        closed = true;
        detachTurnAbort(threadId, abort);
        if (heartbeat) {
            clearInterval(heartbeat);
        }
        if (!abort.signal.aborted) {
            abort.abort();
        }
        if (!res.writableEnded) {
            res.end();
        }
    };

    // POST+SSE in Node 24 fires req/res 'close', and often 'aborted' or
    // socket 'close', when the JSON body is consumed — not when the client
    // drops. Auto-abort here would cancel every provider that honors
    // abortSignal. Hang and live providers wait until POST /cancel or timeout.
    writeSseComment(res, 'connected');

    const sink = (event) => {
        writeSseEvent(res, event);
    };

    return { sink, close, abortSignal: abort.signal };
}

// EOF plugins/ai-core/webapp/utils/transport/sse.js
