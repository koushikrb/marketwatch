import { openDB } from 'idb';

const DB_NAME = 'NSE_SCREENER_DB';
const DB_VERSION = 4;
const STORE_NAME = 'stock_cache';
const MAX_DB_SIZE = 1 * 1024 * 1024 * 1024; // 1GB in bytes

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('lastAccessed', 'lastAccessed');
                store.createIndex('symbol', 'symbol');
            }
        },
    });
};

// Estimate size of data in bytes
const estimateDataSize = (data) => {
    return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
};

// Get total database size
export const getDBSize = async () => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const allRecords = await store.getAll();

    let totalSize = 0;
    allRecords.forEach(record => {
        totalSize += record.dataSize || 0;
    });

    return totalSize;
};

// Remove oldest entries to free up space
export const enforceStorageLimit = async () => {
    const currentSize = await getDBSize();

    if (currentSize < MAX_DB_SIZE * 0.9) return; // Only enforce at 90% capacity

    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('lastAccessed');

    // Get all records sorted by last accessed (oldest first)
    const allRecords = await index.getAll();

    let freedSize = 0;
    const targetFreeSize = MAX_DB_SIZE * 0.2; // Free up 20%

    for (const record of allRecords) {
        if (freedSize >= targetFreeSize) break;

        await store.delete(record.id);
        freedSize += record.dataSize || 0;
        console.log(`[DB] Evicted ${record.id} (${(record.dataSize / 1024).toFixed(2)} KB)`);
    }

    await tx.done;
    console.log(`[DB] Freed ${(freedSize / 1024 / 1024).toFixed(2)} MB`);
};

export const cacheStockData = async (symbol, range, interval, data) => {
    const db = await initDB();
    const id = `${symbol}_${range}_${interval}`;
    const timestamp = Date.now();
    const dataSize = estimateDataSize(data);

    // Enforce storage limit before adding new data
    await enforceStorageLimit();

    await db.put(STORE_NAME, {
        id,
        symbol,
        data,
        timestamp,
        lastAccessed: timestamp,
        dataSize
    });

    console.log(`[DB] Cached ${symbol} (${(dataSize / 1024).toFixed(2)} KB)`);
};

export const getCachedStockData = async (symbol, range, interval) => {
    const db = await initDB();
    const id = `${symbol}_${range}_${interval}`;
    const cached = await db.get(STORE_NAME, id);

    if (!cached) return null;

    // Update last accessed time
    await db.put(STORE_NAME, {
        ...cached,
        lastAccessed: Date.now()
    });

    // Cache validity: 24 hours for daily data
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (now - cached.timestamp > maxAge) {
        await db.delete(STORE_NAME, id);
        return null;
    }

    return cached.data;
};

// Clear all cached data
export const clearAllCache = async () => {
    const db = await initDB();
    await db.clear(STORE_NAME);
    console.log('[DB] All cache cleared');
};

// Get cache statistics
export const getCacheStats = async () => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const allRecords = await store.getAll();

    const totalSize = allRecords.reduce((sum, r) => sum + (r.dataSize || 0), 0);
    const stockCount = new Set(allRecords.map(r => r.symbol)).size;

    return {
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        recordCount: allRecords.length,
        stockCount,
        percentUsed: ((totalSize / MAX_DB_SIZE) * 100).toFixed(1)
    };
};
