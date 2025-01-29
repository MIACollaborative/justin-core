import { RecordResult } from '../handlers/handler.type';

/**
 * Interface defining methods for logging at various levels.
 */
export interface Logger {
  /**
   * Logs an informational message.
   * @param message - The message to log.
   * @param optionalParams - Additional parameters for the log.
   */
  info(message: string, ...optionalParams: any[]): void;

  /**
   * Logs a warning message.
   * @param message - The message to log.
   * @param optionalParams - Additional parameters for the log.
   */
  warn(message: string, ...optionalParams: any[]): void;

  /**
   * Logs an error message.
   * @param message - The message to log.
   * @param optionalParams - Additional parameters for the log.
   */
  error(message: string, ...optionalParams: any[]): void;

  /**
   * Logs a results of running a task or decision rule.
   * @param handlerResults - Data on the event, the handler and the results of its steps.
   */
  handlerResults(handlerResults: RecordResult): void;
}
