/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Cancel Broadcast
 * @tagline         Cancel flag via broadcast callback
 * @file            plugins/ai-core/webapp/tests/unit/cancel-broadcast.test.js
 * @version         1.0.2
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import {
    _resetSubscribeFlag,
    attachTurnAbort,
    broadcastCancel,
    clearAllCancels,
    isCancelRequested,
    requestCancel,
    subscribeCancelBroadcast
} from '../../utils/agent/cancel.js';

afterEach(() => {
    clearAllCancels();
    _resetSubscribeFlag();
});

describe('cancel broadcast', () => {
    test('broadcast sets the local flag and publishes', async () => {
        const published = [];
        const redisManager = {
            async publishBroadcast(channel, data) {
                published.push({ channel, data });
            },
            registerBroadcastCallback() {}
        };
        await broadcastCancel('thread-1', { redisManager });
        expect(isCancelRequested('thread-1')).toBe(true);
        expect(published[0].channel).toBe('controller:ai-core:turn:cancel');
        expect(published[0].data.threadId).toBe('thread-1');
    });

    test('subscribe applies a remote cancel', () => {
        let handler = null;
        let options = null;
        const redisManager = {
            registerBroadcastCallback(channel, callback, opts) {
                handler = callback;
                options = opts;
            }
        };
        subscribeCancelBroadcast({ redisManager });
        handler({ threadId: 'thread-2' });
        expect(isCancelRequested('thread-2')).toBe(true);
        expect(options?.omitSelf).toBe(true);
    });

    test('requestCancel aborts an attached turn controller', () => {
        const abort = new AbortController();
        attachTurnAbort('thread-3', abort);
        requestCancel('thread-3');
        expect(isCancelRequested('thread-3')).toBe(true);
        expect(abort.signal.aborted).toBe(true);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/cancel-broadcast.test.js
