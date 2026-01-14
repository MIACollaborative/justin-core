export { createLogger } from './logger';

export type {
  BaseSeverity,
  Logger,
  LoggerEntry,
  EmitFn,
  LoggerCallback,
  GlobalLoggerConfig as LoggerConfig,
} from './types';

export { configureGlobalLoggerSettings as configureLogger } from './global';
