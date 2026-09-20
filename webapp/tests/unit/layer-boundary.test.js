/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Layer Boundary
 * @tagline         Tools and agent import only downward
 * @file            plugins/ai-core/webapp/tests/unit/layer-boundary.test.js
 * @version         1.0.12
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

const webapp = path.resolve(process.cwd(), 'plugins/ai-core/webapp');

function collectJs(dir, acc = []) {
    if (!fs.existsSync(dir)) {
        return acc;
    }
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) {
            collectJs(full, acc);
        } else if (entry.endsWith('.js')) {
            acc.push(full);
        }
    }
    return acc;
}

function importSpecs(file) {
    const text = fs.readFileSync(file, 'utf8');
    return [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(match => match[1]);
}

describe('ai-core layer boundary', () => {
    test('tools does not import agent or transport', () => {
        const files = collectJs(path.join(webapp, 'utils/tools'));
        const leaks = [];
        for (const file of files) {
            for (const spec of importSpecs(file)) {
                if (spec.includes('/agent/') || spec.includes('../agent') || spec.includes('/transport/') || spec.includes('../transport')) {
                    leaks.push(`${path.relative(webapp, file)} -> ${spec}`);
                }
            }
        }
        expect(leaks).toEqual([]);
    });

    test('attachments does not import agent, transport, or a provider', () => {
        const files = collectJs(path.join(webapp, 'utils/attachments'));
        const leaks = [];
        for (const file of files) {
            for (const spec of importSpecs(file)) {
                if (spec.includes('/agent/') || spec.includes('../agent')
                    || spec.includes('/transport/') || spec.includes('../transport')
                    || spec.includes('ai-anthropic') || spec.includes('ai-mock')) {
                    leaks.push(`${path.relative(webapp, file)} -> ${spec}`);
                }
            }
        }
        expect(leaks).toEqual([]);
    });

    test('agent does not import transport', () => {
        const files = collectJs(path.join(webapp, 'utils/agent'));
        const leaks = [];
        for (const file of files) {
            for (const spec of importSpecs(file)) {
                if (spec.includes('/transport/') || spec.includes('../transport')) {
                    leaks.push(`${path.relative(webapp, file)} -> ${spec}`);
                }
            }
        }
        expect(leaks).toEqual([]);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/layer-boundary.test.js
