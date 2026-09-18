/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Helpers
 * @tagline         In-memory collections and hook fakes
 * @file            plugins/ai-core/webapp/tests/unit/helpers.js
 * @version         1.0.7
 * @release         2026-09-18
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export function matchQuery(doc, query) {
    if (!query) {
        return true;
    }
    for (const [key, value] of Object.entries(query)) {
        if (value && typeof value === 'object' && value.$lt) {
            if (!(doc[key] < value.$lt)) {
                return false;
            }
            continue;
        }
        if (String(doc[key]) !== String(value)) {
            return false;
        }
    }
    return true;
}

export function memoryCollection(options = {}) {
    const docs = [];
    const indexes = [];
    let seq = 1;

    function applyPartialUnique(doc) {
        for (const index of indexes) {
            if (!index.options?.unique) {
                continue;
            }
            const filter = index.options.partialFilterExpression;
            if (filter && !matchQuery(doc, filter)) {
                continue;
            }
            const clash = docs.find(existing => {
                if (filter && !matchQuery(existing, filter)) {
                    return false;
                }
                return Object.keys(index.key).every(field => String(existing[field]) === String(doc[field]));
            });
            if (clash) {
                const error = new Error('duplicate key');
                error.code = 11000;
                throw error;
            }
        }
    }

    return {
        docs,
        indexes,
        async createIndex(key, indexOptions = {}) {
            indexes.push({ key, options: indexOptions });
        },
        async findOne(query) {
            return docs.find(doc => matchQuery(doc, query)) || null;
        },
        find(query) {
            let rows = docs.filter(doc => matchQuery(doc, query));
            const chain = {
                sort(spec) {
                    const [[field, dir]] = Object.entries(spec);
                    rows = [...rows].sort((a, b) => {
                        if (a[field] < b[field]) {
                            return -dir;
                        }
                        if (a[field] > b[field]) {
                            return dir;
                        }
                        return 0;
                    });
                    return chain;
                },
                limit(n) {
                    rows = rows.slice(0, n);
                    return chain;
                },
                async toArray() {
                    return rows;
                }
            };
            return chain;
        },
        async insertOne(doc) {
            const next = { ...doc, _id: doc._id || `mem-${seq++}` };
            applyPartialUnique(next);
            docs.push(next);
            return { insertedId: next._id };
        },
        async updateMany(query, update) {
            let matched = 0;
            for (const doc of docs) {
                if (!matchQuery(doc, query)) {
                    continue;
                }
                if (update.$set) {
                    Object.assign(doc, update.$set);
                }
                matched += 1;
            }
            return { matchedCount: matched, modifiedCount: matched };
        },
        async updateOne(query, update, extra = {}) {
            let doc = docs.find(row => matchQuery(row, query));
            if (!doc && extra.upsert) {
                doc = { ...(update.$setOnInsert || {}), _id: `mem-${seq++}` };
                docs.push(doc);
            }
            if (!doc) {
                return { matchedCount: 0 };
            }
            if (update.$inc) {
                for (const [key, value] of Object.entries(update.$inc)) {
                    doc[key] = (doc[key] || 0) + value;
                }
            }
            if (update.$set) {
                Object.assign(doc, update.$set);
            }
            if (update.$push) {
                for (const [key, value] of Object.entries(update.$push)) {
                    doc[key] = doc[key] || [];
                    doc[key].push(value);
                }
            }
            return { matchedCount: 1 };
        },
        async findOneAndUpdate(query, update) {
            await this.updateOne(query, update);
            return docs.find(doc => matchQuery(doc, query)) || null;
        },
        async deleteMany(query) {
            const keep = [];
            let deleted = 0;
            for (const doc of docs) {
                if (matchQuery(doc, query)) {
                    deleted += 1;
                } else {
                    keep.push(doc);
                }
            }
            docs.length = 0;
            docs.push(...keep);
            return { deletedCount: deleted };
        }
    };
}

export function createHookManager(handlers = {}) {
    return {
        async execute(name, ctx) {
            if (handlers[name]) {
                await handlers[name](ctx);
            }
            return ctx;
        },
        async executeFirst(name, ctx) {
            if (!handlers[name]) {
                return null;
            }
            return handlers[name](ctx);
        },
        async executeForPlugin(name, plugin, ctx) {
            const handler = handlers[`${name}:${plugin}`] || handlers[name];
            if (handler) {
                await handler(ctx);
            }
            return ctx;
        }
    };
}

export function testActor(extra = {}) {
    return {
        username: 'jdoe',
        roles: ['user'],
        onBehalfOf: null,
        origin: 'web',
        scopeType: 'doc',
        scopeId: 'doc-1',
        req: null,
        ...extra
    };
}

// EOF plugins/ai-core/webapp/tests/unit/helpers.js
