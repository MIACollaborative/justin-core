import { Log } from '../logger/logger-manager';

/**
 * Logs and throws a database-related error.
 *
 * This function is used to log an error message and associated error details,
 * then rethrows the error to ensure it propagates through the application.
 * If the error provided is not an instance of `Error`, it wraps the error
 * in a new `Error` object with the provided message.
 *
 * @param message - A custom error message describing the context of the error.
 * @param error - The error to log and throw; if not an instance of `Error`, it will be wrapped.
 *
 * @throws {Error} Throws the provided error if it is an `Error` instance,
 * or wraps and throws a new `Error` with the specified message if it is not.
 */
export const handleDbError = (message: string, error: unknown): never => {
  Log.error(message, error);
  throw error instanceof Error ? error : new Error(message);
};
