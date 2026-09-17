/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Actor Log
 * @tagline         onBehalfOf in every AI log line; thread ownership follows it
 * @file            plugins/ai-core/webapp/tests/unit/actor-log.test.js
 * @version         1.0.3
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, expect, test } from '@jest/globals';
import { onBehalfOfLogSuffix, threadOwner } from '../../utils/tools/actor.js';
import { testActor } from './helpers.js';

describe('actor', () => {
    test('onBehalfOf is present on every AI log line when set', () => {
        const actor = testActor({ username: 'bot', onBehalfOf: 'jdoe' });
        expect(onBehalfOfLogSuffix(actor)).toBe(' onBehalfOf=jdoe');
        expect(onBehalfOfLogSuffix(testActor())).toBe('');
    });

    test('thread ownership follows onBehalfOf', () => {
        expect(threadOwner(testActor({ username: 'bot', onBehalfOf: 'jdoe' }))).toBe('jdoe');
        expect(threadOwner(testActor({ username: 'jdoe' }))).toBe('jdoe');
    });
});

// EOF plugins/ai-core/webapp/tests/unit/actor-log.test.js
