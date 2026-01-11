import { makeLoggerSandbox, type CapturedEmit, type LoggerSandboxOptions } from './logger.sandbox';

/**
 * The spy-enabled logger sandbox returned by {@link loggerSpies}.
 */
export type LoggerSpies = ReturnType<typeof makeLoggerSandbox> & {
  /**
   * Convenience alias for the underlying sandbox's captured entries.
   */
  captured: CapturedEmit[];
};

/**
 * Creates a logger sandbox with convenient spies around the global logger.
 *
 * This preserves the ergonomic `loggerSpies()` API used throughout tests.
 */
export function loggerSpies(options?: LoggerSandboxOptions): LoggerSpies {
  const lg = makeLoggerSandbox(options);
  return {
    ...lg,
    captured: lg.captured,
  };
}
