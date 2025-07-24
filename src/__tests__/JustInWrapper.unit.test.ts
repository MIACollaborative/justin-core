import sinon from 'sinon';
import { JustInWrapper } from '../JustInWrapper';
import DataManager from '../data-manager/data-manager';
import { EventHandlerManager } from '../event/event-handler-manager';
import { UserManager } from '../user-manager/user-manager';
import * as EventQueue from '../event/event-queue';
import * as TaskManager from '../handlers/task.manager';
import * as DecisionRuleManager from '../handlers/decision-rule.manager';
import * as LoggerManager from '../logger/logger-manager';
import { IntervalTimerEventGenerator } from '../event/interval-timer-event-generator';
import { DBType } from '../data-manager/data-manager.constants';
import { TaskRegistration, DecisionRuleRegistration } from '../handlers/handler.type';
import { Logger } from '../logger/logger.interface';
import { logLevels } from '../logger/logger-manager';
import { Log } from '../logger/logger-manager';

// Create stubs for all dependencies
const dataManager = DataManager.getInstance();
const eventHandlerManager = EventHandlerManager.getInstance();

// DataManager stubs
const dataManagerInitStub = sinon.stub(dataManager, 'init');
const dataManagerCloseStub = sinon.stub(dataManager, 'close');

// EventHandlerManager stubs
const registerEventHandlersStub = sinon.stub(eventHandlerManager, 'registerEventHandlers');
const unregisterEventHandlersStub = sinon.stub(eventHandlerManager, 'unregisterEventHandlers');

// UserManager stubs
const userManagerInitStub = sinon.stub(UserManager, 'init');
const userManagerAddUsersToDatabaseStub = sinon.stub(UserManager, 'addUsers');
const userManagerStopUserManagerStub = sinon.stub(UserManager, 'shutdown');

// EventQueue stubs
const publishEventStub = sinon.stub(EventQueue, 'publishEvent');
const processEventQueueStub = sinon.stub(EventQueue, 'processEventQueue');
const setupEventQueueListenerStub = sinon.stub(EventQueue, 'setupEventQueueListener');
const startEventQueueProcessingStub = sinon.stub(EventQueue, 'startEventQueueProcessing');
const stopEventQueueProcessingStub = sinon.stub(EventQueue, 'stopEventQueueProcessing');

// Task and Decision Rule stubs
const registerTaskStub = sinon.stub(TaskManager, 'registerTask');
const registerDecisionRuleStub = sinon.stub(DecisionRuleManager, 'registerDecisionRule');

// Logger stubs
const setLoggerStub = sinon.stub(LoggerManager, 'setLogger');
const setLogLevelsStub = sinon.stub(LoggerManager, 'setLogLevels');
const logWarnStub = sinon.stub(Log, 'warn');

// Mock IntervalTimerEventGenerator
const mockIntervalTimerEventGenerator = {
  start: sinon.stub(),
  stop: sinon.stub(),
};

// JustInWrapper 
const justInWrapper: JustInWrapper = JustInWrapper.getInstance();

// Stub the IntervalTimerEventGenerator constructor
const intervalTimerEventGeneratorStub = sinon.stub().returns(mockIntervalTimerEventGenerator);

