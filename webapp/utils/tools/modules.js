/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tools / Modules
 * @tagline         Shared pure tool modules
 * @description     Discover, hash, purity-scan, and run ES modules from ai-tools/
 * @file            plugins/ai-core/webapp/utils/tools/modules.js
 * @version         1.0.12
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const HASH_LEN = 16;
const IMPORT_RE = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /import\s*\(/;

const catalog = new Map();

export function hashSource(source) {
    return crypto.createHash('sha256').update(String(source), 'utf8').digest('hex').slice(0, HASH_LEN);
}

export function importSpecs(source) {
    return [...String(source).matchAll(IMPORT_RE)].map(match => match[1]);
}

/**
 * Relative imports that stay inside root are allowed. Bare specifiers and
 * dynamic import() are not.
 * @param {string} source
 * @param {string} filePath
 * @param {string} rootDir
 * @returns {{ ok: boolean, reason: string }}
 */
export function scanModuleSource(source, filePath, rootDir) {
    const text = String(source);
    if (DYNAMIC_IMPORT_RE.test(text)) {
        return { ok: false, reason: 'dynamic import() is not allowed' };
    }
    const root = path.resolve(rootDir);
    const fromDir = path.dirname(path.resolve(filePath));
    for (const spec of importSpecs(text)) {
        if (!spec.startsWith('./') && !spec.startsWith('../')) {
            return { ok: false, reason: `bare specifier '${spec}' is not allowed` };
        }
        const resolved = path.resolve(fromDir, spec);
        const rel = path.relative(root, resolved);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
            return { ok: false, reason: `import '${spec}' leaves ai-tools/` };
        }
    }
    return { ok: true, reason: '' };
}

function listJsFiles(dir) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        return [];
    }
    return fs.readdirSync(dir)
        .filter(name => name.endsWith('.js'))
        .map(name => path.join(dir, name));
}

function moduleNameFromFile(filePath) {
    return path.basename(filePath, '.js');
}

/**
 * @param {object} [options]
 * @returns {object[]}
 */
export function scanToolModules(options = {}) {
    const roots = options.roots || defaultRoots(options);
    const found = [];
    for (const root of roots) {
        const rootDir = path.resolve(root);
        for (const filePath of listJsFiles(rootDir)) {
            const source = fs.readFileSync(filePath, 'utf8');
            const name = moduleNameFromFile(filePath);
            const purity = scanModuleSource(source, filePath, rootDir);
            found.push({
                name,
                filePath,
                rootDir,
                source,
                hash: hashSource(source),
                ok: purity.ok,
                reason: purity.reason
            });
        }
    }
    return found;
}

export function defaultRoots(options = {}) {
    const roots = [];
    const projectRoot = options.projectRoot
        || global.appConfig?.system?.projectRoot
        || process.cwd();
    const siteDir = path.join(projectRoot, 'site', 'webapp', 'utils', 'ai-tools');
    if (fs.existsSync(siteDir)) {
        roots.push(siteDir);
    }
    const plugins = options.plugins
        || global.PluginManager?.getActivePlugins?.()
        || [];
    for (const plugin of plugins) {
        const dir = path.join(plugin.path, 'webapp', 'utils', 'ai-tools');
        if (fs.existsSync(dir)) {
            roots.push(dir);
        }
    }
    return roots;
}

/**
 * Site first, then each plugin in load order. Later entries lose on name collision.
 * @param {object} [options]
 * @returns {Map<string, object>}
 */
export function discoverToolModules(options = {}) {
    catalog.clear();
    const scanned = scanToolModules(options);
    for (const entry of scanned) {
        if (!catalog.has(entry.name)) {
            catalog.set(entry.name, {
                name: entry.name,
                filePath: entry.filePath,
                source: entry.source,
                hash: entry.hash,
                ok: entry.ok,
                reason: entry.reason,
                url: `/api/1/ai/tool-module/${entry.hash}/${entry.name}.js`
            });
        }
    }
    return catalog;
}

export function getModuleByName(name) {
    return catalog.get(name) || null;
}

export function getModuleByHash(hash, name) {
    const entry = catalog.get(name);
    if (!entry) {
        return null;
    }
    if (entry.hash !== hash) {
        return null;
    }
    return entry;
}

export function listModuleManifest() {
    return [...catalog.values()]
        .filter(entry => entry.ok)
        .map(entry => ({
            name: entry.name,
            hash: entry.hash,
            url: entry.url
        }));
}

export function inspectModule(name) {
    if (!name) {
        return { ok: true, reason: '' };
    }
    if (catalog.size === 0) {
        discoverToolModules();
    }
    const entry = catalog.get(name);
    if (!entry) {
        return { ok: false, reason: 'missing' };
    }
    if (!entry.ok) {
        return { ok: false, reason: entry.reason || 'impure' };
    }
    return { ok: true, reason: '', hash: entry.hash, url: entry.url };
}

/**
 * @param {string} name
 * @param {*} data
 * @param {object} args
 * @returns {Promise<*>}
 */
export async function runModule(name, data, args) {
    if (catalog.size === 0) {
        discoverToolModules();
    }
    const entry = catalog.get(name);
    if (!entry) {
        throw new Error(`Unknown tool module '${name}'`);
    }
    if (!entry.ok) {
        throw new Error(`Tool module '${name}' is not pure: ${entry.reason}`);
    }
    const imported = await import(pathToFileURL(entry.filePath).href);
    if (typeof imported.run !== 'function') {
        throw new Error(`Tool module '${name}' does not export run()`);
    }
    return imported.run(data, args || {});
}

export function resetModuleCatalog() {
    catalog.clear();
}

// EOF plugins/ai-core/webapp/utils/tools/modules.js
