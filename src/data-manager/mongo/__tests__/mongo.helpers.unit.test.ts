import * as mongoDB from 'mongodb';
import sinon, { SinonSandbox } from 'sinon';
import { NO_ID } from '../../data-manager.constants';
import { toObjectId, transformId, asIndexKey, normalizeIndexKey } from '../mongo.helpers';
import { loggerSpies } from '../../../__tests__/testkit';
import { expectLog } from '../../../__tests__/helpers';

describe('mongo.helpers (unit)', () => {
  let sb: SinonSandbox;
  let logs: ReturnType<typeof loggerSpies>;

  beforeEach(() => {
    sb = sinon.createSandbox();
    logs = loggerSpies();
  });

  afterEach(() => {
    logs.restore();
    sb.restore();
  });

  describe('toObjectId', () => {
    it('returns an ObjectId for a valid hex string', () => {
      const idStr = new mongoDB.ObjectId().toHexString();

      const result = toObjectId(idStr);

      expect(result).toBeInstanceOf(mongoDB.ObjectId);
      expect(result?.toHexString()).toBe(idStr);
      expect(logs.captured.length).toBe(0);
    });

    it('returns null and logs when given null/undefined', () => {
      const r1 = toObjectId(null);
      const r2 = toObjectId(undefined);

      expect(r1).toBeNull();
      expect(r2).toBeNull();

      expect(logs.captured.length).toBe(2);

      // Don’t assume ordering; assert content.
      const messages = logs.captured.map((c) => String(c.entry.message));
      expect(messages).toContain('Invalid ObjectId format: null');
      expect(messages).toContain('Invalid ObjectId format: undefined');

      logs.captured.forEach((c) => {
        expectLog(c, { severity: 'ERROR' });
      });
    });

    it('returns null and logs when given a non-string', () => {
      // @ts-expect-error intentional bad input
      const result = toObjectId(123);

      expect(result).toBeNull();

      expectLog(logs.last(), {
        severity: 'ERROR',
        messageSubstr: 'Invalid ObjectId format: 123',
      });
    });

    it('returns null and logs when string cannot be parsed as ObjectId', () => {
      const result = toObjectId('not-a-valid-object-id');

      expect(result).toBeNull();

      expectLog(logs.last(), {
        severity: 'ERROR',
        messageSubstr: 'Invalid ObjectId format: not-a-valid-object-id',
      });
    });
  });

  describe('transformId', () => {
    it('returns null when doc is null/undefined', () => {
      expect(transformId(null)).toBeNull();
      expect(transformId(undefined)).toBeNull();
    });

    it('moves _id to id as string and keeps other fields', () => {
      const _id = new mongoDB.ObjectId();
      const doc = {
        _id,
        name: 'test',
        value: 42,
      };

      const result = transformId(doc);

      expect(result).toEqual({
        id: _id.toString(),
        name: 'test',
        value: 42,
      });
    });

    it('uses NO_ID when _id is missing', () => {
      const doc = {
        name: 'no _id',
      };

      const result = transformId(doc);

      expect(result).toEqual({
        id: NO_ID,
        name: 'no _id',
      });
    });

    it('handles _id that is not an ObjectId but has toString()', () => {
      const doc = {
        _id: {
          toString: () => 'custom-id',
        },
        extra: true,
      };

      const result = transformId(doc);

      expect(result).toEqual({
        id: 'custom-id',
        extra: true,
      });
    });
  });

  describe('asIndexKey', () => {
    it('converts string key to object with ascending direction', () => {
      const result = asIndexKey('field');

      expect(result).toEqual({ field: 1 });
    });

    it('converts array of tuples to object', () => {
      const result = asIndexKey([
        ['a', 1],
        ['b', -1],
      ] as any);

      expect(result).toEqual({ a: 1, b: -1 });
    });

    it('returns Map as-is', () => {
      const m = new Map<string, mongoDB.IndexDirection>([
        ['x', 1],
        ['y', -1],
      ]);

      const result = asIndexKey(m);

      expect(result).toBe(m);
    });

    it('returns object as-is when already in object form', () => {
      const key = { a: 1, b: -1 } as Record<string, mongoDB.IndexDirection>;

      const result = asIndexKey(key);

      expect(result).toBe(key);
    });
  });

  describe('normalizeIndexKey', () => {
    it('normalizes string key to "field:1"', () => {
      expect(normalizeIndexKey('field')).toBe('field:1');
    });

    it('normalizes array tuples preserving order', () => {
      const sig = normalizeIndexKey([
        ['a', 1],
        ['b', -1],
      ] as any);

      expect(sig).toBe('a:1|b:-1');
    });

    it('normalizes Map keys in sorted order', () => {
      const m = new Map<string, mongoDB.IndexDirection>([
        ['b', -1],
        ['a', 1],
      ]);

      const sig = normalizeIndexKey(m);

      expect(sig).toBe('a:1|b:-1');
    });

    it('normalizes object keys in sorted order', () => {
      const sig = normalizeIndexKey({
        b: -1,
        a: 1,
      });

      expect(sig).toBe('a:1|b:-1');
    });
  });
});
