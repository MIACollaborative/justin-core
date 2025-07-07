import { MongoMemoryReplSet } from "mongodb-memory-server";
import { JustInWrapper } from "../JustInWrapper";
import { Log } from "../logger/logger-manager";
import { EventHandlerManager } from "../event/event-handler-manager";
import { UserManager } from "../user-manager/user-manager";
import DataManager from "../data-manager/data-manager";
import sinon from 'sinon';
import { DBType } from "../data-manager/data-manager.constants";
import { MongoDBManager } from "../data-manager/mongo/mongo-data-manager";
import { TaskRegistration, DecisionRuleRegistration } from "../handlers/handler.type";

describe('JustInWrapper Integration', () => {
  let mongoServer: MongoMemoryReplSet;
  let justIn: JustInWrapper = JustInWrapper.getInstance();
  let dataManager: DataManager = DataManager.getInstance();
  let eventHandlerManager: EventHandlerManager = EventHandlerManager.getInstance();

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongoServer.getUri();
    process.env.MONGO_URI = uri;
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  describe('Initialization', () => {

    afterEach(async () => {
      await justIn.shutdown();
    });

    it('should initialize successfully with MongoDB', async () => {
      expect(justIn.getInitializationStatus()).toBe(false);
      await justIn.init(DBType.MONGO);
      expect(justIn.getInitializationStatus()).toBe(true);
    });

    it('should handle multiple initialization calls gracefully', async () => {
      await justIn.init(DBType.MONGO);
      expect(justIn.getInitializationStatus()).toBe(true);
      
      // Second call should not throw error
      await justIn.init(DBType.MONGO);
      expect(justIn.getInitializationStatus()).toBe(true);
    });

    it('should shut down properly', async () => {
      await justIn.init(DBType.MONGO);
      expect(justIn.getInitializationStatus()).toBe(true);
      
      await justIn.shutdown();
      expect(justIn.getInitializationStatus()).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    it('should maintain singleton instance', async () => {
      const instance1 = JustInWrapper.getInstance();
      const instance2 = JustInWrapper.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should handle JustIn function correctly', async () => {
      const instance1 = JustInWrapper.getInstance();
      const instance2 = (() => {
        const { JustIn } = require('../JustInWrapper');
        return JustIn();
      })();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('User Management', () => {
    it('should add users to database successfully', async () => {
      await justIn.init(DBType.MONGO);
      
      const users = [
        { name: 'User 1', email: 'user1@test.com' },
        { name: 'User 2', email: 'user2@test.com' }
      ];
      
      await justIn.addUsersToDatabase(users);

      // wait for change listeners to be called 
      // TODO: rethink this design?
      await new Promise(resolve => setTimeout(resolve, 1000));
      const allUsers = UserManager.getAllUsers();
      expect(allUsers).toHaveLength(2);
      expect(allUsers[0].name).toBe('User 1');
      expect(allUsers[1].name).toBe('User 2');
    });
  });

  describe('Event Handler Registration', () => {

    afterEach(async () => {
      await justIn.shutdown();
    });

    it('should register event handlers successfully', async () => {
      await justIn.init(DBType.MONGO);
      
      const handlers = ['task1', 'decision1'];
      await justIn.registerEventHandlers('TEST_EVENT', handlers);
      
      const registeredHandlers = eventHandlerManager.getHandlersForEventType('TEST_EVENT');
      expect(registeredHandlers).toEqual(handlers);
    });

    it('should unregister event handlers successfully', async () => {
      await justIn.init(DBType.MONGO);
      
      const handlers = ['task1', 'decision1'];
      await justIn.registerEventHandlers('TEST_EVENT', handlers);
      
      justIn.unregisterEventHandlers('TEST_EVENT');
      
      const registeredHandlers = eventHandlerManager.getHandlersForEventType('TEST_EVENT');
      expect(registeredHandlers).toEqual([]);
    });
  });

  describe('Interval Timer Event Generators', () => {

    afterEach(async () => {
      await justIn.shutdown();
    });

    it('should create interval timer event generators', async () => {
      await justIn.init(DBType.MONGO);
      
      const eventTypeName = 'TIMER_EVENT';
      const intervalInMs = 1000;
      const options = { 
        simulatedStartDate: new Date(),
        simulatedTickDurationInMs: 1000,
        simulatedTickCountMax: 5 
      };
      
      justIn.createIntervalTimerEventGenerator(eventTypeName, intervalInMs, options);
      
      const generators = justIn.getIntervalTimerEventGenerators();
      expect(generators.has(eventTypeName)).toBe(true);
      
      const generator = generators.get(eventTypeName);
      expect(generator).toBeDefined();
    });

    it('should manage multiple interval timer event generators', async () => {
      await justIn.init(DBType.MONGO);
      
      justIn.createIntervalTimerEventGenerator('EVENT_1', 1000, {});
      justIn.createIntervalTimerEventGenerator('EVENT_2', 2000, {});
      justIn.createIntervalTimerEventGenerator('EVENT_3', 3000, {});
      
      const generators = justIn.getIntervalTimerEventGenerators();
      expect(generators.size).toBe(3);
      expect(generators.has('EVENT_1')).toBe(true);
      expect(generators.has('EVENT_2')).toBe(true);
      expect(generators.has('EVENT_3')).toBe(true);
    });
  });

  describe('Logger Configuration', () => {
    
    const customLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      dev: sinon.stub(),
    };

    beforeEach(async () => {
      await justIn.init(DBType.MONGO);
      customLogger.info.reset();
      customLogger.warn.reset();
      customLogger.error.reset();
      customLogger.dev.reset();
      justIn.configureLogger(customLogger);

    });

    it('should configure custom logger', async () => {
      justIn.configureLogger(customLogger);

      Log.info('test message');
      expect(customLogger.info.called).toBe(true);

      Log.warn('test message');
      expect(customLogger.warn.called).toBe(true);

      Log.error('test message');
      expect(customLogger.error.called).toBe(true);

      Log.dev('test message');
      expect(customLogger.dev.called).toBe(true);
    });

    it('should set logging levels', async () => {
      
      const levels = {
        info: true,
        warn: false,
        error: true,
        dev: false,
      };
      
      justIn.setLoggingLevels(levels);

      Log.info('test message');
      expect(customLogger.info.called).toBe(true);

      Log.warn('test message');
      expect(customLogger.warn.called).toBe(false);

      Log.error('test message');
      expect(customLogger.error.called).toBe(true);

      Log.dev('test message');
      expect(customLogger.dev.called).toBe(false);
      
    });
  });

  describe('Error Handling', () => {
    afterEach(async () => {
      await justIn.shutdown();
    });

    // TODO: figure out how to test this. I can't get stubbing dataManager.init, 
    // MongoDBManager.init, or UserManager.init to throw an error and cause this test to pass.
    // not sure we need it, but leaving it here for now.
    xit('should handle initialization errors gracefully', async () => {

      const mongoInitStub = sinon.stub(MongoDBManager, 'init');
      mongoInitStub.rejects(new Error('Init failed'));
      
      try {
        await justIn.init(DBType.MONGO);
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toBe('Init failed');
      } finally {
        mongoInitStub.restore();
      }
    });

    it('should handle shutdown errors gracefully', async () => {
      await justIn.init(DBType.MONGO);
      
      // Mock DataManager.close to throw an error
      const dataManagerCloseStub = sinon.stub(dataManager, 'close');
      dataManagerCloseStub.rejects(new Error('Close failed'));
      
      try {
        await justIn.shutdown();
        // Should not throw, but should log the error
      } catch (error) {
        throw new Error('Should not have thrown an error during shutdown');
      } finally {
        dataManagerCloseStub.restore();
      }
    });
  });

  fdescribe('Full Engine Integration', () => {

    beforeEach(async () => {
      await justIn.init(DBType.MONGO);
      await UserManager.deleteAllUsers();
    });

    afterEach(async () => {
      await justIn.shutdown();
    });

    it('should invoke all handler functions for a published event when all succeed', async () => {

      const aDecisionRule: DecisionRuleRegistration = {
        name: 'testDecisionRule',
        shouldActivate: sinon.stub().returns({status: 'success', result: 'success'}),
        selectAction: sinon.stub().returns({status: 'success', result: 'success'}),
        doAction: sinon.stub().returns({status: 'success', result: 'success'}),
      };

      const aTask: TaskRegistration = {
        name: 'testTask',
        shouldActivate: sinon.stub().returns({status: 'success', result: 'success'}),
        doAction: sinon.stub().returns({status: 'success', result: 'success'}),
      };

      justIn.registerDecisionRule(aDecisionRule);
      justIn.registerTask(aTask);
      justIn.registerEventHandlers('TEST_EVENT', ['testDecisionRule', 'testTask']);
      await justIn.addUsersToDatabase([{name: 'testUser', email: 'testUser@test.com'}]);
      await justIn.startEngine();
      await justIn.publishEvent('TEST_EVENT', new Date(), {test: 'test'});

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect((aDecisionRule.shouldActivate as sinon.SinonStub).called).toBe(true);
      expect((aDecisionRule.selectAction as sinon.SinonStub).called).toBe(true);
      expect((aDecisionRule.doAction as sinon.SinonStub).called).toBe(true);
      expect((aTask.shouldActivate as sinon.SinonStub).called).toBe(true);
      expect((aTask.doAction as sinon.SinonStub).called).toBe(true);
    });

    //TODO: figure out why this passes if the previous test is skipped but fails otherwise
    it('should run the engine with a decision rule that should not activate', async () => {

      const aDecisionRule: DecisionRuleRegistration = {
        name: 'testDecisionRule',
        shouldActivate: sinon.stub().returns({status: 'stop', result: 'success'}),
        selectAction: sinon.stub().returns({status: 'success', result: 'success'}),
        doAction: sinon.stub().returns({status: 'success', result: 'success'}),
      };

      justIn.registerDecisionRule(aDecisionRule);
      justIn.registerEventHandlers('TEST_EVENT', ['testDecisionRule']);
      await justIn.addUsersToDatabase([{name: 'testUser', email: 'testUser@test.com'}]);
      await justIn.startEngine();
      await justIn.publishEvent('TEST_EVENT', new Date(), {test: 'test'});

      //TODO: figure out why the change listener for event insert gets removed
      //during this timeout and before the event is processed
      await new Promise(resolve => setTimeout(resolve, 3000));

      expect((aDecisionRule.shouldActivate as sinon.SinonStub).called).toBe(true);
      expect((aDecisionRule.selectAction as sinon.SinonStub).called).toBe(false);
      expect((aDecisionRule.doAction as sinon.SinonStub).called).toBe(false);

    });
  });

  fdescribe('Using interval timer event generators', () => {

    beforeEach(async () => {
      await justIn.init(DBType.MONGO);
      await UserManager.deleteAllUsers();
    });

    afterEach(async () => {
      await justIn.shutdown();
    });

    it('should run the engine with a decision rule that activates on a timer', async () => {

      const aDecisionRule: DecisionRuleRegistration = {
        name: 'testDecisionRule',
        shouldActivate: sinon.stub().returns({status: 'success', result: 'success'}),
        selectAction: sinon.stub().returns({status: 'success', result: 'success'}),
        doAction: sinon.stub().returns({status: 'success', result: 'success'}),
      };

      justIn.registerDecisionRule(aDecisionRule);
      justIn.registerEventHandlers('TEST_EVENT', ['testDecisionRule']);
      await justIn.addUsersToDatabase([{name: 'testUser', email: 'testUser@test.com'}]);
      justIn.createIntervalTimerEventGenerator('TEST_EVENT', 1000);
      await justIn.startEngine();

      await new Promise(resolve => setTimeout(resolve, 2500));

      console.log('called shouldActivate', (aDecisionRule.shouldActivate as sinon.SinonStub).callCount);
      expect((aDecisionRule.shouldActivate as sinon.SinonStub).calledTwice).toBe(true);
      expect((aDecisionRule.selectAction as sinon.SinonStub).calledTwice).toBe(true);
      expect((aDecisionRule.doAction as sinon.SinonStub).calledTwice).toBe(true);
    });
  });
}); 