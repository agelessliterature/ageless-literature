/**
 * Import Staging Store
 * Stores staged import data temporarily using Redis (preferred) or in-memory fallback.
 * Each staged import has a TTL of 30 minutes.
 */

import { Redis } from 'ioredis';
import config from '../../config/index.js';
import crypto from 'crypto';

const STAGING_TTL = 1800; // 30 minutes
const KEY_PREFIX = 'import:staging:';

// In-memory fallback store
const memoryStore = new Map();
const memoryTimers = new Map();

let redisClient = null;
let redisAttempted = false;

/**
 * Initialize Redis connection (optional - falls back to memory)
 */
async function getRedis() {
  if (redisClient) return redisClient;
  if (redisAttempted) return null;
  redisAttempted = true;
  try {
    const url = process.env.REDIS_URL || config.redis?.url;
    if (!url) return null;
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    await redisClient.connect();
    console.log('[ImportStaging] Using Redis for staging store');
    return redisClient;
  } catch (err) {
    console.log('[ImportStaging] Redis unavailable, using in-memory store');
    redisClient = null;
    return null;
  }
}

/** Generate a unique import ID */
export function generateImportId() {
  return `imp_${crypto.randomBytes(12).toString('hex')}`;
}

/** Store staged import data */
export async function stageImport(importId, data) {
  const key = KEY_PREFIX + importId;
  const serialized = JSON.stringify(data);
  const redis = await getRedis();
  if (redis) {
    await redis.setex(key, STAGING_TTL, serialized);
  } else {
    memoryStore.set(key, serialized);
    if (memoryTimers.has(key)) clearTimeout(memoryTimers.get(key));
    memoryTimers.set(
      key,
      setTimeout(() => {
        memoryStore.delete(key);
        memoryTimers.delete(key);
      }, STAGING_TTL * 1000),
    );
  }
}

/** Retrieve staged import data */
export async function getStagedImport(importId) {
  const key = KEY_PREFIX + importId;
  const redis = await getRedis();
  if (redis) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  const data = memoryStore.get(key);
  return data ? JSON.parse(data) : null;
}

/** Update staged import */
export async function updateStagedImport(importId, updates) {
  const existing = await getStagedImport(importId);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  await stageImport(importId, updated);
  return updated;
}

/** Delete staged import */
export async function deleteStagedImport(importId) {
  const key = KEY_PREFIX + importId;
  const redis = await getRedis();
  if (redis) {
    await redis.del(key);
  } else {
    memoryStore.delete(key);
    if (memoryTimers.has(key)) {
      clearTimeout(memoryTimers.get(key));
      memoryTimers.delete(key);
    }
  }
}

/** Store import result (audit log - 7 day TTL) */
export async function storeImportResult(importId, result) {
  const key = `import:result:${importId}`;
  const serialized = JSON.stringify(result);
  const redis = await getRedis();
  if (redis) {
    await redis.setex(key, 604800, serialized);
  } else {
    memoryStore.set(key, serialized);
    memoryTimers.set(
      key,
      setTimeout(() => {
        memoryStore.delete(key);
        memoryTimers.delete(key);
      }, 604800 * 1000),
    );
  }
}

/** Get import result */
export async function getImportResult(importId) {
  const key = `import:result:${importId}`;
  const redis = await getRedis();
  if (redis) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  const data = memoryStore.get(key);
  return data ? JSON.parse(data) : null;
}
