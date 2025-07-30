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

  dev(...args: any[]): void {
    if (process.env.NODE_ENV !== 'PROD') {
      console.log('DEV:', ...args);
    }
  }
};
