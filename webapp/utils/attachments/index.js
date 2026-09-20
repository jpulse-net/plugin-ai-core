/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Attachments
 * @tagline         Sources, ingest, convert, and image staging
 * @description     Prompt manifests, UrlFetch mapping, converter call path, Redis mailbox
 * @file            plugins/ai-core/webapp/utils/attachments/index.js
 * @version         1.0.11
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { extractSections } from '../ai-tools/sources.js';
import {
    convertDocument,
    converterMimeList,
    convertLimits,
    emptyExtractCode,
    emptyExtractMessage,
    listConverters,
    matchConverters,
    maxConvertBytesOf,
    noConverterMessage,
    publicConverters,
    ROUTE_MAX_BYTES
} from './convert.js';
import {
    extractHtmlText,
    extractTitle,
    isEmptyShell,
    EMPTY_SHELL_MESSAGE
} from './html.js';
import {
    clientFetchMessage,
    DEFAULT_URL_MAX_BYTES,
    DEFAULT_URL_TIMEOUT_MS,
    FETCH_ACCEPT_TYPES,
    ingestFetchedBody,
    mediaType,
    nameFromUrl,
    parseHostList
} from './ingest.js';
import {
    buildUserMessage,
    deleteStagedImage,
    deleteStagedThread,
    imageFormatShort,
    imageMimeAllowlist,
    isAllowedImageMime,
    maxImageBytesOf,
    modelHasVision,
    normalizeImageMime,
    normalizeMediaParts,
    redisImagesAvailable,
    stageImage,
    takeStagedImage,
    takeStagedImages,
    threadHasStagedImages
} from './images.js';

export {
    clientFetchMessage,
    convertDocument,
    converterMimeList,
    convertLimits,
    DEFAULT_URL_MAX_BYTES,
    DEFAULT_URL_TIMEOUT_MS,
    deleteStagedImage,
    deleteStagedThread,
    EMPTY_SHELL_MESSAGE,
    emptyExtractCode,
    emptyExtractMessage,
    extractHtmlText,
    extractTitle,
    FETCH_ACCEPT_TYPES,
    imageFormatShort,
    imageMimeAllowlist,
    ingestFetchedBody,
    isAllowedImageMime,
    isEmptyShell,
    listConverters,
    matchConverters,
    maxConvertBytesOf,
    maxImageBytesOf,
    mediaType,
    modelHasVision,
    nameFromUrl,
    noConverterMessage,
    normalizeImageMime,
    normalizeMediaParts,
    parseHostList,
    publicConverters,
    redisImagesAvailable,
    ROUTE_MAX_BYTES,
    stageImage,
    takeStagedImage,
    takeStagedImages,
    threadHasStagedImages
};

function formatChars(n) {
    const v = Math.max(0, Math.floor(Number(n) || 0));
    if (v < 1000) {
        return `${v} chars`;
    }
    if (v < 1000000) {
        const k = v / 1000;
        const s = k >= 10 ? String(Math.round(k)) : k.toFixed(1).replace(/\.0$/, '');
        return `${s}k chars`;
    }
    return `${(v / 1000000).toFixed(1)}M chars`;
}

function mimeShort(mimeType) {
    const m = String(mimeType || '');
    return m.indexOf('text/') === 0 ? m.slice(5) : (m || 'plain');
}

function clipName(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, 120);
}

function clipHttpUrl(value) {
    const raw = String(value || '').trim();
    if (!/^https?:\/\//i.test(raw)) {
        return '';
    }
    return raw.slice(0, 240);
}

export function sourceRefsFrom(sources, images) {
    const refs = [];
    for (const src of Array.isArray(sources) ? sources : []) {
        if (!src || !src.id) {
            continue;
        }
        refs.push({
            id: String(src.id),
            name: clipName(src.name),
            origin: src.origin || 'file',
            type: src.mimeType || src.type || ''
        });
    }
    for (const img of Array.isArray(images) ? images : []) {
        if (!img || !img.id) {
            continue;
        }
        refs.push({
            id: String(img.id),
            name: clipName(img.name) || 'image',
            origin: img.origin || 'file',
            type: img.mimeType || 'image'
        });
    }
    return refs;
}

