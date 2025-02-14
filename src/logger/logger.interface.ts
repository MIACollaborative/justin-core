import { RecordResult } from '../handlers/handler.type';

/**
 * Interface defining methods for logging at various levels, with optional custom functions.
 */
export interface Logger {
  /**
   * Logs an informational message.
   * @param args - The arguments to log (can be any type of data like strings, objects, etc.).
   */
  info?: (...args: any[]) => void;

  /**
   * Logs a warning message.
   * @param args - The arguments to log (can be any type of data like strings, objects, etc.).
   */
  warn?: (...args: any[]) => void;

  /**
   * Logs an error message.
   * @param args - The arguments to log (can be any type of data like strings, objects, etc.).
   */
  error?: (...args: any[]) => void;

  /**
   * Logs a result of running a task or decision rule.
   * @param handlerResults - Data on the event, the handler, and the results of its steps.
   */
  handlerResults?: (handlerResults: RecordResult) => void;
}
