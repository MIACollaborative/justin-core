import DataManager from './data-manager/data-manager';
import EventManager from './event/event.manager';
import {
  publishEventInstance,
  processEventQueue,
  setupEventQueueListener,
  stopEventQueueProcessing,
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
class JustInWrapper {
  private static instance: JustInWrapper;
  private dataManager: DataManager = DataManager.getInstance();
  private isInitialized: boolean = false;

  private constructor() {}

  /**
   * Retrieves the singleton instance of JustInWrapper.
   * @returns {JustInWrapper} The singleton instance.
   */
  public static getInstance(): JustInWrapper {
    if (!JustInWrapper.instance) {
      JustInWrapper.instance = new JustInWrapper();
    }
    return JustInWrapper.instance;
  }

  /**
   * Initializes the DataManager, setting up the database connection.
   * This should be called before any operations that depend on the database.
   * @param {DBType} dbType - The type of database to initialize (default is MongoDB).
   * @returns {Promise<void>}
   */
  public async initializeDB(dbType: DBType = DBType.MONGO): Promise<void> {
    if (this.isInitialized) {
      Log.warn('DataManager is already initialized.');
      return;
    }
    await this.dataManager.init(dbType);
    await UserManager.init();
    this.isInitialized = true;
    Log.info('DataManager initialized successfully.');
  }

  public async addUsersToDatabase(users: object[]) : Promise<void> {
    await UserManager.addUsersToDatabase(users);
  }
  /**
   * Registers a new custom event and adds it to the queue.
   * @param {string} name - The name of the custom event.
   * @param {string[]} procedures - The ordered task or decision rule names for the event.
   */
  public async registerCustomEvent(
    name: string,
    eventType: string,
    procedures: string[]
  ): Promise<void> {
    await EventManager.registerCustomEventHandlers(name, eventType, procedures);
  }

  /**
   * Registers a new clock event with a specified interval.
   * @param {string} name - The name of the clock event.
   * @param {number} interval - The interval in milliseconds at which the clock event triggers.
   * @param {string[]} procedures - The ordered task or decision rule names for the event.
   */
  public async registerClockEvent(
    name: string,
    interval: number,
    procedures: string[]
  ): Promise<void> {
    await EventManager.registerClockEventHandlers(name, interval, procedures);
  }

  /**
   * Unregisters an existing event by name.
   * @param {string} name - The name of the event to unregister.
   */
  public unregisterEventHandlers(name: string): void {
    EventManager.unregisterEventHandler(name);
  }
  /**
   * Triggers a registered event by name, adding it to the processing queue.
   * @param {string} eventName - The name of the event to trigger.
   * @param {object} eventDetails - The details of the event instance.
   *      NOTE: publishEventDetails expects a Record,
   *      but I don't think we want to expose this to 3PDs
   */
  public async publishEvent(eventName: string, eventDetails?: object): Promise<void> {
    await publishEventInstance(eventName, eventDetails);
  }

  /**
   * Starts the event queue engine, processing all queued events.
   */
  public async startEngine(): Promise<void> {
    Log.info('Starting engine...');

    setupEventQueueListener();

    await EventManager.initializeClockEvents();

    await processEventQueue();
    Log.info('Engine started and processing events.');
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
  public async stopEngine(): Promise<void> {
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

export const JustIn = JustInWrapper.getInstance();
