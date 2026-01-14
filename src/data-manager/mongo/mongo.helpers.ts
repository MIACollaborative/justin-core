import * as mongoDB from 'mongodb';
import { NO_ID } from '../data-manager.constants';
import { createLogger } from '../../logger/logger';

const Log = createLogger({
  context: {
    source: 'mongo-manager-helpers',
  },
});
/**
 * Safely converts a string to a MongoDB `ObjectId`.
 *
 * Attempts to create an `ObjectId` from `id`. If conversion fails, logs and
 * returns `null` instead of throwing.
 *
 * @param id - The string to convert into an `ObjectId`.
 * @returns The created `ObjectId` or `null` if the format is invalid.
 */
const toObjectId = (id: string | null | undefined): mongoDB.ObjectId | null => {
  if (!id || typeof id !== 'string') {
    Log.error(`Invalid ObjectId format: ${id}`, { function: 'toObjectId' });
    return null;
  }
  try {
    return new mongoDB.ObjectId(id);
  } catch {
    Log.error(`Invalid ObjectId format: ${id}`, { function: 'toObjectId' });
    return null;
  }
};

/**
 * Moves Mongo `_id` to `id` (string). Returns `null` if `doc` is falsy.
 *
 * - If `_id` is present, `id` is `_id.toString()`.
 * - If `_id` is missing, `id` is {@link NO_ID}.
 * - Any existing `id` field on the document is ignored.
 *
 * @typeParam T - Any Mongo-shaped document.
 * @param doc - The source document (could be null/undefined).
 * @returns A new object with `id` and remaining fields, or `null`.
 */
const transformId = <T extends Record<string, any> | null | undefined>(doc: T) => {
  if (!doc) return null;

  const { _id, id: _ignoredId, ...rest } = doc as any;

  const id = _id && typeof (_id as any).toString === 'function' ? (_id as any).toString() : NO_ID;

  return {
    id,
    ...rest,
  };
};

/**
 * Coerces an IndexSpecification into `IndexDescription.key` shape
 * (plain object or Map) so `createIndexes` gets a predictable key.
 *
 * @param key - The index specification in any supported form.
 * @returns A plain object or Map keyed by field -> direction.
 */
const asIndexKey = (
  key: mongoDB.IndexSpecification,
): Record<string, mongoDB.IndexDirection> | Map<string, mongoDB.IndexDirection> => {
  if (typeof key === 'string') return { [key]: 1 };
  if (Array.isArray(key)) {
    const tuples = key as unknown as Array<[string, mongoDB.IndexDirection]>;
    const out: Record<string, mongoDB.IndexDirection> = {};
    for (const [k, v] of tuples) out[String(k)] = v;
    return out;
  }
  if (key instanceof Map) return key as Map<string, mongoDB.IndexDirection>;
  return key as Record<string, mongoDB.IndexDirection>;
};

/**
 * Builds a stable string signature for an index key so we can compare
 * "same index, different name" cases (helps with idempotency).
 *
 * Examples:
 *  - { a: 1, b: -1 }              → "a:1|b:-1"
 *  - [ ['a', 1], ['b', -1] ]      → "a:1|b:-1"
 *  - "field"                       → "field:1"
 *  - new Map([['a', 1]])          → "a:1"
 *
 * @param key - The index spec in any supported form.
 * @returns Stable signature string for the key.
 */
const normalizeIndexKey = (key: mongoDB.IndexSpecification): string => {
  if (typeof key === 'string') return `${key}:1`;

  if (Array.isArray(key)) {
    const tuples = key as unknown as Array<[string, mongoDB.IndexDirection]>;
    return tuples.map(([k, v]) => `${String(k)}:${String(v)}`).join('|');
  }

  if (key instanceof Map) {
    return Array.from(key.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${String(k)}:${String(v)}`)
      .join('|');
  }

  const obj = key as Record<string, unknown>;
  return Object.entries(obj)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${String(v)}`)
    .join('|');
};

export { toObjectId, transformId, asIndexKey, normalizeIndexKey };
