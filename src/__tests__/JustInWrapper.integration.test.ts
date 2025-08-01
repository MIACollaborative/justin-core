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
import { JUser } from "../user-manager/user.type";

function resetJustinWrapperSingleton(): void {
  const wrapperModule = require('../JustInWrapper');
  wrapperModule.JustInWrapper['instance'] = null;
}

describe('JustInWrapper Integration', () => {
  let mongoServer: MongoMemoryReplSet;
  let justIn: JustInWrapper;
  let dataManager: DataManager;
  let eventHandlerManager: EventHandlerManager;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGO_URI = mongoServer.getUri();
  });

  afterAll(async () => {
    sinon.restore();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    justIn = JustInWrapper.getInstance();
    dataManager = DataManager.getInstance();
    eventHandlerManager = EventHandlerManager.getInstance();
    await justIn.init(DBType.MONGO);
  });

  afterEach(async () => {
    sinon.resetHistory();
    await justIn.shutdown();
    resetJustinWrapperSingleton();
  });

  describe('Initialization', () => {
    it('should initialize successfully with MongoDB', async () => {
      expect(justIn.getInitializationStatus()).toBe(true);
    });

    it('should handle multiple initialization calls gracefully', async () => {
      await justIn.init(DBType.MONGO);
      expect(justIn.getInitializationStatus()).toBe(true);
    });

    it('should shut down properly', async () => {
      await justIn.shutdown();
      expect(justIn.getInitializationStatus()).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    it('should maintain singleton instance', () => {
      const instance1 = JustInWrapper.getInstance();
      const instance2 = JustInWrapper.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should handle JustIn function correctly', () => {
      const instance1 = JustInWrapper.getInstance();
      const instance2 = (() => {
        const { JustIn } = require('../JustInWrapper');
        return JustIn();
      })();
      expect(instance1).toBe(instance2);
    });
  });

  describe('User Management', () => {
    beforeEach(async () => {
      const allUsers = await justIn.getUsersFromDatabase() as JUser[];
      // Clean up existing users before each test
      if (allUsers.length > 0) {
        await Promise.all(allUsers.map(user => justIn.deleteUser(user.uniqueIdentifier)));
      }
    });

    afterEach(async () => {
    });
    it('should add and retrieve users to/from database successfully', async () => {
      const users = [
        { uniqueIdentifier: 'user1', initialAttributes: { name: 'User 1', email: 'user1@test.com' } },
        { uniqueIdentifier: 'user2', initialAttributes: { name: 'User 2', email: 'user2@test.com' } }
      ];
      await justIn.addUsersToDatabase(users);
      const allUsers = UserManager.getAllUsers();
      expect(allUsers).toHaveLength(2); // Ensure users are added
      const justAllUsers = await justIn.getUsersFromDatabase();
      expect(justAllUsers).toHaveLength(2);
      expect(justAllUsers[0]?.uniqueIdentifier).toBe(allUsers[0].uniqueIdentifier);
      expect(justAllUsers[1]?.uniqueIdentifier).toBe(allUsers[1].uniqueIdentifier);
      expect(justAllUsers[0]?.attributes).toEqual(allUsers[0].attributes);
      expect(justAllUsers[1]?.attributes).toEqual(allUsers[1].attributes);
    });

    it('should add and retrieve a user to database successfully', async () => {
      const user = { uniqueIdentifier: 'user1', initialAttributes: { name: 'User 1', email: 'user1@test.com' } };
      await justIn.addUser(user);
      const theUser = UserManager.getUserByUniqueIdentifier(user.uniqueIdentifier);
      expect(theUser).toBeDefined();
      expect(theUser?.uniqueIdentifier).toBe(user.uniqueIdentifier);
      expect(theUser?.attributes).toEqual(user.initialAttributes);
    });

    it('should update a user in database successfully', async () => {
      const user = { uniqueIdentifier: 'user1', initialAttributes: { name: 'User 1', email: 'user1@test.com' } };
      
      const addedUser:JUser = await justIn.addUser(user) as JUser;
      expect(addedUser).toBeDefined();
      expect(addedUser.uniqueIdentifier).toBe(user.uniqueIdentifier);
      expect(addedUser.attributes).toEqual(user.initialAttributes);

      const attributesToUpdate = { name: 'Updated User 1', email: 'updated_user1@test.com' };
      const updatedUser = await justIn.updateUser(user.uniqueIdentifier, attributesToUpdate) as JUser;
      expect(updatedUser).toBeDefined();
      expect(updatedUser.uniqueIdentifier).toBe(user.uniqueIdentifier);
      expect(updatedUser.attributes).toEqual(attributesToUpdate);
    
      const theUser: JUser = await justIn.getUser(user.uniqueIdentifier) as JUser;
      expect(theUser).toBeDefined();
      expect(theUser.uniqueIdentifier).toBe(user.uniqueIdentifier);
      expect(theUser.attributes).toEqual(attributesToUpdate);
    });

    it('should delete a user in database successfully', async () => {
      const user = { uniqueIdentifier: 'user1', initialAttributes: { name: 'User 1', email: 'user1@test.com' } };
      
      const addedUser:JUser = await justIn.addUser(user) as JUser;
      expect(addedUser).toBeDefined();
      expect(addedUser.uniqueIdentifier).toBe(user.uniqueIdentifier);
      expect(addedUser.attributes).toEqual(user.initialAttributes);

      const deletedUser:void = await justIn.deleteUser(user.uniqueIdentifier);
      expect(deletedUser).toBeUndefined();

      const theUser: JUser | null = await justIn.getUser(user.uniqueIdentifier);
      expect(theUser).toBeNull();

    });
  });

  describe('Event Handler Registration', () => {
    it('should register and unregister event handlers successfully', async () => {
      const handlers = ['task1', 'decision1'];
      await justIn.registerEventHandlers('TEST_EVENT', handlers);
      expect(eventHandlerManager.getHandlersForEventType('TEST_EVENT')).toEqual(handlers);
      justIn.unregisterEventHandlers('TEST_EVENT');
      expect(eventHandlerManager.getHandlersForEventType('TEST_EVENT')).toEqual([]);
    });
  });

  describe('Interval Timer Event Generators', () => {
    it('should create interval timer event generators', () => {
      justIn.createIntervalTimerEventGenerator('TIMER_EVENT', 1000, {
        simulatedStartDate: new Date(),
        simulatedTickDurationInMs: 1000,
        simulatedTickCountMax: 5
      });
      expect(justIn.getIntervalTimerEventGenerators().has('TIMER_EVENT')).toBe(true);
    });

    it('should manage multiple interval timer event generators', () => {
      justIn.createIntervalTimerEventGenerator('EVENT_1', 1000, {});
      justIn.createIntervalTimerEventGenerator('EVENT_2', 2000, {});
      justIn.createIntervalTimerEventGenerator('EVENT_3', 3000, {});
      const gens = justIn.getIntervalTimerEventGenerators();
      expect(gens.size).toBe(3);
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
    it('should handle shutdown errors gracefully', async () => {
      const stub = sinon.stub(dataManager, 'close').rejects(new Error('Close failed'));
      await expect(justIn.shutdown()).resolves.not.toThrow();
      stub.restore();
    });
  });

  describe('Full Engine Integration', () => {
    it('should invoke all handlers for a published event', async () => {
      const aDecisionRule: DecisionRuleRegistration = {
        name: 'testDecisionRule',
        shouldActivate: sinon.stub().returns({ status: 'success', result: 'ok' }),
        selectAction: sinon.stub().returns({ status: 'success', result: 'ok' }),
        doAction: sinon.stub().returns({ status: 'success', result: 'ok' })
      };

      const aTask: TaskRegistration = {
        name: 'testTask',
        shouldActivate: sinon.stub().returns({ status: 'success', result: 'ok' }),
        doAction: sinon.stub().returns({ status: 'success', result: 'ok' })
      };

      justIn.registerDecisionRule(aDecisionRule);
      justIn.registerTask(aTask);
      justIn.registerEventHandlers('TEST_EVENT', ['testDecisionRule', 'testTask']);
      await justIn.addUsersToDatabase([{ uniqueIdentifier: 'user1', initialAttributes: { name: 'U1', email: 'u1@test.com' } }]);
      await justIn.startEngine();
      await justIn.publishEvent('TEST_EVENT', new Date(), {});
      await new Promise(res => setTimeout(res, 1000));

      expect((aDecisionRule.shouldActivate as sinon.SinonStub).called).toBe(true);
      expect((aDecisionRule.selectAction as sinon.SinonStub).called).toBe(true);
      expect((aDecisionRule.doAction as sinon.SinonStub).called).toBe(true);
      expect((aTask.shouldActivate as sinon.SinonStub).called).toBe(true);
      expect((aTask.doAction as sinon.SinonStub).called).toBe(true);
    });
  });

  describe('Using interval timer event generators', () => {
    it('should run engine on interval trigger', async () => {
      const aDecisionRule: DecisionRuleRegistration = {
        name: 'testDecisionRule',
        shouldActivate: sinon.stub().returns({ status: 'success', result: 'ok' }),
        selectAction: sinon.stub().returns({ status: 'success', result: 'ok' }),
        doAction: sinon.stub().returns({ status: 'success', result: 'ok' })
      };

      justIn.registerDecisionRule(aDecisionRule);
      justIn.registerEventHandlers('INTERVAL_EVENT', ['testDecisionRule']);
      await justIn.addUsersToDatabase([{ uniqueIdentifier: 'user2', initialAttributes: { name: 'U2', email: 'u2@test.com' } }]);
      justIn.createIntervalTimerEventGenerator('INTERVAL_EVENT', 1000);
      await justIn.startEngine();
      await new Promise(res => setTimeout(res, 2500));

      expect((aDecisionRule.shouldActivate as sinon.SinonStub).callCount).toBeGreaterThanOrEqual(2);
    });
  });
});