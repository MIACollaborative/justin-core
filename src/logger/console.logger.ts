import { Logger } from './logger.interface';

/**
 * Default logger implementation that logs messages to the console.
 */
export const ConsoleLogger: Logger = {
  info(...args: any[]): void {
    console.log('INFO:', ...args);
  },

  warn(...args: any[]): void {
    console.warn('WARN:', ...args);
  },

  error(...args: any[]): void {
    console.error('ERROR:', ...args);
  },

  handlerResults(...args: any[]): void {
    console.log('Step Result:', ...args);
  },
};
