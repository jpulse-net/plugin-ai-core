/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Helpers
 * @tagline         In-memory collections and hook fakes
 * @file            plugins/ai-core/webapp/tests/unit/helpers.js
 * @version         1.0.19
 * @release         2026-10-01
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
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            let compared = false;
            if (Array.isArray(value.$in)) {
                compared = true;
                if (!value.$in.map((item) => String(item)).includes(String(doc[key]))) {
                    return false;
                }
            }
            if (value.$lt !== undefined) {
                compared = true;
                if (!(doc[key] < value.$lt)) {
                    return false;
                }
            }
            if (value.$lte !== undefined) {
                compared = true;
                if (!(doc[key] <= value.$lte)) {
                    return false;
                }
            }
            if (value.$gt !== undefined) {
                compared = true;
                if (!(doc[key] > value.$gt)) {
                    return false;
                }
            }
            if (value.$gte !== undefined) {
                compared = true;
                if (!(doc[key] >= value.$gte)) {
                    return false;
                }
            }
            if (compared) {
                continue;
            }
        }
        if (String(doc[key]) !== String(value)) {
            return false;
        }
    }
    return true;
}

function fieldPath(doc, path) {
    return String(path).split('.').reduce((cur, part) => (cur == null ? undefined : cur[part]), doc);
}

function evalExpr(doc, expr) {
    if (Array.isArray(expr)) {
        return expr.map((item) => evalExpr(doc, item));
    }
    if (expr instanceof Date || expr == null || typeof expr !== 'object') {
        if (typeof expr === 'string' && expr.startsWith('$')) {
            return fieldPath(doc, expr.slice(1));
        }
        return expr;
    }
    if (expr.$substrBytes) {
        const [field, start, len] = expr.$substrBytes;
        return String(evalExpr(doc, field) ?? '').slice(start, start + len);
    }
    const out = {};
    for (const [key, value] of Object.entries(expr)) {
        out[key] = evalExpr(doc, value);
    }
    return out;
}

function applyGroup(rows, spec) {
    const buckets = new Map();
    for (const doc of rows) {
        const id = spec._id == null ? null : evalExpr(doc, spec._id);
        const key = JSON.stringify(id);
        let bucket = buckets.get(key);
        const isFirst = !bucket;
        if (!bucket) {
            bucket = { _id: id };
            buckets.set(key, bucket);
        }
        for (const [field, acc] of Object.entries(spec)) {
            if (field === '_id' || !acc || typeof acc !== 'object') {
                continue;
            }
            if (acc.$sum !== undefined) {
                bucket[field] = (bucket[field] || 0) + (Number(evalExpr(doc, acc.$sum)) || 0);
            } else if (acc.$max !== undefined) {
                const value = evalExpr(doc, acc.$max);
                if (bucket[field] === undefined || (value != null && value > bucket[field])) {
                    bucket[field] = value;
                }
            } else if (acc.$min !== undefined) {
                const value = evalExpr(doc, acc.$min);
                if (bucket[field] === undefined || (value != null && value < bucket[field])) {
                    bucket[field] = value;
                }
            } else if (acc.$first !== undefined && isFirst) {
                bucket[field] = evalExpr(doc, acc.$first);
            }
        }
    }
    return [...buckets.values()];
}

function runPipeline(docs, pipeline) {
    let rows = docs.map((doc) => ({ ...doc }));
    for (const stage of pipeline) {
        if (stage.$match) {
            rows = rows.filter((doc) => matchQuery(doc, stage.$match));
        } else if (stage.$sort) {
            const entries = Object.entries(stage.$sort);
            rows = [...rows].sort((a, b) => {
                for (const [field, dir] of entries) {
                    if (a[field] < b[field]) {
                        return -dir;
                    }
                    if (a[field] > b[field]) {
                        return dir;
                    }
                }
                return 0;
            });
        } else if (stage.$group) {
            rows = applyGroup(rows, stage.$group);
        } else if (stage.$facet) {
            const faceted = {};
            for (const [name, sub] of Object.entries(stage.$facet)) {
                faceted[name] = runPipeline(rows, sub);
            }
            rows = [faceted];
        } else {
            throw new Error('unsupported aggregation stage');
        }
    }
    return rows;
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
        aggregate(pipeline) {
            const rows = runPipeline(docs, pipeline);
            return {
                async toArray() {
                    return rows;
                }
            };
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
