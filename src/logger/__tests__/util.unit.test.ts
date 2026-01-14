import { mergeWithPossibleSuffix, normalizeExtraArg } from '../utils';

describe('mergeWithPossibleSuffix', () => {
  it('adds a new key when it does not exist', () => {
    const target = { foo: 1 };
    const result = mergeWithPossibleSuffix(target, 'bar', 2);

    expect(result).toEqual({ foo: 1, bar: 2 });
  });

  it('appends _2 when the key already exists', () => {
    const target = { foo: 1 };
    const result = mergeWithPossibleSuffix(target, 'foo', 99);

    expect(result).toEqual({ foo: 1, foo_2: 99 });
  });

  it('appends _3, _4... until a free key is found', () => {
    const target = { foo: 1, foo_2: 2, foo_3: 3 };
    const result = mergeWithPossibleSuffix(target, 'foo', 99);

    expect(result).toEqual({
      foo: 1,
      foo_2: 2,
      foo_3: 3,
      foo_4: 99,
    });
  });

  it('does not mutate the original object', () => {
    const target: Record<string, unknown> = { foo: 1 };
    const result = mergeWithPossibleSuffix(target, 'foo', 2);

    expect(target).toEqual({ foo: 1 });
    expect(result).not.toBe(target);
  });
});

describe('normalizeExtraArg', () => {
  it('returns undefined for undefined', () => {
    expect(normalizeExtraArg(undefined)).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(normalizeExtraArg(null)).toBeUndefined();
  });

  it('wraps primitives under "value"', () => {
    expect(normalizeExtraArg('hello')).toEqual({ value: 'hello' });
    expect(normalizeExtraArg(42)).toEqual({ value: 42 });
    expect(normalizeExtraArg(false)).toEqual({ value: false });
  });

  it('normalizes Error instances to error: { name, message, stack }', () => {
    const err = new Error('boom');
    const result = normalizeExtraArg(err) as Record<string, unknown>;

    expect(result).toHaveProperty('error');
    const inner = result.error as Record<string, unknown>;
    expect(inner.name).toBe('Error');
    expect(inner.message).toBe('boom');
    expect(Object.prototype.hasOwnProperty.call(inner, 'stack')).toBe(true);
  });

  it('normalizes Date instances to ISO under "date"', () => {
    const d = new Date('2025-01-02T03:04:05.000Z');
    const result = normalizeExtraArg(d);
    expect(result).toEqual({ date: d.toISOString() });
  });

  it('detects a JUser-like object with uniqueIdentifier', () => {
    const userLike = { uniqueIdentifier: 'user-123' };
    const result = normalizeExtraArg(userLike);
    expect(result).toEqual({ uniqueIdentifier: 'user-123' });
  });

  it('detects a JEvent-like object with string timestamp', () => {
    const eventLike = {
      id: 'evt-1',
      eventType: 'CLICK',
      publishedTimestamp: '2025-01-01T00:00:00.000Z',
    };
    const result = normalizeExtraArg(eventLike);
    expect(result).toEqual({
      event: {
        eventId: 'evt-1',
        eventType: 'CLICK',
        eventTime: '2025-01-01T00:00:00.000Z',
      },
    });
  });

  it('detects a JEvent-like object with Date timestamp', () => {
    const when = new Date('2025-01-01T00:00:00.000Z');
    const eventLike = {
      id: 'evt-2',
      generatedTimestamp: when,
    };
    const result = normalizeExtraArg(eventLike);
    expect(result).toEqual({
      event: {
        eventId: 'evt-2',
        eventTime: when.toISOString(),
      },
    });
  });

  it('walks a composite object and normalizes each property', () => {
    const err = new Error('nope');
    const extras = {
      user: { uniqueIdentifier: 'user-789' },
      event: {
        id: 'evt-9',
        eventType: 'LOGIN',
        publishedTimestamp: '2025-01-03T10:00:00.000Z',
      },
      error: err,
      count: 5,
    };

    const result = normalizeExtraArg(extras)!;

    expect(result.uniqueIdentifier).toBe('user-789');

    expect(result.event).toEqual({
      eventId: 'evt-9',
      eventType: 'LOGIN',
      eventTime: '2025-01-03T10:00:00.000Z',
    });

    expect(result.error).toMatchObject({
      name: 'Error',
      message: 'nope',
    });

    expect(result.count).toBe(5);
  });

  it('suffixes when two different props normalize to the same key', () => {
    const extras = {
      user: { uniqueIdentifier: 'user-1' },
      actor: { uniqueIdentifier: 'user-2' },
    };

    const result = normalizeExtraArg(extras)!;

    expect(result).toEqual({
      uniqueIdentifier: 'user-1',
      actor: { uniqueIdentifier: 'user-2' },
    });
  });

  it('returns undefined for an empty object', () => {
    const result = normalizeExtraArg({});
    expect(result).toBeUndefined();
  });
});
