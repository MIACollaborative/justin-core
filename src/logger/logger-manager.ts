import { Logger } from './logger.interface';
import { ConsoleLogger } from './console.logger';

/** Default logger configuration using ConsoleLogger. */
let activeLogger: Logger = ConsoleLogger;

/** Configuration for enabling or disabling specific log levels. */
export const logLevels = {
  info: true,
  warn: true,
  error: true,
  dev: true,
};

/**
 * Sets a custom logger to replace the default ConsoleLogger.
 * If no method is provided by the custom logger, the default ConsoleLogger method will be used.
 * @param {Partial<Logger>} logger - The custom logger implementation to use.
 */
export function setLogger(logger: Partial<Logger>): void {
  activeLogger = {
    info: logger.info || ConsoleLogger.info,
    warn: logger.warn || ConsoleLogger.warn,
    error: logger.error || ConsoleLogger.error,
    dev: logger.dev || ConsoleLogger.dev,
  };
}

/**
 * Updates the log levels that are enabled or disabled.
 * Allows selective control over which log levels should be active.
 * @param {Partial<typeof logLevels>} levels - An object specifying the log levels to enable or disable.
 * @example
 * // Enable only error and debug logs
 * setLogLevels({ info: false, warn: false, error: true, debug: true });
 */
export function setLogLevels(levels: Partial<typeof logLevels>): void {
  Object.assign(logLevels, levels);
}

/**
 * Provides a unified logging interface that respects log level configuration.
 * Each log method will only output if its corresponding log level is enabled.
 */
export const Log = {
  /**
   * Logs an informational message if `info` logging is enabled.
   * @param {string} message - The message to log.
   * @param {...any[]} optionalParams - Additional parameters for the log.
   */
  info(message: string, ...optionalParams: any[]): void {
    if (logLevels.info && activeLogger.info) {
      activeLogger.info(message, ...optionalParams);
    }
  },

  /**
   * Logs a warning message if `warn` logging is enabled.
   * @param {string} message - The message to log.
   * @param {...any[]} optionalParams - Additional parameters for the log.
   */
  warn(message: string, ...optionalParams: any[]): void {
    if (logLevels.warn && activeLogger.warn) {
      activeLogger.warn(message, ...optionalParams);
    }
  },

  /**
   * Logs an error message if `error` logging is enabled.
   * @param {string} message - The message to log.
   * @param {...any[]} optionalParams - Additional parameters for the log.
   */
  error(message: string, ...optionalParams: any[]): void {
    if (logLevels.error && activeLogger.error) {
      activeLogger.error(message, ...optionalParams);
    }
  },

  /**
   * Logs a message if `dev` logging is enabled and env var NODE_ENV === 'dev'.
   * @param {string} message - The message to log.
   * @param {...any[]} optionalParams - Additional parameters for the log.
   */
  dev(message: string, ...optionalParams: any[]): void {
    if (logLevels.dev && activeLogger.dev) {
      activeLogger.dev(message, ...optionalParams);
    }
  }
};
