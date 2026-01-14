import { JUser } from '../user-manager/user.type';

/**
 * Return a new object with `key` added.
 * If the key already exists, a numeric suffix is appended (`key_2`, `key_3`, ...),
 * so we never overwrite existing data.
 *
 * This function is pure — it does not mutate `target`.
 *
 * @param target - The object to extend.
 * @param key - The desired property name.
 * @param value - The value to set for the property.
 * @returns A new object containing all properties of `target` plus the new (or suffixed) key.
 */
function mergeWithPossibleSuffix(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> {
  if (!(key in target)) {
    return { ...target, [key]: value };
  }

  let i = 2;
  let candidate = `${key}_${i}`;
  while (candidate in target) {
    i++;
    candidate = `${key}_${i}`;
  }

  return { ...target, [candidate]: value };
}

/**
 * Attempt to extract a normalized "user" shape from an unknown value.
 *
 * We consider it a JUser-like value if EITHER:
 * - it has a `uniqueIdentifier` property, OR
 * - it has BOTH `id` and `attributes` (a pattern your JUser type uses, and JEvent does not)
 *
 * We always normalize to:
 * `{ uniqueIdentifier: <value> }`
 *
 * @param value - Value that might be a JUser-like object.
 * @returns A normalized user object or `undefined` if the input is not user-like.
 */
function extractFromJUser(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const maybeUser = value as Partial<JUser>;

  // explicit uniqueIdentifier wins
  if (typeof maybeUser.uniqueIdentifier === 'string') {
    return { uniqueIdentifier: maybeUser.uniqueIdentifier };
  }

  // fallback: id + attributes → user
  if (
    typeof maybeUser.id === 'string' &&
    typeof maybeUser.attributes === 'object' &&
    maybeUser.attributes !== null
  ) {
    return { uniqueIdentifier: maybeUser.id };
  }

  return undefined;
}

/**
 * Attempt to extract a normalized "event" shape from an unknown value.
 *
 * We consider it "event-like" if it has at least one event-specific field:
 * - `eventType`
 * - `publishedTimestamp`
 * - `generatedTimestamp`
 *
 * (Note: `id` alone is NOT enough; other domain objects can have `id` too.)
 *
 * We normalize to:
 * `{ eventId?, eventType?, eventTime? }`
 *
 * @param value - Value that might be an event-like object.
 * @returns A normalized event object or `undefined` if the input is not event-like.
 */
type JEventLike = {
  id?: unknown;
  eventType?: unknown;
  publishedTimestamp?: unknown;
  generatedTimestamp?: unknown;
};

function extractFromJEvent(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const maybeEvent = value as JEventLike;

  // must have at least one event-ish field
  if (!maybeEvent.eventType && !maybeEvent.publishedTimestamp && !maybeEvent.generatedTimestamp) {
    return undefined;
  }

  const out: Record<string, unknown> = {};

  if (typeof maybeEvent.id === 'string') {
    out.eventId = maybeEvent.id;
  }

  if (typeof maybeEvent.eventType === 'string') {
    out.eventType = maybeEvent.eventType;
  }

  const when = maybeEvent.publishedTimestamp ?? maybeEvent.generatedTimestamp;

  if (when instanceof Date) {
    out.eventTime = when.toISOString();
  } else if (typeof when === 'string') {
    out.eventTime = when;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Normalize a single leaf value so it is safe and consistent for JSON logging.
 *
 * Rules:
 * - `Error` → `{ name, message, stack }`
 * - `Date`  → ISO string
 * - everything else → returned as-is
 *
 * @param value - The value to normalize.
 * @returns The JSON-log-friendly normalized value.
 */
function normalizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

/**
 * Normalize one property from an object of extras.
 *
 * Special handling:
 * - If the value is JUser-like:
 *   - and the key is exactly `"user"` → collapse to `{ uniqueIdentifier: ... }`
 *   - otherwise → keep the key, e.g. `{ actor: { uniqueIdentifier: ... } }`
 * - If the value is JEvent-like:
 *   - and the key is exactly `"event"` → collapse to `{ event: { ... } }`
 *   - otherwise → keep the key, e.g. `{ primaryEvent: { event: { ... } } }`
 * - Otherwise → `{ [key]: normalizeValue(value) }`
 *
 * @param key - The original property name.
 * @param value - The original property value.
 * @returns A partial object that can be merged into the final fields object.
 */
function normalizeObjectEntry(key: string, value: unknown): Record<string, unknown> {
  const userBits = extractFromJUser(value);
  if (userBits) {
    if (key === 'user') {
      return userBits;
    }
    return { [key]: userBits };
  }

  const eventBits = extractFromJEvent(value);
  if (eventBits) {
    if (key === 'event') {
      return { event: eventBits };
    }
    return { [key]: eventBits };
  }

  return { [key]: normalizeValue(value) };
}

/**
 * Normalize a single "extras" argument (often something like
 * `{ user, event, error, ... }`) into a flat object suitable for logging.
 *
 * Behaviors:
 * - `Error` → `{ error: { name, message, stack } }`
 * - `Date` → `{ date: "<iso>" }`
 * - top-level JUser-like → `{ uniqueIdentifier: ... }`
 * - top-level JEvent-like → `{ event: { eventId?, eventType?, eventTime? } }`
 * - plain object → each property is normalized via {@link normalizeObjectEntry}
 *   and merged together, with suffixing via {@link mergeWithPossibleSuffix} to
 *   avoid key collisions
 * - primitive → `{ value: primitive }`
 *
 * @param arg - The extra value passed to the logger.
 * @returns A flat object of normalized fields, or `undefined` if nothing could be extracted.
 */
function normalizeExtraArg(arg: unknown): Record<string, unknown> | undefined {
  if (arg instanceof Error) {
    return { error: normalizeValue(arg) };
  }

  if (arg instanceof Date) {
    return { date: normalizeValue(arg) };
  }

  if (arg === undefined || arg === null) {
    return undefined;
  }

  if (typeof arg === 'object' && !Array.isArray(arg)) {
    const extractedUserinfo = extractFromJUser(arg);
    if (extractedUserinfo) {
      return extractedUserinfo;
    }

    const extractedEventInfo = extractFromJEvent(arg);
    if (extractedEventInfo) {
      return { event: extractedEventInfo };
    }

    let out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(arg as Record<string, unknown>)) {
      const partial = normalizeObjectEntry(key, val);
      for (const [pKey, pVal] of Object.entries(partial)) {
        out = mergeWithPossibleSuffix(out, pKey, pVal);
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  // primitive (string/number/boolean)
  return { value: arg };
}

export { mergeWithPossibleSuffix, normalizeExtraArg };
