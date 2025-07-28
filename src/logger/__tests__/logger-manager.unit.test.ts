import { setLogger, setLogLevels, Log, logLevels } from '../logger-manager';
import { Logger } from '../logger.interface';
import { RecordResult } from '../../handlers/handler.type';
import { ConsoleLogger } from '../console.logger';

jest.mock('../console.logger', () => ({
  ConsoleLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    handlerResults: jest.fn(),
  },
}));

describe('Logger Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setLogLevels({
      info: true,
      warn: true,
      error: true,
      handlerResults: true,
    });

    setLogger(ConsoleLogger);
  });

  describe('setLogger', () => {
    it('should set a custom logger', () => {
      const customLogger: Partial<Logger> = {
        info: jest.fn(),
      };

      setLogger(customLogger);
      Log.info('Test info message');

      expect(customLogger.info).toHaveBeenCalledWith('Test info message');
      expect(ConsoleLogger.info).not.toHaveBeenCalled();
    });

    it('should use default ConsoleLogger methods when no custom logger is provided', () => {
      // setLogger({});

      Log.info('Test info message');
      Log.warn('Test warning message');
      Log.error('Test error message');

      expect(ConsoleLogger.info).toHaveBeenCalledWith('Test info message');
      expect(ConsoleLogger.warn).toHaveBeenCalledWith('Test warning message');
      expect(ConsoleLogger.error).toHaveBeenCalledWith('Test error message');
    });
  });

  describe('setLogLevels', () => {
    it('should update log levels and only log messages for enabled levels', () => {
      setLogLevels({ info: false, warn: true, error: false });

      Log.info('This should not log');
      Log.warn('This should log');
      Log.error('This should not log');

      expect(ConsoleLogger.info).not.toHaveBeenCalled();
      expect(ConsoleLogger.warn).toHaveBeenCalledWith('This should log');
      expect(ConsoleLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('Log methods', () => {
    it('should log info messages when info level is enabled', () => {
      setLogLevels({ info: true, warn: false, error: false });

      Log.info('Info message');
      expect(ConsoleLogger.info).toHaveBeenCalledWith('Info message');
      expect(ConsoleLogger.warn).not.toHaveBeenCalled();
      expect(ConsoleLogger.error).not.toHaveBeenCalled();
    });

    it('should not log info messages when info level is disabled', () => {
      setLogLevels({ info: false, warn: true, error: false });

      Log.info('This should not log');
      expect(ConsoleLogger.info).not.toHaveBeenCalled();
    });

    it('should log warn messages when warn level is enabled', () => {
      setLogLevels({ info: false, warn: true, error: false });

      Log.warn('Warn message');
      expect(ConsoleLogger.warn).toHaveBeenCalledWith('Warn message');
      expect(ConsoleLogger.info).not.toHaveBeenCalled();
    });

    it('should log error messages when error level is enabled', () => {
      setLogLevels({ info: false, warn: false, error: true });

      Log.error('Error message');
      expect(ConsoleLogger.error).toHaveBeenCalledWith('Error message');
      expect(ConsoleLogger.warn).not.toHaveBeenCalled();
      expect(ConsoleLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('handlerResult', () => {
    it('should log handler results when handlerResults level is enabled', () => {
      const mockHandlerResults: RecordResult = {
        event: { eventType: 'Test Event', id: '12345', generatedTimestamp: new Date() },
        name: 'Test Handler',
        steps: [
          {
            step: 'doAction',
            result: { status: 'success' },
            timestamp: new Date(),
          },
        ],
        user: { id: '12345', uniqueIdentifier: "12345", attributes: { name: 'Test User', email: 'test@test.com' } },
      };

      setLogLevels({
        info: false,
        warn: false,
        error: false,
        handlerResults: true,
      });

      Log.handlerResult(mockHandlerResults);

      expect(ConsoleLogger.handlerResults).toHaveBeenCalledWith(
        mockHandlerResults
      );
    });

    it('should not log handler results when handlerResults level is disabled', () => {
      const mockHandlerResults: RecordResult = {
        event: { eventType: 'Test Event', id: '12345', generatedTimestamp: new Date() },
        name: 'Test Handler',
        steps: [
          {
            step: 'doAction',
            result: { status: 'success' },
            timestamp: new Date(),
          },
        ],
        user: { id: '12345', uniqueIdentifier: "12345", attributes: { name: 'Test User', email: 'test@test.com' } },
      };

      setLogLevels({
        info: false,
        warn: false,
        error: false,
        handlerResults: false,
      });

      Log.handlerResult(mockHandlerResults);

      expect(ConsoleLogger.handlerResults).not.toHaveBeenCalled();
    });
  });
});
