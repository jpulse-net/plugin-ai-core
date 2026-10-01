/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Model / AI Usage
 * @tagline         One usage row per day, user, model, and scope
 * @description     Day records only; a month is the sum of its days
 * @file            plugins/ai-core/webapp/model/aiUsage.js
 * @version         1.0.19
 * @release         2026-10-01
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export const AI_USAGE_INDEXES = [
    {
        key: { day: 1, username: 1, provider: 1, model: 1, scopeType: 1, scopeId: 1 },
        unique: true,
        name: 'aiUsage_identity'
    },
    {
        key: { username: 1, day: 1 },
        name: 'aiUsage_user_day'
    }
];

const COUNTERS = {
    requests: { $sum: '$requests' },
    reservedRequests: { $sum: '$reservedRequests' },
    tokens: { $sum: '$tokens' },
    tokensIn: { $sum: '$tokensIn' },
    tokensOut: { $sum: '$tokensOut' },
    cost: { $sum: '$cost' },
    costUnknown: { $max: '$costUnknown' },
    toolCalls: { $sum: '$toolCalls' },
    cacheWrite: { $sum: '$cacheWrite' },
    cacheRead: { $sum: '$cacheRead' },
    lastUsed: { $max: '$updatedAt' }
};

function dbCollection() {
    const db = global.Database?.getDb?.();
    if (!db) {
        throw new Error('Database connection not available');
    }
    return db.collection('aiUsage');
}

function identityFilter(identity) {
    return {
        day: identity.day,
        username: identity.username,
        provider: identity.provider,
        model: identity.model,
        scopeType: identity.scopeType,
        scopeId: identity.scopeId
    };
}

/**
 * Identity only. Counter fields must not appear here — MongoDB rejects
 * the same path in $setOnInsert and $inc on upsert.
 */
function insertIdentity(identity, now) {
    return {
        ...identityFilter(identity),
        createdAt: now
    };
}

function dayMatch(range, extra = {}) {
    return {
        ...extra,
        day: { $gte: range.fromDay, $lte: range.toDay }
    };
}

class AiUsageModel {
    static getCollection() {
        return this._collection || dbCollection();
    }

    static useCollection(collection) {
        this._collection = collection || null;
    }

    static async ensureIndexes() {
        const collection = this.getCollection();
        for (const spec of AI_USAGE_INDEXES) {
            const { key, ...options } = spec;
            await collection.createIndex(key, options);
        }
    }

    static async findIdentity(identity) {
        return this.getCollection().findOne(identityFilter(identity));
    }

    static async reserve(identity, delta = {}) {
        const collection = this.getCollection();
        const now = new Date();
        const filter = identityFilter(identity);
        await collection.updateOne(
            filter,
            {
                $setOnInsert: insertIdentity(identity, now),
                $inc: {
                    reservedRequests: delta.requests || 0
                },
                $set: { updatedAt: now }
            },
            { upsert: true }
        );
        return this.findIdentity(identity);
    }

    static async rollbackReserve(identity, delta = {}) {
        const collection = this.getCollection();
        await collection.updateOne(
            identityFilter(identity),
            {
                $inc: { reservedRequests: -(delta.requests || 0) },
                $set: { updatedAt: new Date() }
            }
        );
    }

    /**
     * Apply actual usage. cost null sets costUnknown rather than writing zero.
     * scopeLabel is written only when the turn resolved a non-empty label.
     */
    static async settle(identity, delta = {}) {
        const collection = this.getCollection();
        const now = new Date();
        const inc = {
            reservedRequests: -(delta.requests || 0),
            requests: delta.requests || 0,
            tokensIn: delta.tokensIn || 0,
            tokensOut: delta.tokensOut || 0,
            tokens: (delta.tokensIn || 0) + (delta.tokensOut || 0),
            cacheWrite: delta.cacheWrite || 0,
            cacheRead: delta.cacheRead || 0,
            toolCalls: delta.toolCalls || 0
        };
        const update = {
            $setOnInsert: insertIdentity(identity, now),
            $inc: inc,
            $set: { updatedAt: now }
        };
        if (typeof delta.scopeLabel === 'string' && delta.scopeLabel.trim()) {
            update.$set.scopeLabel = delta.scopeLabel;
        }
        if (delta.cost == null && delta.costUnknown !== false) {
            if (Object.prototype.hasOwnProperty.call(delta, 'cost') || delta.costUnknown === true) {
                update.$set.costUnknown = true;
            }
        } else if (Number.isFinite(delta.cost)) {
            inc.cost = delta.cost;
        }
        await collection.updateOne(identityFilter(identity), update, { upsert: true });
        return this.findIdentity(identity);
    }

    static async sumForUser(username, range) {
        const rows = await this.getCollection().aggregate([
            { $match: dayMatch(range, { username }) },
            {
                $group: {
                    _id: null,
                    requests: COUNTERS.requests,
                    reservedRequests: COUNTERS.reservedRequests,
                    tokens: COUNTERS.tokens,
                    tokensIn: COUNTERS.tokensIn,
                    tokensOut: COUNTERS.tokensOut,
                    cost: COUNTERS.cost,
                    costUnknown: COUNTERS.costUnknown,
                    toolCalls: COUNTERS.toolCalls,
                    cacheWrite: COUNTERS.cacheWrite,
                    cacheRead: COUNTERS.cacheRead
                }
            }
        ]).toArray();
        const row = rows[0] || {};
        return {
            requests: (row.requests || 0) + (row.reservedRequests || 0),
            tokens: row.tokens || 0,
            tokensIn: row.tokensIn || 0,
            tokensOut: row.tokensOut || 0,
            cost: row.cost || 0,
            costUnknown: row.costUnknown === true,
            toolCalls: row.toolCalls || 0,
            cacheWrite: row.cacheWrite || 0,
            cacheRead: row.cacheRead || 0
        };
    }

    static async summarize(range) {
        const rows = await this.getCollection().aggregate([
            { $match: dayMatch(range) },
            {
                $facet: {
                    totals: [{ $group: { _id: null, ...COUNTERS } }],
                    byUser: [{ $group: { _id: '$username', ...COUNTERS } }],
                    byModel: [{
                        $group: {
                            _id: { provider: '$provider', model: '$model' },
                            ...COUNTERS
                        }
                    }],
                    byScope: [
                        { $sort: { updatedAt: -1 } },
                        {
                            $group: {
                                _id: { scopeType: '$scopeType', scopeId: '$scopeId' },
                                ...COUNTERS,
                                scopeLabel: { $first: '$scopeLabel' }
                            }
                        }
                    ]
                }
            }
        ]).toArray();
        const facet = rows[0] || {};
        return {
            totals: facet.totals?.[0] || null,
            byUser: facet.byUser || [],
            byModel: facet.byModel || [],
            byScope: facet.byScope || []
        };
    }

    static async history(range, per) {
        const period = per === 'month'
            ? { $substrBytes: ['$day', 0, 7] }
            : '$day';
        return this.getCollection().aggregate([
            { $match: dayMatch(range) },
            {
                $group: {
                    _id: { period, username: '$username' },
                    requests: COUNTERS.requests,
                    tokens: COUNTERS.tokens,
                    cost: COUNTERS.cost,
                    costUnknown: COUNTERS.costUnknown
                }
            }
        ]).toArray();
    }
}

export default AiUsageModel;

// EOF plugins/ai-core/webapp/model/aiUsage.js