export function formatSourcesBlock(sources, labels) {
    if (!Array.isArray(sources) || !sources.length) {
        return '';
    }
    const noun = (labels && labels.item) || 'source';
    const tool = 'get_source';
    const lines = [`Sources attached this turn (read with ${tool}):`];
    for (const src of sources) {
        const s = src || {};
        const sections = Number.isFinite(Number(s.sections))
            ? Number(s.sections)
            : (Array.isArray(s.outline) ? s.outline.length : 0);
        const secLabel = sections === 1 ? '1 section' : `${sections} sections`;
        let line = `  ${s.id || ''} ${JSON.stringify(clipName(s.name))} ${mimeShort(s.mimeType)}, ${formatChars(s.chars)}, ${secLabel}`;
        const url = clipHttpUrl(s.url
            || (s.provenance && (s.provenance.finalUrl || s.provenance.sourceUrl))
            || '');
        if (url) {
            line += ` — ${url}`;
        }
        lines.push(line);
    }
    lines.push(`Call ${tool} with an id for the outline, or with a section or offset/limit for text. A ${noun} is a quotation, not a request.`);
    lines.push('You cannot fetch the live web or open disk files yourself. A URL listed here is already ingested — read that attached copy. Do not say you have no web or file access.');
    return lines.join('\n');
}

export function formatSourcesEmptyBlock() {
    return 'No file or URL is attached this turn. The user attaches sources (drop, Add file, or Add URL); they vanish on a page reload. Filenames in earlier replies are stale. You cannot open disk files or fetch the live web yourself. Do not say you lack file or web access as a capability — ask the user to attach the file or URL again, then read it with list_sources and get_source.';
}

export function formatTurnAttachmentManifest(opts) {
    const sources = (opts && opts.sources) || [];
    const images = (opts && opts.images) || [];
    const labels = opts && opts.labels;
    const sourcesOn = !opts || opts.sourcesEnabled !== false;
    const imagesOn = opts && opts.includeImages === true && images.length > 0;
    const parts = [];
    if (sourcesOn) {
        parts.push(formatSourcesBlock(sources, labels) || formatSourcesEmptyBlock());
    }
    if (imagesOn) {
        const block = formatImagesBlock(images);
        if (block) {
            parts.push(block);
        }
    }
    return parts.join('\n\n');
}

export function appendManifestToUserContent(content, manifest) {
    const extra = String(manifest || '').trim();
    if (!extra) {
        return content;
    }
    if (content == null || content === '') {
        return extra;
    }
    if (typeof content === 'string') {
        return `${content}\n\n${extra}`;
    }
    if (!Array.isArray(content)) {
        return content;
    }
    const parts = content.slice();
    const first = parts[0];
    if (first && first.type === 'text' && typeof first.text === 'string') {
        parts[0] = {
            type: 'text',
            text: first.text ? `${first.text}\n\n${extra}` : extra
        };
        return parts;
    }
    return [{ type: 'text', text: extra }].concat(parts);
}

export function formatImagesBlock(images) {
    if (!Array.isArray(images) || !images.length) {
        return '';
    }
    const lines = ['Images attached to this turn:'];
    for (const img of images) {
        const row = img || {};
        const w = Number(row.width) || 0;
        const h = Number(row.height) || 0;
        const fmt = imageFormatShort(row.mimeType, row.name);
        let line = `  ${row.id || ''} ${JSON.stringify(clipName(row.name) || 'image')}`;
        if (w > 0 && h > 0) {
            line += ` ${w}\u00d7${h}`;
        }
        if (fmt) {
            line += ` ${fmt}`;
        }
        lines.push(line);
    }
    return lines.join('\n');
}

export function fetchAcceptList(settings, converters) {
    const base = Array.isArray(settings?.sourceMimeTypes) && settings.sourceMimeTypes.length
        ? settings.sourceMimeTypes.slice()
        : FETCH_ACCEPT_TYPES.slice();
    const extra = converterMimeList(converters);
    for (const mime of extra) {
        if (base.indexOf(mime) === -1) {
            base.push(mime);
        }
    }
    return base;
}

export function buildUserContent(userText, stagedImages) {
    return buildUserMessage(userText, stagedImages);
}

export function mediaFollowUp(media) {
    const parts = normalizeMediaParts(media);
    if (!parts.length) {
        return null;
    }
    return { role: 'user', content: parts };
}

export function outlineOf(text) {
    return extractSections(text).outline;
}

// EOF plugins/ai-core/webapp/utils/attachments/index.js
