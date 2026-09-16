/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Model / AI Usage
 * @tagline         Reserve-then-settle usage counters
 * @description     Documents keyed subject:period; daily and monthly written on every settle
 * @file            plugins/ai-core/webapp/model/aiUsage.js
 * @version         1.0.0
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export const AI_USAGE_INDEXES = [
    {
        key: { key: 1 },
        unique: true,
        name: 'aiUsage_subject_period'
    }
];

function dbCollection() {
    const db = global.Database?.getDb?.();
    if (!db) {
        throw new Error('Database connection not available');
    }
    return db.collection('aiUsage');
}

function usageKey(subject, periodKey) {
    return `${subject}:${periodKey}`;
}

/**
 * Identity only. Counter fields must not appear here — MongoDB rejects
 * the same path in $setOnInsert and $inc on upsert.
 */
function insertIdentity(subject, periodKey, now) {
    return {
        key: usageKey(subject, periodKey),
        subject,
        periodKey,
        createdAt: now
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

    static async getByKey(subject, periodKey) {
        return this.getCollection().findOne({ key: usageKey(subject, periodKey) });
    }

    static async reserve(subject, periodKey, delta = {}) {
        const collection = this.getCollection();
        const key = usageKey(subject, periodKey);
        const now = new Date();
        await collection.updateOne(
            { key },
            {
                $setOnInsert: insertIdentity(subject, periodKey, now),
                $inc: {
                    reservedRequests: delta.requests || 0
                },
                $set: { updatedAt: now }
            },
            { upsert: true }
        );
        return this.getByKey(subject, periodKey);
    }

    static async rollbackReserve(subject, periodKey, delta = {}) {
        const collection = this.getCollection();
        await collection.updateOne(
            { key: usageKey(subject, periodKey) },
            {
                $inc: { reservedRequests: -(delta.requests || 0) },
                $set: { updatedAt: new Date() }
            }
        );
    }

    /**
     * Apply actual usage. cost null sets costUnknown rather than writing zero.
     */
    static async settle(subject, periodKey, delta = {}) {
        const collection = this.getCollection();
        const key = usageKey(subject, periodKey);
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
            $setOnInsert: insertIdentity(subject, periodKey, now),
            $inc: inc,
            $set: { updatedAt: now }
        };
        if (delta.cost == null && delta.costUnknown !== false) {
            if (delta.hasOwnProperty('cost') || delta.costUnknown === true) {
                update.$set.costUnknown = true;
            }
        } else if (Number.isFinite(delta.cost)) {
            inc.cost = delta.cost;
        }
        await collection.updateOne({ key }, update, { upsert: true });
        return this.getByKey(subject, periodKey);
    }

    static async listByPeriod(periodKey) {
        return this.getCollection().find({ periodKey }).sort({ subject: 1 }).toArray();
    }

    static async listRecent(limit = 200) {
        return this.getCollection().find({}).sort({ updatedAt: -1 }).limit(limit).toArray();
    }
}

export default AiUsageModel;

// EOF plugins/ai-core/webapp/model/aiUsage.js
