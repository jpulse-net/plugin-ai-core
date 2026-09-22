/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Attachments / Tools
 * @tagline         Framework-owned source tools
 * @description     list_sources and get_source descriptors
 * @file            plugins/ai-core/webapp/utils/attachments/tools.js
 * @version         1.0.16
 * @release         2026-09-22
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { isSourceTextRead } from '../ai-tools/sources.js';
import { RESERVED_TOOL_NAMES } from '../tools/descriptor.js';

export const PANEL_TOOL_NAMES = RESERVED_TOOL_NAMES;

export function isPanelTool(name) {
    return PANEL_TOOL_NAMES.indexOf(name) !== -1;
}

export function sourceToolDescriptors() {
    return [
        {
            name: 'list_sources',
            description: 'List sources the user already attached in this tab (ids, names, origins, types, sizes, section counts). Never returns source text. Does not fetch the web or open disk files.',
            schema: { type: 'object', properties: {} },
            host: 'client',
            module: 'sources',
            requires: 'scope:read'
        },
        {
            name: 'get_source',
            description: 'Read a source the user already attached in this tab. A bare id returns the outline. Pass section, or offset and limit, for text. Does not fetch a URL or open a disk file.',
            schema: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'Source id from list_sources' },
                    section: { type: 'string', description: 'Section key or label' },
                    offset: { type: 'integer', description: 'Character offset' },
                    limit: { type: 'integer', description: 'Maximum characters to return' }
                },
                required: ['id']
            },
            host: 'client',
            module: 'sources',
            requires: 'scope:read',
            budget: {
                key: 'sourceReads',
                max: 'maxSourceReadsPerTurn',
                countWhen: (args) => isSourceTextRead(args),
                overMessage: 'This turn already made %MAX% source text reads.',
                overHint: 'Use the outline, a different section, or reply with what you have.'
            }
        }
    ];
}

// EOF plugins/ai-core/webapp/utils/attachments/tools.js
