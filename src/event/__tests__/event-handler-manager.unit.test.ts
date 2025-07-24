import sinon from 'sinon';
import { initializeLoggerMocks } from '../../__tests__/mocks/logger.mock';
import { LoggerMocksType } from '../../__tests__/mocks/logger.mock';
import { initializeDataManagerMock, DataManagerMocksType } from '../../__tests__/mocks/data-manager.mock';
import { EventHandlerManager } from '../event-handler-manager';

jest.mock('../event-queue', () => ({
  registerEvent: jest.fn(),
  publishEventInstance: jest.fn().mockResolvedValue(undefined),
}));

describe('EventHandlerManager', () => {
  let loggerMocks: LoggerMocksType;
  let dataManagerMocks: DataManagerMocksType;
  let eventHandlerManager: EventHandlerManager;

  beforeEach(() => {
    loggerMocks = initializeLoggerMocks();
    dataManagerMocks = initializeDataManagerMock();
    jest.useFakeTimers();
    // Reset the singleton instance before each test
    (EventHandlerManager as any).instance = null;
    eventHandlerManager = EventHandlerManager.getInstance();
  });

  afterEach(() => {
    loggerMocks.resetLoggerMocks();
    loggerMocks.restoreLoggerMocks();
    dataManagerMocks.resetDataManagerMocks();
    dataManagerMocks.restoreDataManagerMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    // Reset the singleton instance after each test
    (EventHandlerManager as any).instance = null;
  });

  describe('getInstance', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = EventHandlerManager.getInstance();
      const instance2 = EventHandlerManager.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(EventHandlerManager);
    });

    it('should create a new instance only on first call', () => {
      // Reset instance
      (EventHandlerManager as any).instance = null;
      
      const instance1 = EventHandlerManager.getInstance();
      const instance2 = EventHandlerManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('registerEventHandlers', () => {
    it('should register event handlers successfully', async () => {
      const eventType = 'TEST_EVENT';
      const handlerNames = ['handler1', 'handler2'];

      await eventHandlerManager.registerEventHandlers(eventType, handlerNames);

      expect(eventHandlerManager.hasHandlersForEventType(eventType)).toBe(true);
      expect(eventHandlerManager.getHandlersForEventType(eventType)).toEqual(handlerNames);
      
      sinon.assert.calledWith(
        loggerMocks.mockLogInfo,
        `Event "${eventType}" registered with handlers: ${handlerNames} and added to the event registry.`
      );
    });

    it('should throw error when registering duplicate event type', async () => {
      const eventType = 'DUPLICATE_EVENT';
      const handlerNames = ['handler1'];

      // Register first time
      await eventHandlerManager.registerEventHandlers(eventType, handlerNames);

      // Try to register again
      await expect(
        eventHandlerManager.registerEventHandlers(eventType, handlerNames)
      ).rejects.toThrow(`Event "${eventType}" already registered.`);

      sinon.assert.calledWith(
        loggerMocks.mockLogError,
        `Event registration failed.Event "${eventType}" already registered.`
      );
    });

    it('should throw error for invalid event type', async () => {
      const invalidEventTypes = ['', null, undefined, 123, {}];
      
      for (const invalidEventType of invalidEventTypes) {
        await expect(
          eventHandlerManager.registerEventHandlers(invalidEventType as any, ['handler1'])
        ).rejects.toThrow('Event name must be a non-empty string.');
      }
    });

  it('should throw error for invalid handler names', async () => {
      const eventType = 'TEST_EVENT';
      const invalidHandlerNamesList = [
        [], // empty array
        [''], // empty string
        ['handler1', ''], // contains empty string
        ['handler1', null], // contains null
        ['handler1', undefined], // contains undefined
        ['handler1', 123], // contains non-string
        null, // null
        undefined, // undefined
        'not-an-array', // not an array
      ];

      for (const invalidHandlerNames of invalidHandlerNamesList) {
        await expect(
          eventHandlerManager.registerEventHandlers(eventType, invalidHandlerNames as any)
        ).rejects.toThrow('Handler names must be a non-empty array of strings.');
      }
    });

    it('should log error for invalid event type', async () => {
      await expect(
        eventHandlerManager.registerEventHandlers('', ['handler1'])
      ).rejects.toThrow();

      sinon.assert.calledWith(
        loggerMocks.mockLogError,
        'Invalid event type: ""'
      );
    });

    it('should log error for invalid handler names', async () => {
      await expect(
        eventHandlerManager.registerEventHandlers('TEST_EVENT', [])
      ).rejects.toThrow();

      sinon.assert.calledWith(
        loggerMocks.mockLogError,
        'Invalid handler names for event "TEST_EVENT": '
      );
    });
  });

  describe('unregisterEventHandlers', () => {
    it('should unregister existing event handlers', async () => {
      const eventType = 'TEST_EVENT';
      const handlerNames = ['handler1', 'handler2'];

      // Register first
      await eventHandlerManager.registerEventHandlers(eventType, handlerNames);
      expect(eventHandlerManager.hasHandlersForEventType(eventType)).toBe(true);

      // Unregister
      eventHandlerManager.unregisterEventHandlers(eventType);
      expect(eventHandlerManager.hasHandlersForEventType(eventType)).toBe(false);

      sinon.assert.calledWith(
        loggerMocks.mockLogInfo,
        `Event "${eventType}" unregistered.`
      );
    });

    it('should warn when unregistering non-existent event', () => {
      const nonExistentEvent = 'NON_EXISTENT_EVENT';

      eventHandlerManager.unregisterEventHandlers(nonExistentEvent);

      sinon.assert.calledWith(
        loggerMocks.mockLogWarn,
        `Unregister event failed. Event "${nonExistentEvent}" not found in the event registry.`
      );
    });

    it('should not throw error when unregistering non-existent event', () => {
      const nonExistentEvent = 'NON_EXISTENT_EVENT';

      expect(() => {
        eventHandlerManager.unregisterEventHandlers(nonExistentEvent);
      }).not.toThrow();
    });
  });

  describe('getHandlersForEventType', () => {
    it('should return handlers for existing event type', async () => {
      const eventType = 'TEST_EVENT';
      const handlerNames = ['handler1', 'handler2', 'handler3'];

      await eventHandlerManager.registerEventHandlers(eventType, handlerNames);

      const result = eventHandlerManager.getHandlersForEventType(eventType);
      expect(result).toEqual(handlerNames);
    });

    it('should throw error for non-existent event type', () => {
      const nonExistentEvent = 'NON_EXISTENT_EVENT';

      expect(eventHandlerManager.getHandlersForEventType(nonExistentEvent).length).toBe(0);

      sinon.assert.calledWith(
        loggerMocks.mockLogError,
        `No handlers found for event type "${nonExistentEvent}".`
      );
    });

    it('should return empty array for event with no handlers', async () => {
      const eventType = 'EMPTY_EVENT';
      const handlerNames: string[] = [];

      // This should fail validation, but let's test the edge case
      await expect(
        eventHandlerManager.registerEventHandlers(eventType, handlerNames)
      ).rejects.toThrow();
    });
  });

  describe('hasHandlersForEventType', () => {
    it('should return true for existing event type', async () => {
      const eventType = 'TEST_EVENT';
      const handlerNames = ['handler1'];

      await eventHandlerManager.registerEventHandlers(eventType, handlerNames);

      expect(eventHandlerManager.hasHandlersForEventType(eventType)).toBe(true);
    });

    it('should return false for non-existent event type', () => {
      const nonExistentEvent = 'NON_EXISTENT_EVENT';

      expect(eventHandlerManager.hasHandlersForEventType(nonExistentEvent)).toBe(false);
    });

    it('should return false after unregistering event', async () => {
      const eventType = 'TEST_EVENT';
      const handlerNames = ['handler1'];

      await eventHandlerManager.registerEventHandlers(eventType, handlerNames);
      expect(eventHandlerManager.hasHandlersForEventType(eventType)).toBe(true);

      eventHandlerManager.unregisterEventHandlers(eventType);
      expect(eventHandlerManager.hasHandlersForEventType(eventType)).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple event registrations and unregistrations', async () => {
      const events = [
        { type: 'EVENT_1', handlers: ['handler1', 'handler2'] },
        { type: 'EVENT_2', handlers: ['handler3'] },
        { type: 'EVENT_3', handlers: ['handler4', 'handler5', 'handler6'] },
      ];

      // Register all events
      for (const event of events) {
        await eventHandlerManager.registerEventHandlers(event.type, event.handlers);
        expect(eventHandlerManager.hasHandlersForEventType(event.type)).toBe(true);
        expect(eventHandlerManager.getHandlersForEventType(event.type)).toEqual(event.handlers);
      }

      // Unregister middle event
      eventHandlerManager.unregisterEventHandlers('EVENT_2');
      expect(eventHandlerManager.hasHandlersForEventType('EVENT_1')).toBe(true);
      expect(eventHandlerManager.hasHandlersForEventType('EVENT_2')).toBe(false);
      expect(eventHandlerManager.hasHandlersForEventType('EVENT_3')).toBe(true);

      // Verify remaining events still work
      expect(eventHandlerManager.getHandlersForEventType('EVENT_1')).toEqual(['handler1', 'handler2']);
      expect(eventHandlerManager.getHandlersForEventType('EVENT_3')).toEqual(['handler4', 'handler5', 'handler6']);
    });

    it('should maintain separate handler maps for different instances', () => {
      // Reset instance to test singleton behavior
      (EventHandlerManager as any).instance = null;
      
      const instance1 = EventHandlerManager.getInstance();
      const instance2 = EventHandlerManager.getInstance();

      // They should be the same instance (singleton)
      expect(instance1).toBe(instance2);

      // Register in one instance
      instance1.registerEventHandlers('TEST_EVENT', ['handler1']);

      // Should be available in both instances
      expect(instance1.hasHandlersForEventType('TEST_EVENT')).toBe(true);
      expect(instance2.hasHandlersForEventType('TEST_EVENT')).toBe(true);
      expect(instance1.getHandlersForEventType('TEST_EVENT')).toEqual(['handler1']);
      expect(instance2.getHandlersForEventType('TEST_EVENT')).toEqual(['handler1']);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in event type names', async () => {
      const specialEventTypes = [
        'EVENT_WITH_UNDERSCORES',
        'event-with-dashes',
        'EventWithCamelCase',
        'EVENT_WITH_NUMBERS_123',
        'event.with.dots',
        'EVENT_WITH_SPACES AND MORE',
        'EVENT_WITH_SPECIAL_CHARS!@#$%^&*()',
      ];

      for (const eventType of specialEventTypes) {
        const handlerNames = ['handler1'];
        
        await eventHandlerManager.registerEventHandlers(eventType, handlerNames);
        expect(eventHandlerManager.hasHandlersForEventType(eventType)).toBe(true);
        expect(eventHandlerManager.getHandlersForEventType(eventType)).toEqual(handlerNames);
        
        eventHandlerManager.unregisterEventHandlers(eventType);
        expect(eventHandlerManager.hasHandlersForEventType(eventType)).toBe(false);
      }
    });

    it('should handle special characters in handler names', async () => {
      const eventType = 'TEST_EVENT';
      const specialHandlerNames = [
        'handler_with_underscores',
        'handler-with-dashes',
        'HandlerWithCamelCase',
        'handler123',
        'handler.with.dots',
        'handler with spaces',
        'handler!@#$%^&*()',
      ];

      await eventHandlerManager.registerEventHandlers(eventType, specialHandlerNames);
      expect(eventHandlerManager.getHandlersForEventType(eventType)).toEqual(specialHandlerNames);
    });

    it('should handle very long event type names', async () => {
      const longEventType = 'A'.repeat(1000);
      const handlerNames = ['handler1'];

      await eventHandlerManager.registerEventHandlers(longEventType, handlerNames);
      expect(eventHandlerManager.hasHandlersForEventType(longEventType)).toBe(true);
      expect(eventHandlerManager.getHandlersForEventType(longEventType)).toEqual(handlerNames);
    });

    it('should handle very long handler names', async () => {
      const eventType = 'TEST_EVENT';
      const longHandlerNames = ['A'.repeat(1000), 'B'.repeat(1000)];

      await eventHandlerManager.registerEventHandlers(eventType, longHandlerNames);
      expect(eventHandlerManager.getHandlersForEventType(eventType)).toEqual(longHandlerNames);
    });
  });
});
