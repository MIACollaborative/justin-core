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
        `Clock event "clockEvent" trigger set with interval 1000ms.`
      );
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
  });
});
