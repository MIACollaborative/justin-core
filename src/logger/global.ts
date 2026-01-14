import { BaseSeverity, EmitFn, GlobalLoggerConfig, LoggerCallback, LoggerEntry } from './types';

/**
 * Default console-based emitter.
 * Used as the global fallback if no other emitter is set.
 *
 * @typeParam T - Severity union.
 * @param entry - The log entry to emit.
 * @param mergedContext - The merged global + instance context.
 */
function defaultEmit<T extends string = BaseSeverity>(
  entry: LoggerEntry<T>,
  mergedContext: Record<string, unknown>,
): void {
  const line = JSON.stringify({
    severity: entry.severity,
    message: entry.message,
    context: mergedContext,
    fields: entry.fields ?? {},
  });

  const sev = String(entry.severity).toUpperCase();
  switch (sev) {
    case 'DEBUG':
      console.debug(line);
      break;
    case 'WARNING':
      console.warn(line);
      break;
    case 'ERROR':
      console.error(line);
      break;
    case 'INFO':
    default:
      console.log(line);
      break;
  }
}

let _globalMinLevel: string = (process.env.LOG_LEVEL as string) ?? 'DEBUG';
let _globalContext: Record<string, unknown> = {};
let _globalEmitFn: EmitFn<any> | undefined = defaultEmit;
let _globalCallback: LoggerCallback<any> | undefined;
let _globalSeverityRanking: Record<string, number> | undefined;

/**
 * Set the global minimum log level.
 *
 * @param level - The minimum severity name (e.g. "INFO").
 */
function setGlobalMinLogLevel(level: string): void {
  _globalMinLevel = level;
}

/**
 * Get the current global minimum log level.
 *
 * @returns The minimum level as a string.
 */
function getGlobalMinLogLevel(): string {
  return _globalMinLevel;
}

/**
 * Replace the global log context.
 *
 * @param next - Object to use as the new global context.
 */
function setGlobalLogContext(next: Record<string, unknown>): void {
  if (!next || typeof next !== 'object') return;
  _globalContext = next;
}

/**
 * Get a shallow copy of the global log context.
 *
 * @returns Current global context.
 */
function getGlobalLogContext(): Record<string, unknown> {
  return { ..._globalContext };
}

/**
 * Set the global emit function.
 * Falls back to the default console emitter if `undefined` is provided.
 *
 * @typeParam T - Severity union for the emitter.
 * @param fn - The new global emit function, or undefined to reset.
 */
function setGlobalEmitFn<T extends string = BaseSeverity>(fn: EmitFn<T> | undefined): void {
  _globalEmitFn = (fn as EmitFn<any> | undefined) ?? defaultEmit;
}

/**
 * Get the current global emit function.
 *
 * @typeParam T - Severity union for the emitter.
 * @returns The current global emit function.
 */
function getGlobalEmitFn<T extends string = BaseSeverity>(): EmitFn<T> {
  return _globalEmitFn as EmitFn<T>;
}

/**
 * Set the global log callback.
 *
 * @typeParam T - Severity union for the callback.
 * @param cb - The callback to invoke after emitting.
 */
function setGlobalLogCallback<T extends string = BaseSeverity>(
  cb: LoggerCallback<T> | undefined,
): void {
  _globalCallback = cb as LoggerCallback<any> | undefined;
}

/**
 * Get the current global log callback, if any.
 *
 * @typeParam T - Severity union for the callback.
 * @returns The global callback or undefined.
 */
function getGlobalLogCallback<T extends string = BaseSeverity>(): LoggerCallback<T> | undefined {
  return _globalCallback as LoggerCallback<T> | undefined;
}

/**
 * Set a global severity→rank mapping so custom severities can be ordered.
 *
 * @param ranking - Map from severity name to numeric rank.
 */
function setGlobalSeverityRanking(ranking: Record<string, number> | undefined): void {
  _globalSeverityRanking = ranking;
}

/**
 * Get the current global severity→rank mapping.
 *
 * @returns The severity map or undefined if none was set.
 */
function getGlobalSeverityRanking(): Record<string, number> | undefined {
  return _globalSeverityRanking ? { ..._globalSeverityRanking } : undefined;
}

/**
 * Configure all global logger settings in one call.
 *
 * @param config - The global logger configuration.
 */
function configureGlobalLoggerSettings(config: GlobalLoggerConfig): void {
  if (config.level) setGlobalMinLogLevel(config.level);
  if (config.context) setGlobalLogContext(config.context);
  if (config.emitFn) setGlobalEmitFn(config.emitFn);
  if (config.callback) setGlobalLogCallback(config.callback);
  if (config.severityRanking) setGlobalSeverityRanking(config.severityRanking);
}

export {
  defaultEmit,
  getGlobalLogContext,
  getGlobalMinLogLevel,
  setGlobalMinLogLevel,
  setGlobalEmitFn,
  getGlobalEmitFn,
  setGlobalLogCallback,
  getGlobalLogCallback,
  setGlobalLogContext,
  getGlobalSeverityRanking,
  setGlobalSeverityRanking,
  configureGlobalLoggerSettings,
};
