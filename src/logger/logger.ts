import {
  BaseSeverity,
  CreateLoggerOptions,
  EmitFn,
  Logger,
  LoggerCallback,
  LoggerEntry,
} from './types';
import {
  getGlobalEmitFn,
  getGlobalLogCallback,
  getGlobalLogContext,
  getGlobalMinLogLevel,
  getGlobalSeverityRanking,
  defaultEmit,
} from './global';
import { normalizeExtraArg } from './utils';

const BASE_RANKS: Record<BaseSeverity, number> = {
  DEBUG: 10,
  INFO: 30,
  WARNING: 50,
  ERROR: 70,
};

/**
 * Build the effective severity→rank map by combining the built-in ranks
 * with any globally configured custom ranks.
 *
 * @typeParam T - Severity union.
 * @returns A map from severity string to numeric rank.
 */
function buildRankMap<T extends string>(): Record<T, number> {
  const merged: Record<string, number> = { ...BASE_RANKS };
  const globalRanking = getGlobalSeverityRanking();
  if (globalRanking) {
    for (const [k, v] of Object.entries(globalRanking)) {
      merged[k] = v;
    }
  }
  // ensure the base severities always exist
  for (const base of Object.keys(BASE_RANKS) as BaseSeverity[]) {
    if (merged[base] == null) {
      merged[base] = BASE_RANKS[base];
    }
  }
  return merged as Record<T, number>;
}

/**
 * Convert a severity string or numeric level into its numeric rank.
 *
 * @typeParam T - Severity union.
 * @param value - Severity name or numeric rank.
 * @param ranks - Map of severity to numeric rank.
 * @returns Numeric rank for comparison.
 */
function toRank<T extends string>(value: T | number, ranks: Record<T, number>): number {
  if (typeof value === 'number') return value;
  return ranks[value] ?? 0;
}

/**
 * Create a new logger instance with optional instance-level configuration.
 *
 * This version **flattens** extras into the context that is passed to the
 * emit function. That is:
 *
 * - we build an entry with only `{ severity, message }`
 * - we build a merged context with:
 *   - global context
 *   - instance context
 *   - normalized extras (user/event/error/etc.)
 * - we call the effective emit with `(entry, mergedFlatContext)`
 *
 * So the emit function always receives:
 *
 * ```ts
 * {
 *   severity: 'INFO',
 *   message: 'something'
 * }
 * ```
 *
 * and
 *
 * ```ts
 * {
 *   ...globalContext,
 *   ...instanceContext,
 *   ...extrasNormalized
 * }
 * ```
 *
 * @typeParam T - Severity union for this logger.
 * @param options - Logger creation options.
 * @returns A structured (but flattened) logger instance.
 */
function createLogger<T extends string = BaseSeverity>(
  options: CreateLoggerOptions<T> = {},
): Logger<T> {
  // build severity→rank map
  const ranks: Record<T, number> = buildRankMap<T>();

  // figure out initial min level (instance → global)
  let minLevelRank =
    options.emitLevel !== undefined
      ? toRank(options.emitLevel, ranks)
      : toRank(getGlobalMinLogLevel() as T, ranks);

  // instance-level context and overrides
  let instanceContext: Record<string, unknown> = { ...(options.context ?? {}) };
  let instanceEmitFn: EmitFn<T> | undefined = options.emitFn;
  let instanceCallback: LoggerCallback<T> | undefined = options.cb;

  /**
   * Check if a severity should be emitted with current min level.
   *
   * @param sev - Severity to check.
   * @returns True if it should be emitted.
   */
  const shouldEmit = (sev: T) => toRank(sev, ranks) >= minLevelRank;

  /**
   * Core emit function used by the convenience methods.
   *
   * @param severity - Severity string.
   * @param message - Log message.
   * @param extras - Optional extras (user, event, error, etc.).
   */
  const emit = (severity: T, message: string, extras?: unknown): void => {
    // always normalize severity to upper-case for consistency
    const sevUpper = String(severity).toUpperCase() as T;
    if (!shouldEmit(sevUpper)) return;

    // normalize extras into a flat object (or undefined)
    const normalizedExtras = extras ? normalizeExtraArg(extras) : undefined;

    // build the entry WITHOUT tucking things under `fields`
    const entry: LoggerEntry<T> = {
      severity: sevUpper,
      message,
      // fields: undefined   ← we intentionally do not set this
    };

    // build the flattened context to pass to emit
    const mergedContext = {
      ...getGlobalLogContext(),
      ...instanceContext,
      ...(normalizedExtras ?? {}),
    };

    // pick the effective emit fn
    const effectiveEmit = instanceEmitFn ?? getGlobalEmitFn<T>() ?? defaultEmit<T>;

    // call it with the flattened shape
    effectiveEmit(entry, mergedContext);

    // handle callbacks (instance → global)
    const globalCb = getGlobalLogCallback<T>();
    if (instanceCallback) {
      try {
        instanceCallback(entry);
      } catch {
        /* ignore */
      }
    } else if (globalCb) {
      try {
        globalCb(entry);
      } catch {
        /* ignore */
      }
    }
  };

  /**
   * Convenience DEBUG logger.
   *
   * @param message - Log message.
   * @param extras - Optional extras to flatten into context.
   */
  const debug = (message: string, extras?: unknown) => emit('DEBUG' as T, message, extras);

  /**
   * Convenience INFO logger.
   *
   * @param message - Log message.
   * @param extras - Optional extras to flatten into context.
   */
  const info = (message: string, extras?: unknown) => emit('INFO' as T, message, extras);

  /**
   * Convenience WARNING logger.
   *
   * @param message - Log message.
   * @param extras - Optional extras to flatten into context.
   */
  const warn = (message: string, extras?: unknown) => emit('WARNING' as T, message, extras);

  /**
   * Convenience ERROR logger.
   *
   * @param message - Log message.
   * @param extras - Optional extras to flatten into context.
   */
  const error = (message: string, extras?: unknown) => emit('ERROR' as T, message, extras);

  return {
    /**
     * Instance-level min logging level.
     *
     * @param level - New minimum level (string or numeric).
     */
    setLevel(level: T | number) {
      minLevelRank = toRank(level, ranks);
    },

    /**
     * Merge additional context into this logger.
     *
     * @param next - Additional context to include on every line.
     */
    setContext(next: Record<string, unknown>) {
      instanceContext = { ...instanceContext, ...next };
    },

    /**
     * Override the emit function for this logger instance.
     *
     * @param next - New emit function.
     */
    setEmitFn(next: EmitFn<T>) {
      instanceEmitFn = next;
    },

    /**
     * Override the callback for this logger instance.
     *
     * @param next - New callback function.
     */
    setCallback(next?: LoggerCallback<T>) {
      instanceCallback = next;
    },

    emit,
    debug,
    info,
    warn,
    error,
  };
}

export { createLogger };
