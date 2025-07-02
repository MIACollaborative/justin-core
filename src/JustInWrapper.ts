import DataManager from './data-manager/data-manager';
import { EventHandlerManager } from './event/event-handler-manager';
import {
  publishEvent,
  processEventQueue,
  setupEventQueueListener,
  stopEventQueueProcessing,
  startEventQueueProcessing,
} from './event/event-queue';
import { registerTask } from './handlers/task.manager';
import { registerDecisionRule } from './handlers/decision-rule.manager';
import {
  setLogger,
  setLogLevels,
  Log,
  logLevels,
} from './logger/logger-manager';
import {
  TaskRegistration,
  DecisionRuleRegistration,
} from './handlers/handler.type';
import { DBType } from './data-manager/data-manager.constants';
import { Logger } from './logger/logger.interface';
import { UserManager } from './user-manager/user-manager';

const clockIntervals: Map<string, NodeJS.Timeout> = new Map();

/**
 * JustInWrapper class provides a unified interface for managing application-level configurations,
 * event registrations, data manager initialization, and orchestrating the event queue for processing.
 */
export class JustInWrapper {
  protected static instance: JustInWrapper | null = null;
  private dataManager: DataManager = DataManager.getInstance();
  private eventHandlerManager: EventHandlerManager = EventHandlerManager.getInstance();
  private isInitialized: boolean = false;
  private initializedAt: Date | null = null;
  protected constructor() {
    this.isInitialized = false;
    this.initializedAt = new Date();
  }

  /**
   * Retrieves the singleton instance of JustInWrapper.
   * @returns {JustInWrapper} The singleton instance.
   */
  public static getInstance(): JustInWrapper {
    Log.info('Entering JW.getInstance, instance?', JustInWrapper.instance ? JustInWrapper.instance.initializedAt : 'not initialized');
    if (!JustInWrapper.instance) {
      JustInWrapper.instance = new JustInWrapper();
      Log.info('In JW.getInstance, new JustInWrapper instance created at:', JustInWrapper.instance.initializedAt);
    }
    return JustInWrapper.instance;
  }

  /**
   * Deletes the singleton instance of JustInWrapper.
   */
  protected static killInstance(): void {
    if (JustInWrapper.instance) {
      JustInWrapper.instance = null;
    }
  }

  /**
   * Initializes the DataManager, setting up the database connection.
   * This should be called before any operations that depend on the database.
   * @param {DBType} dbType - The type of database to initialize (default is MongoDB).
   * @returns {Promise<void>}
   */
  public async initializeDB(dbType: DBType = DBType.MONGO): Promise<void> {
    Log.info('Entering JW.initializeDB, isInitialized:', this.isInitialized);
    if (this.isInitialized) {
      Log.warn('DataManager is already initialized.');
      return;
      }
    Log.info('In JW.initializeDB, about to init dataManager');
    await this.dataManager.init(dbType);
    Log.info('In JW.initializeDB, about to init UserManager');
    await UserManager.init();
    this.isInitialized = true;
    Log.info('DataManager initialized successfully.');
  }

  public async addUsersToDatabase(users: object[]) : Promise<void> {
    await UserManager.addUsersToDatabase(users);
  }
  /**
   * Registers a new custom event and adds it to the queue.
   * @param {string} eventType - The type of the event.
   * @param {string[]} handlers - The ordered task or decision rule names for the event.
   */
  public async registerEventHandlers(
    eventType: string,
    handlers: string[]
  ): Promise<void> {
    await this.eventHandlerManager.registerEventHandlers(eventType, handlers);
  }


  /**
   * Unregisters an existing event by name.
   * @param {string} eventType - The type of the event to unregister.
   */
  public unregisterEventHandlers(eventType: string): void {
    this.eventHandlerManager.unregisterEventHandlers(eventType);
  }

  /**
   * Publishes an event, adding it to the processing queue.
   * @param {string} eventType - The type of the event.
   * @param {Date} generatedTimestamp - The timestamp of the event.
   * @param {object} eventDetails - The details of the event instance.
   *      NOTE: publishEventDetails expects a Record,
   *      but I don't think we want to expose this to 3PDs
   */
  public async publishEvent(eventType: string, generatedTimestamp: Date, eventDetails?: object): Promise<void> {
    await publishEvent(eventType, generatedTimestamp, eventDetails);
  }

  /**
   * Starts the event queue engine, processing all queued events.
   */
  public async startEngine(): Promise<void> {
    Log.info('Starting engine...');

    startEventQueueProcessing();
    setupEventQueueListener();

    //await EventHandlerManager.getInstance().initializeClockEvents();

    await processEventQueue();
    Log.info('Engine started and processing events.');
  }

  public setupEventQueueListener(): void {
    setupEventQueueListener();
  }

  /**
   * Registers a new task within the framework.
   * @param {TaskRegistration} task - The task to register.
   */
  public registerTask(task: TaskRegistration): void {
    registerTask(task);
  }

  /**
   * Registers a new decision rule within the framework.
   * @param {DecisionRuleRegistration} decisionRule - The decision rule to register.
   */
  public registerDecisionRule(decisionRule: DecisionRuleRegistration): void {
    registerDecisionRule(decisionRule);
  }

  /**
   * Configures the logger with a custom logger instance.
   * @param {Logger} logger - The logger implementation to use.
   */
  public configureLogger(logger: Logger): void {
    setLogger(logger);
  }

  /**
   * Sets the logging levels for the application.
   * @param levels - The logging levels to enable or disable.
   */
  public setLoggingLevels(levels: Partial<typeof logLevels>): void {
    setLogLevels(levels);
  }

  /**
   * Stops the engine, halts event processing, and unregisters all clock events.
   */
  public async shutdown(): Promise<void> {
    clockIntervals.forEach((interval, name) => {
      clearInterval(interval);
      clockIntervals.delete(name);
      Log.info(`Clock event "${name}" stopped.`);
    });

    stopEventQueueProcessing();
    UserManager.stopUserManager();
    await DataManager.getInstance().close();
    Log.info('Engine stopped and cleared of all events.');
  }
}

export const JustIn = () => {
  Log.info('Entering JustIn, returning JustInWrapper.getInstance()');
  return JustInWrapper.getInstance();
};