describe('JustInWrapper', () => {

  beforeEach(() => {
    justInWrapper.shutdown();
    dataManagerInitStub.reset();
    dataManagerCloseStub.reset();
    registerEventHandlersStub.reset();
    unregisterEventHandlersStub.reset();
    userManagerInitStub.reset();
    userManagerAddUsersToDatabaseStub.reset();
    userManagerStopUserManagerStub.reset();
    publishEventStub.reset();
    processEventQueueStub.reset();
    setupEventQueueListenerStub.reset();
    startEventQueueProcessingStub.reset();
    stopEventQueueProcessingStub.reset();
    registerTaskStub.reset();
    registerDecisionRuleStub.reset();
    setLoggerStub.reset();
    setLogLevelsStub.reset();
    mockIntervalTimerEventGenerator.start.reset();
    mockIntervalTimerEventGenerator.stop.reset();
    intervalTimerEventGeneratorStub.reset();
    logWarnStub.reset();
  });

  afterAll(async () => {
    // Restore all stubs
    dataManagerInitStub.restore();
    dataManagerCloseStub.restore();
    registerEventHandlersStub.restore();
    unregisterEventHandlersStub.restore();
    userManagerInitStub.restore();
    userManagerAddUsersToDatabaseStub.restore();
    userManagerStopUserManagerStub.restore();
    publishEventStub.restore();
    processEventQueueStub.restore();
    setupEventQueueListenerStub.restore();
    startEventQueueProcessingStub.restore();
    stopEventQueueProcessingStub.restore();
    registerTaskStub.restore();
    registerDecisionRuleStub.restore();
    setLoggerStub.restore();
    setLogLevelsStub.restore();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = JustInWrapper.getInstance();
      const instance2 = JustInWrapper.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(JustInWrapper);
    });

    it('should create new instance when none exists', () => {
      // Kill existing instance
      (JustInWrapper as any).killInstance();
      
      const instance = JustInWrapper.getInstance();
      expect(instance).toBeInstanceOf(JustInWrapper);
    });
  });

  describe('init', () => {
    beforeEach(async () => {
      await justInWrapper.shutdown();
    });
    
    it('should initialize database successfully', async () => {
      Log.dev('In init: should initialize database successfully');
      await justInWrapper.init();

      expect(dataManagerInitStub.calledOnce).toBe(true);
      expect(dataManagerInitStub.calledWith(DBType.MONGO)).toBe(true);
      expect(userManagerInitStub.calledOnce).toBe(true);
    });

    it('should initialize database with custom DB type', async () => {
      Log.dev('In init: should initialize database with custom DB type');
      await justInWrapper.init(DBType.MONGO);

      Log.dev('dataManagerInitStub.callCount', dataManagerInitStub.callCount);
      expect(dataManagerInitStub.calledOnce).toBe(true);
      expect(dataManagerInitStub.calledWith(DBType.MONGO)).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      // First initialization
      await justInWrapper.init();
      
      // Reset stub to check if called again
      dataManagerInitStub.reset();
      userManagerInitStub.reset();

      // Second initialization attempt
      await justInWrapper.init();

      expect(dataManagerInitStub.called).toBe(false);
      expect(userManagerInitStub.called).toBe(false);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Database connection failed');
      dataManagerInitStub.rejects(error);

      await expect(justInWrapper.init()).rejects.toThrow('Database connection failed');
    });
  });

  describe('addUsersToDatabase', () => {
    it('should add users to database successfully', async () => {
      const users = [{ name: 'User 1' }, { name: 'User 2' }];

      await justInWrapper.addUsersToDatabase(users);

      expect(userManagerAddUsersToDatabaseStub.calledOnce).toBe(true);
      expect(userManagerAddUsersToDatabaseStub.calledWith(users)).toBe(true);
    });

    it('should handle empty users array', async () => {
      await justInWrapper.addUsersToDatabase([]);

      expect(userManagerAddUsersToDatabaseStub.calledOnce).toBe(true);
      expect(userManagerAddUsersToDatabaseStub.calledWith([])).toBe(true);
    });
  });

  describe('registerEventHandlers', () => {
    it('should register event handlers successfully', async () => {
      const eventType = 'TEST_EVENT';
      const handlers = ['task1', 'decision1'];

      await justInWrapper.registerEventHandlers(eventType, handlers);

      expect(registerEventHandlersStub.calledOnce).toBe(true);
      expect(registerEventHandlersStub.calledWith(eventType, handlers)).toBe(true);
    });

    it('should handle empty handlers array', async () => {
      await justInWrapper.registerEventHandlers('TEST_EVENT', []);

      expect(registerEventHandlersStub.calledOnce).toBe(true);
      expect(registerEventHandlersStub.calledWith('TEST_EVENT', [])).toBe(true);
    });
  });

  describe('unregisterEventHandlers', () => {
    it('should unregister event handlers successfully', () => {
      const eventType = 'TEST_EVENT';

      justInWrapper.unregisterEventHandlers(eventType);

      expect(unregisterEventHandlersStub.calledOnce).toBe(true);
      expect(unregisterEventHandlersStub.calledWith(eventType)).toBe(true);
    });
  });

  describe('createIntervalTimerEventGenerator', () => {
    it('should create interval timer event generator successfully', () => {
      const eventTypeName = 'TIMER_EVENT';
      const intervalInMs = 1000;
      const options = { simulatedStartDate: new Date() };

      justInWrapper.createIntervalTimerEventGenerator(eventTypeName, intervalInMs, options);

      const intervalTimerEventGenerators = justInWrapper.getIntervalTimerEventGenerators();
      expect(intervalTimerEventGenerators.size).toBe(1);    
      expect(intervalTimerEventGenerators.get(eventTypeName)).toBeDefined();
    });
  });

  describe('publishEvent', () => {
    it('should publish event successfully', async () => {
      const eventType = 'TEST_EVENT';
      const timestamp = new Date();
      const eventDetails = { test: 'data' };

      await justInWrapper.publishEvent(eventType, timestamp, eventDetails);

      expect(publishEventStub.calledOnce).toBe(true);
      expect(publishEventStub.calledWith(eventType, timestamp, eventDetails)).toBe(true);
    });

    it('should publish event without details', async () => {
      const eventType = 'TEST_EVENT';
      const timestamp = new Date();

      await justInWrapper.publishEvent(eventType, timestamp);

      expect(publishEventStub.calledOnce).toBe(true);
      expect(publishEventStub.calledWith(eventType, timestamp, undefined)).toBe(true);
    });
  });

  describe('startEngine', () => {
    beforeEach(async () => {
      await justInWrapper.init();
    });

    afterEach(async () => {
      await justInWrapper.shutdown();
    });

    it('should start engine successfully', async () => {
      // Mock the interval timer event generators map
      const mockGenerators = new Map();
      mockGenerators.set('EVENT1', mockIntervalTimerEventGenerator);
      mockGenerators.set('EVENT2', mockIntervalTimerEventGenerator);
      
      (justInWrapper as any).intervalTimerEventGenerators = mockGenerators;

      await justInWrapper.startEngine();

      expect(startEventQueueProcessingStub.calledOnce).toBe(true);
      expect(processEventQueueStub.calledOnce).toBe(true);
    });

    it('should start engine with no interval generators', async () => {
      // Empty generators map
      (justInWrapper as any).intervalTimerEventGenerators = new Map();

      await justInWrapper.startEngine();

      expect(startEventQueueProcessingStub.calledOnce).toBe(true);
      expect(processEventQueueStub.calledOnce).toBe(true);
    });
  });

  describe('setupEventQueueListener', () => {
    it('should setup event queue listener', () => {
      justInWrapper.setupEventQueueListener();

      expect(setupEventQueueListenerStub.calledOnce).toBe(true);
    });
  });

  describe('registerTask', () => {
    it('should register task successfully', () => {
      const task: TaskRegistration = {
        name: 'test-task',
        beforeExecution: () => {},
        shouldActivate: () => ({ status: 'success' }),
        doAction: () => ({ status: 'success' }),
        afterExecution: () => {},
      };

      justInWrapper.registerTask(task);

      expect(registerTaskStub.calledOnce).toBe(true);
      expect(registerTaskStub.calledWith(task)).toBe(true);
    });
  });

  describe('registerDecisionRule', () => {
    it('should register decision rule successfully', () => {
      const decisionRule: DecisionRuleRegistration = {
        name: 'test-rule',
        beforeExecution: () => {},
        shouldActivate: () => ({ status: 'success' }),
        doAction: () => ({ status: 'success' }),
        selectAction: () => ({ status: 'success' }),
        afterExecution: () => {},
      };

      justInWrapper.registerDecisionRule(decisionRule);

      expect(registerDecisionRuleStub.calledOnce).toBe(true);
      expect(registerDecisionRuleStub.calledWith(decisionRule)).toBe(true);
    });
  });

  describe('configureLogger', () => {
    it('should configure logger successfully', () => {
      const mockLogger: Logger = {
        info: () => {},
        warn: () => {},
        error: () => {},
        dev: () => {},
      };

      justInWrapper.configureLogger(mockLogger);

      expect(setLoggerStub.calledOnce).toBe(true);
      expect(setLoggerStub.calledWith(mockLogger)).toBe(true);
    });
  });

  describe('setLoggingLevels', () => {
    it('should set logging levels successfully', () => {
      const levels = { info: true, warn: false };

      justInWrapper.setLoggingLevels(levels);

      expect(setLogLevelsStub.calledOnce).toBe(true);
      expect(setLogLevelsStub.calledWith(levels)).toBe(true);
    });

    it('should handle empty levels object', () => {
      justInWrapper.setLoggingLevels({});

      expect(setLogLevelsStub.calledOnce).toBe(true);
      expect(setLogLevelsStub.calledWith({})).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should shutdown engine successfully', async () => {

      await justInWrapper.init();

      justInWrapper.createIntervalTimerEventGenerator('EVENT1', 1000);
      justInWrapper.createIntervalTimerEventGenerator('EVENT2', 1000);

      expect((justInWrapper as any).intervalTimerEventGenerators.size).toBe(2);
      await justInWrapper.startEngine();

      await justInWrapper.shutdown();

      expect((justInWrapper as any).intervalTimerEventGenerators.size).toBe(0);
      expect(stopEventQueueProcessingStub.calledOnce).toBe(true);
      expect(userManagerStopUserManagerStub.calledOnce).toBe(true);
      expect(dataManagerCloseStub.calledOnce).toBe(true);
    });

    it('should shutdown engine with no interval generators', async () => {
      // Empty generators map
      (justInWrapper as any).intervalTimerEventGenerators = new Map();

      await justInWrapper.init();
      await justInWrapper.startEngine();
      await justInWrapper.shutdown();

      expect(mockIntervalTimerEventGenerator.stop.called).toBe(false);
      expect(stopEventQueueProcessingStub.calledOnce).toBe(true);
      expect(userManagerStopUserManagerStub.calledOnce).toBe(true);
      expect(dataManagerCloseStub.calledOnce).toBe(true);
    });

    it('should handle shutdown errors gracefully', async () => {
      await justInWrapper.init();
      const error = new Error('Database close failed');
      dataManagerCloseStub.rejects(error);
      await justInWrapper.shutdown();
      const logWarnArgs = logWarnStub.args[0];
      expect(logWarnArgs[0]).toBe('Error shutting down JustInWrapper:');
      expect(logWarnArgs[1]).toMatchObject(error);
    });
  });

  describe('JustIn instance', () => {
    it('should return JustInWrapper instance', () => {
      const { JustIn } = require('../JustInWrapper');
      const instance = JustIn();

      expect(instance).toBeInstanceOf(JustInWrapper);
      expect(instance).toBe(JustInWrapper.getInstance());
    });
  });

  describe('integration scenarios', () => {

    it('should handle complete lifecycle: initialize, start, shutdown', async () => {
      // Initialize
      await justInWrapper.init();
      expect(dataManagerInitStub.calledOnce).toBe(true);

      // Register event handlers
      await justInWrapper.registerEventHandlers('TEST_EVENT', ['task1']);
      expect(registerEventHandlersStub.calledOnce).toBe(true);

      // Start engine
      await justInWrapper.startEngine();
      expect(startEventQueueProcessingStub.calledOnce).toBe(true);
      expect(processEventQueueStub.calledOnce).toBe(true);

      // Shutdown
      await justInWrapper.shutdown();
      expect(stopEventQueueProcessingStub.calledOnce).toBe(true);
      expect(dataManagerCloseStub.calledOnce).toBe(true);
    });

    it('should handle multiple event registrations', async () => {
      await justInWrapper.registerEventHandlers('EVENT1', ['task1']);
      await justInWrapper.registerEventHandlers('EVENT2', ['task2', 'decision1']);

      expect(registerEventHandlersStub.calledTwice).toBe(true);
      expect(registerEventHandlersStub.firstCall.args).toEqual(['EVENT1', ['task1']]);
      expect(registerEventHandlersStub.secondCall.args).toEqual(['EVENT2', ['task2', 'decision1']]);
    });

    it('should handle multiple task and decision rule registrations', () => {
      const task1: TaskRegistration = { 
        name: 'task1', 
        beforeExecution: () => {}, 
        shouldActivate: () => ({ status: 'success' }),
        doAction: () => ({ status: 'success' }),
        afterExecution: () => {} 
      };
      const task2: TaskRegistration = { 
        name: 'task2', 
        beforeExecution: () => {}, 
        shouldActivate: () => ({ status: 'success' }),
        doAction: () => ({ status: 'success' }),
        afterExecution: () => {} 
      };
      const rule1: DecisionRuleRegistration = { 
        name: 'rule1', 
        beforeExecution: () => {}, 
        shouldActivate: () => ({ status: 'success' }),
        doAction: () => ({ status: 'success' }),
        selectAction: () => ({ status: 'success' }),
        afterExecution: () => {} 
      };

      justInWrapper.registerTask(task1);
      justInWrapper.registerTask(task2);
      justInWrapper.registerDecisionRule(rule1);

      expect(registerTaskStub.calledTwice).toBe(true);
      expect(registerDecisionRuleStub.calledOnce).toBe(true);
    });
  });
}); 