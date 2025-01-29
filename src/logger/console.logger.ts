import { Logger } from './logger.interface';
import { RecordResult } from '../handlers/handler.type';

/**
 * Default logger implementation that logs messages to the console.
 */
export const ConsoleLogger: Logger = {
  info(message: string, ...optionalParams: any[]): void {
    console.log(`INFO: ${message}`, ...optionalParams);
  },

  warn(message: string, ...optionalParams: any[]): void {
    console.warn(`WARN: ${message}`, ...optionalParams);
  },

  error(message: string, ...optionalParams: any[]): void {
    console.error(`ERROR: ${message}`, ...optionalParams);
  },

  handlerResults(handlerResults: RecordResult): void {
    const {event, eventName, name, steps, userId} = handlerResults
    console.log(
      `Event: "${event} - ${eventName}", Name: "${name}", User id:${userId} Result steps: ${JSON.stringify(steps)}`
    );
  }
};
