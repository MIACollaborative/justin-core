import { MongoMemoryReplSet } from "mongodb-memory-server";
import DataManager from "../../data-manager/data-manager";
import { Log } from "../../logger/logger-manager";
import * as EventQueue from "../event-queue";
import { EventHandlerManager } from "../event-handler-manager";
import { UserManager } from "../../user-manager/user-manager";
import { JEvent } from "../event.type";
import { JUser } from "../../user-manager/user.type";
import * as TaskManager from "../../handlers/task.manager";
import * as DecisionRuleManager from "../../handlers/decision-rule.manager";
import sinon from 'sinon';

// Create Sinon stubs for task and decision rule managers
const executeTaskStub = sinon.stub(TaskManager, 'executeTask');
const getTaskByNameStub = sinon.stub(TaskManager, 'getTaskByName');
const executeDecisionRuleStub = sinon.stub(DecisionRuleManager, 'executeDecisionRule');
const getDecisionRuleByNameStub = sinon.stub(DecisionRuleManager, 'getDecisionRuleByName');


describe('Event Queue Integration', () => {
  let mongoServer: MongoMemoryReplSet;
  let dataManager: DataManager;
  let eventHandlerManager: EventHandlerManager;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongoServer.getUri();
    process.env.MONGO_URI = uri;
    
    dataManager = DataManager.getInstance();
    await dataManager.init();
    
    eventHandlerManager = EventHandlerManager.getInstance();
    
    // Initialize UserManager
    await UserManager.init();
  });

  afterAll(async () => {
    await dataManager.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await dataManager.clearCollection('event_queue');
    await dataManager.clearCollection('archived_events');
    await UserManager.deleteAllUsers();

    // Reset stubs
    executeTaskStub.reset();
    getTaskByNameStub.reset();
    executeDecisionRuleStub.reset();
    getDecisionRuleByNameStub.reset();
    
    // Start event queue processing
    EventQueue.startEventQueueProcessing();
  });

  afterEach(async () => {
    // Stop event queue processing
    EventQueue.stopEventQueueProcessing();
    eventHandlerManager.clearEventHandlers();
  });

  describe('Event Publishing and Processing', () => {
    it('should publish and process events successfully', async () => {

      // Register event handlers
      await eventHandlerManager.registerEventHandlers('TEST_EVENT', ['test-task']);
      
      // Create a mock task
      const mockTask = {
        name: 'test-task',
        beforeExecution: sinon.stub().resolves(),
        shouldActivate: sinon.stub().resolves(true),
        doAction: sinon.stub().resolves(),
        afterExecution: sinon.stub().resolves(),
      };
      getTaskByNameStub.returns(mockTask as any);
      
      // Create test users
      const user1 = await UserManager.addUser({ uniqueIdentifier: 'user1', initialAttributes: { name: 'Test User 1' } });
      const user2 = await UserManager.addUser({ uniqueIdentifier: 'user2', initialAttributes: { name: 'Test User 2' } });

      // Publish an event
      const eventDetails = { testData: 'value' };
      await EventQueue.publishEvent('TEST_EVENT', new Date(), eventDetails);
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify event was processed
      const archivedEvents = await dataManager.getAllInCollection('archived_events');
      expect(archivedEvents).toHaveLength(1);
      
      const processedEvent = archivedEvents![0] as JEvent;
      expect(processedEvent.eventType).toBe('TEST_EVENT');
      expect(processedEvent.eventDetails).toEqual(eventDetails);
      
      // Verify task was executed for each user
      expect(executeTaskStub.calledTwice).toBe(true);
      delete processedEvent.id;
      const args = executeTaskStub.args;
      expect(args[0][0]).toMatchObject(mockTask);
      expect(args[0][1]).toMatchObject(processedEvent);
      expect(args[0][2]).toMatchObject({uniqueIdentifier: user1!.uniqueIdentifier, attributes: user1!.initialAttributes});
      expect(args[1][0]).toMatchObject(mockTask);
      expect(args[1][1]).toMatchObject(processedEvent);
      expect(args[1][2]).toMatchObject({uniqueIdentifier: user2!.uniqueIdentifier, attributes: user2!.initialAttributes});
      
      // Verify lifecycle methods were called
      const beArgs = mockTask.beforeExecution.args;
      expect(beArgs[0][0]).toMatchObject(processedEvent);
      const aeArgs = mockTask.afterExecution.args;
      expect(aeArgs[0][0]).toMatchObject(processedEvent);
      
      // Verify queue is empty
      const queueEvents = await dataManager.getAllInCollection('event_queue');
      expect(queueEvents).toHaveLength(0);
    });

    it('should handle multiple events in sequence', async () => {
      // Register event handlers
      await eventHandlerManager.registerEventHandlers('TEST_EVENT', ['test-task']);
      
      const mockTask = {
        name: 'test-task',
        beforeExecution: sinon.stub().resolves(),
        afterExecution: sinon.stub().resolves(),
      };
      getTaskByNameStub.returns(mockTask as any);
      
      // Create test user
      await UserManager.addUser({uniqueIdentifier: 'test-user', initialAttributes: { name: 'Test User' } });
      
      // Publish multiple events
      await EventQueue.publishEvent('TEST_EVENT', new Date(), { id: 1 });
      await EventQueue.publishEvent('TEST_EVENT', new Date(), { id: 2 });
      await EventQueue.publishEvent('TEST_EVENT', new Date(), { id: 3 });
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify all events were processed
      const archivedEvents = await dataManager.getAllInCollection('archived_events');
      expect(archivedEvents).toHaveLength(3);
      
      // Verify queue is empty
      const queueEvents = await dataManager.getAllInCollection('event_queue');
      expect(queueEvents).toHaveLength(0);
    });

    it('should skip events without handlers', async () => {
      // Create test user
      await UserManager.addUser({ uniqueIdentifier: 'test-user', initialAttributes: { name: 'Test User' } });

      // Publish event without registering handlers
      await EventQueue.publishEvent('UNHANDLED_EVENT', new Date());
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify no events were processed
      const archivedEvents = await dataManager.getAllInCollection('archived_events');
      expect(archivedEvents).toHaveLength(0);
      
      const queueEvents = await dataManager.getAllInCollection('event_queue');
      expect(queueEvents).toHaveLength(0);
    });
  });

  describe('Decision Rule Processing', () => {
    it('should process decision rules successfully', async () => {
      // Register event handlers
      await eventHandlerManager.registerEventHandlers('TEST_EVENT', ['test-rule'], true);
      
      // Create a mock decision rule
      const mockDecisionRule = {
        name: 'test-rule',
        beforeExecution: sinon.stub().resolves(),
        afterExecution: sinon.stub().resolves(),
      };
      getDecisionRuleByNameStub.returns(mockDecisionRule as any);
      
      // Create test user
      await UserManager.addUser({ uniqueIdentifier: 'test-user', initialAttributes: { name: 'Test User' } });

      // Publish an event
      await EventQueue.publishEvent('TEST_EVENT', new Date());
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify decision rule was executed
      expect(executeDecisionRuleStub.calledOnce).toBe(true);
      const args = executeDecisionRuleStub.args;
      expect(args[0][0]).toMatchObject(mockDecisionRule);
      expect(args[0][1]).toMatchObject(expect.any(Object));
      expect(args[0][2]).toMatchObject(expect.any(Object));
      
      // Verify lifecycle methods were called
      expect(mockDecisionRule.beforeExecution.called).toBe(true);
      expect(mockDecisionRule.afterExecution.called).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle task execution errors gracefully', async () => {
      // Register event handlers
      await eventHandlerManager.registerEventHandlers('TEST_EVENT', ['failing-task'], true);
      
      const mockTask = {
        name: 'failing-task',
        beforeExecution: sinon.stub().resolves(),
        afterExecution: sinon.stub().resolves(),
      };
      getTaskByNameStub.returns(mockTask as any);
      executeTaskStub.rejects(new Error('Task execution failed'));
      
      // Create test user
      await UserManager.addUser({ uniqueIdentifier: 'test-user', initialAttributes: { name: 'Test User' } });

      // Publish an event
      await EventQueue.publishEvent('TEST_EVENT', new Date());
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify event was still archived despite task failure
      const archivedEvents = await dataManager.getAllInCollection('archived_events');
      expect(archivedEvents).toHaveLength(1);
      
      // Verify queue is empty
      const queueEvents = await dataManager.getAllInCollection('event_queue');
      expect(queueEvents).toHaveLength(0);
    });

    it('should handle archiving errors gracefully', async () => {
      // Register event handlers
      await eventHandlerManager.registerEventHandlers('TEST_EVENT', ['test-task'], true);
      
      const mockTask = {
        name: 'test-task',
        beforeExecution: sinon.stub().resolves(),
        afterExecution: sinon.stub().resolves(),
      };
      getTaskByNameStub.returns(mockTask as any);
      
      await UserManager.addUser({ uniqueIdentifier: 'test-user', initialAttributes: { name: 'Test User' } });

      const addItemToCollectionStub = sinon.stub(dataManager, 'addItemToCollection');
      addItemToCollectionStub.withArgs('archived_events').rejects(new Error('Archive failed')); // Allow other calls to go through normally
      addItemToCollectionStub.callThrough();

      await EventQueue.publishEvent('TEST_EVENT', new Date());
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const queueEvents = await dataManager.getAllInCollection('event_queue');
      expect(queueEvents!.length).toBeGreaterThan(0);
      addItemToCollectionStub.restore();
    });
  });

  describe('Queue Management', () => {
    it('should check if queue is empty correctly', async () => {

      // Initially queue should be empty
      expect(await EventQueue.queueIsEmpty()).toBe(true);
      
      // Publish an event
      await eventHandlerManager.registerEventHandlers('TEST_EVENT', ['test-task']);
      await EventQueue.publishEvent('TEST_EVENT', new Date());
      
      // Queue should not be empty
      expect(await EventQueue.queueIsEmpty()).toBe(false);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));
      const queueEvents = await dataManager.getAllInCollection('event_queue');
      // Queue should be empty again
      expect(await EventQueue.queueIsEmpty()).toBe(true);
    });

    it('should handle queue processing state correctly', async () => {
      // Initially should be running
      expect(EventQueue.isRunning()).toBe(true);
      
      // Stop processing
      EventQueue.stopEventQueueProcessing();
      expect(EventQueue.isRunning()).toBe(false);
      
      // Start processing again
      await EventQueue.startEventQueueProcessing();
      expect(EventQueue.isRunning()).toBe(true);
    });
  });

  describe('Event Queue Listener', () => {
    it('should setup listener and process events automatically', async () => {
      // Register event handlers
      await eventHandlerManager.registerEventHandlers('TEST_EVENT', ['test-task']);
      
      const mockTask = {
        name: 'test-task',
        beforeExecution: sinon.stub().resolves(),
        afterExecution: sinon.stub().resolves(),
      };
      getTaskByNameStub.returns(mockTask as any);
      
      // Create test user
      await UserManager.addUser({ uniqueIdentifier: 'test-user', initialAttributes: { name: 'Test User' } });

      // Setup listener
      EventQueue.setupEventQueueListener();
      
      // Wait for initial processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Publish an event (this should trigger the listener)
      await EventQueue.publishEvent('TEST_EVENT', new Date());
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify event was processed
      const archivedEvents = await dataManager.getAllInCollection('archived_events');
      expect(archivedEvents).toHaveLength(1);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed task and decision rule handlers', async () => {
      // Register event handlers with both task and decision rule
      await eventHandlerManager.registerEventHandlers('MIXED_EVENT', ['task1', 'rule1']);
      
      const mockTask = {
        name: 'task1',
        beforeExecution: () => {},
        afterExecution: () => {},
      };
      const taskBeforeExecutionStub = sinon.stub(mockTask, 'beforeExecution');
      const taskAfterExecutionStub = sinon.stub(mockTask, 'afterExecution');

      const mockDecisionRule = {
        name: 'rule1',
        beforeExecution: () => {},
        afterExecution: () => {},
      };
      const decisionRuleBeforeExecutionStub = sinon.stub(mockDecisionRule, 'beforeExecution');
      const decisionRuleAfterExecutionStub = sinon.stub(mockDecisionRule, 'afterExecution');
      
      getTaskByNameStub.withArgs('task1').returns(mockTask as any);
      getDecisionRuleByNameStub.withArgs('rule1').returns(mockDecisionRule as any);
      
      // Create test user
      await UserManager.addUser({ uniqueIdentifier: 'test-user', initialAttributes: { name: 'Test User' } });

      // Publish an event
      await EventQueue.publishEvent('MIXED_EVENT', new Date());
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify both handlers were executed
      const args = executeTaskStub.args;
      expect(args[0][0]).toMatchObject(mockTask);
      expect(args[0][1]).toMatchObject(expect.any(Object));
      expect(args[0][2]).toMatchObject(expect.any(Object));
      const args2 = executeDecisionRuleStub.args;
      expect(args2[0][0]).toMatchObject(mockDecisionRule);
      expect(args2[0][1]).toMatchObject(expect.any(Object));
      expect(args2[0][2]).toMatchObject(expect.any(Object)); // user
      
      // Verify lifecycle methods were called for both
      expect(taskBeforeExecutionStub.called).toBe(true);
      expect(taskAfterExecutionStub.called).toBe(true);
      expect(decisionRuleBeforeExecutionStub.called).toBe(true);
      expect(decisionRuleAfterExecutionStub.called).toBe(true);
    });

    it('should handle events with no users', async () => {
      // Register event handlers
      await eventHandlerManager.registerEventHandlers('TEST_EVENT', ['test-task']);
      
      const mockTask = {
        name: 'test-task',
        beforeExecution: () => {},
        afterExecution: () => {},
      };
      const taskBeforeExecutionStub = sinon.stub(mockTask, 'beforeExecution');
      const taskAfterExecutionStub = sinon.stub(mockTask, 'afterExecution');
      getTaskByNameStub.returns(mockTask as any);
      
      // Don't create any users
      
      // Publish an event
      await EventQueue.publishEvent('TEST_EVENT', new Date());
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify event was still archived
      const archivedEvents = await dataManager.getAllInCollection('archived_events');
      expect(archivedEvents).toHaveLength(1);
      
      // Verify lifecycle methods were still called
      expect(taskBeforeExecutionStub.called).toBe(true);
      expect(taskAfterExecutionStub.called).toBe(true);
      
      // Verify no task execution (no users)
      expect(executeTaskStub.called).toBe(false);
    });
  });
});