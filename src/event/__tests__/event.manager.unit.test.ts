import sinon from 'sinon';
import { initializeLoggerMocks } from '../../__tests__/mocks/logger.mock';
import { LoggerMocksType } from '../../__tests__/mocks/logger.mock';
import { initializeDataManagerMock, DataManagerMocksType } from '../../__tests__/mocks/data-manager.mock';
import EventManager from '../event.manager';

jest.mock('../event-queue', () => ({
  registerEvent: jest.fn(),
  publishEventInstance: jest.fn().mockResolvedValue(undefined),
}));

describe('EventManager', () => {
  let loggerMocks: LoggerMocksType;
  let dataManagerMocks: DataManagerMocksType;

  beforeEach(() => {
    loggerMocks = initializeLoggerMocks();
    dataManagerMocks = initializeDataManagerMock();
    jest.useFakeTimers();
  });

  afterEach(() => {
    loggerMocks.resetLoggerMocks();
    loggerMocks.restoreLoggerMocks();
    dataManagerMocks.resetDataManagerMocks();
    dataManagerMocks.restoreDataManagerMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('registerClockEventHandlers', () => {
    it('should register a clock event with interval and log info', async () => {
      const name = 'testClockEvent';
      const interval = 1000;
      const procedures = ['procedure1'];

      dataManagerMocks.mockGetAllInCollection.resolves([]);

      await EventManager.registerClockEventHandlers(name, interval, procedures);

      sinon.assert.calledWith(dataManagerMocks.mockGetAllInCollection, 'events');
      sinon.assert.calledWith(
        loggerMocks.mockLogInfo,
        `Clock event "${name}" registered with interval ${interval}ms.`
      );
    });

    it('should warn if the clock event is already registered', async () => {
      const name = 'testClockEvent';
      const procedures = ['procedure1'];

      dataManagerMocks.mockGetAllInCollection.resolves([{ eventType: 'CLOCK_EVENT', name }]);
      await EventManager.registerClockEventHandlers(name, 1000, procedures);

      sinon.assert.calledWith(
        loggerMocks.mockLogWarn,
        `Clock event "${name}" is already registered.`
      );
    });

    it('should throw an error for invalid interval', async () => {
      await expect(EventManager.registerClockEventHandlers('testEvent', -1000, ['procedure']))
        .rejects.toThrow('Interval must be a positive number.');

      sinon.assert.calledWith(
        loggerMocks.mockLogError,
        `Invalid interval for clock event "testEvent": -1000`
      );
    });
  });

  describe('registerCustomEventHandlers', () => {
    it('should register a custom event successfully', async () => {
      const name = 'customEvent';
      const eventType = 'CUSTOM_EVENT';
      const procedures = ['procedure1'];

      await EventManager.registerCustomEventHandlers(name, eventType, procedures);

      sinon.assert.calledWith(
        loggerMocks.mockLogInfo,
        `Custom event "${name}" registered and added to the queue.`
      );
    });

    it('should throw an error for invalid event parameters', async () => {
      await expect(EventManager.registerCustomEventHandlers('', 'CUSTOM_EVENT', ['procedure']))
        .rejects.toThrow('Event name must be a non-empty string.');

      await expect(EventManager.registerCustomEventHandlers('customEvent', 'CUSTOM_EVENT', []))
        .rejects.toThrow('Procedures must be a non-empty array of strings.');
    });
  });

  describe('initializeClockEvents', () => {
    it('should initialize clock events from the database', async () => {
      const clockEvent = {
        id: 'event1',
        eventType: 'CLOCK_EVENT',
        name: 'clockEvent',
        procedures: ['procedure1'],
        interval: 1000,
      };

      dataManagerMocks.mockGetAllInCollection.resolves([clockEvent]);

      await EventManager.initializeClockEvents();

      sinon.assert.calledWith(
        loggerMocks.mockLogInfo,
        `Clock event "clockEvent" initialized with interval 1000ms.`
      );
    });

    it('should warn if no clock events are found', async () => {
      dataManagerMocks.mockGetAllInCollection.resolves([]);

      await EventManager.initializeClockEvents();

      sinon.assert.calledWith(
        loggerMocks.mockLogWarn,
        'No clock events found to initialize.'
      );
    });

    it('should skip initialization if metadata is incomplete', async () => {
      const incompleteEvent = {
        id: 'event2',
        eventType: 'CLOCK_EVENT',
        name: 'incompleteEvent',
      };

      dataManagerMocks.mockGetAllInCollection.resolves([incompleteEvent]);

      await EventManager.initializeClockEvents();

      sinon.assert.calledWith(
        loggerMocks.mockLogWarn,
        `Incomplete metadata for clock event "incompleteEvent". Skipping initialization.`
      );
    });
  });

  describe('startClockEventInterval', () => {
    it('should schedule an event at the correct aligned interval', () => {
      const name = 'intervalTest';
      const interval = 120000; // 2 minutes
      const procedures = ['procedure1'];

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      EventManager.startClockEventInterval(name, interval, procedures);

      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(setIntervalSpy).not.toHaveBeenCalled();

      jest.runAllTimers();

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(loggerMocks.mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining(`Clock event "${name}" started`)
      );
    });
  });

    describe('unregisterEventHandlers', () => {
      it('should unregister an existing clock event', () => {
        const name = 'unregisterTest';
        const intervalId = setInterval(() => {}, 1000);
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

        EventManager.unregisterEventHandler(name);

        expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
        expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
        expect(loggerMocks.mockLogInfo).toHaveBeenCalledWith(
          `Clock event "${name}" unregistered and stopped.`
        );
      });

      it('should log when trying to unregister a non-existent event', () => {
        EventManager.unregisterEventHandler('nonExistentEvent');

        expect(loggerMocks.mockLogInfo).toHaveBeenCalledWith(
          `Custom event "nonExistentEvent" unregistered.`
        );
      });
    });
  });
