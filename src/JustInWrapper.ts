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
  DecisionRuleRegistration, RecordResultFunction,
} from './handlers/handler.type';
import { DBType } from './data-manager/data-manager.constants';
import { Logger } from './logger/logger.interface';
import { UserManager } from './user-manager/user-manager';
import { IntervalTimerEventGenerator } from './event/interval-timer-event-generator';
import { IntervalTimerEventGeneratorOptions } from './event/event.type';
import { NewUserRecord, JUser } from './user-manager/user.type';
import { setDecisionRuleResultRecorder, setTaskResultRecorder } from "./handlers/result-recorder";


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
  private intervalTimerEventGenerators: Map<string, IntervalTimerEventGenerator> = new Map();

  protected constructor() {
    this.isInitialized = false;
    this.initializedAt = new Date();
  }

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
   * Deletes the singleton instance of JustInWrapper.
   */
  public static killInstance(): void {
    if (JustInWrapper.instance) {
      JustInWrapper.instance = null;
    }
  }

  /**
   * Returns the initialization status of the JustInWrapper.
   * @returns {boolean} The initialization status.
   */
  public getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * Initializes the DataManager and UserManager, setting up the database connection.
   * This should be called before any operations that depend on the database.
   * @param {DBType} dbType - The type of database to initialize (default is MongoDB).
   * @returns {Promise<void>}
   */
  public async init(dbType: DBType = DBType.MONGO): Promise<void> {
    if (this.getInitializationStatus()) {
      Log.warn('JustInWrapper is already initialized.');
      return;
      }
    await this.dataManager.init(dbType);
    await UserManager.init();
    this.isInitialized = true;
    Log.info('JustIn initialized successfully.');
  }
  /**
   * Shuts down data manager, user manager, and event queue.
   * Clears all interval timer event generators and event handlers.
   * This should be called when the application is shutting down.
   */
  public async shutdown(): Promise<void> {
    try {
      if (!this.getInitializationStatus()) {
        Log.warn('JustInWrapper is not initialized.');
        return;
      }
      await this.stopEngine();
      UserManager.shutdown();
      await this.dataManager.close();
      this.intervalTimerEventGenerators.clear();
      this.eventHandlerManager.clearEventHandlers();
      this.isInitialized = false;
      this.initializedAt = null;
      Log.info('JustIn shut down successfully.');
    } catch (error) {
      Log.warn('Error shutting down JustInWrapper:', error);
    }
  }

  /**
   * Starts the event queue engine, processing all queued events.
   * This should be called after init().
   */
  public async startEngine(): Promise<void> {
    Log.dev('Starting engine...');

    await startEventQueueProcessing();

    this.intervalTimerEventGenerators.forEach((eventGenerator, eventTypeName) => {
      Log.info(`Starting interval timer event generator for event type: ${eventTypeName}`);
      eventGenerator.start();
    });

    await processEventQueue();
    Log.info(`Engine started and processing events at ${new Date().toISOString()}.`);
  }

  /**
   * Stops the engine, halts event processing, and unregisters all clock events.
   * This can be called to stop the engine without shutting down the application.
   */
  public async stopEngine(): Promise<void> {
    this.intervalTimerEventGenerators.forEach((eventGenerator, eventTypeName) => {
      Log.info(`Stopping interval timer event generator for event type: ${eventTypeName}`);
      eventGenerator.stop();
    });
    stopEventQueueProcessing();
    Log.info('Engine stopped and cleared of all events.');
  }

  /**
   * Adds a list of new users to the database.
   * @param {NewUserRecord[]} users - The list of new users to add.
   * @returns {Promise<(JUser | null)[]>} The list of added users, or null if not found.
   */
  public async addUsersToDatabase(users: NewUserRecord[]) : Promise<(JUser | null)[]> {
    return await UserManager.addUsers(users);
  }

  /**
   * Retrieves a list of users from the database.
   * @returns {Promise<(JUser | null)[]>} The list of users, or null if not found.
   */
  public async getUsersFromDatabase(): Promise<(JUser | null)[]> {
    return await UserManager.getAllUsers();
  }

  /**
   * Adds a new user to the database.
   * @param {NewUserRecord} newUserRecord - The new user record to add.
   * @returns {Promise<JUser>} The added user.
   */
  public async addUser(newUserRecord: NewUserRecord): Promise<JUser | null> {
    return await UserManager.addUser(newUserRecord);
  }

  /**
   * Retrieves a user from the database by their unique identifier.
   * @param {string} uniqueIdentifier - The unique identifier of the user.
   * @returns {Promise<JUser | null>} The user, or null if not found.
   */
  public async getUser(uniqueIdentifier: string): Promise<JUser | null> {
    return await UserManager.getUserByUniqueIdentifier(uniqueIdentifier);
  }

  /**
   * Retrieves a user from the database by their unique identifier.
   * @param {string} uniqueIdentifier - The unique identifier of the user.
   * @param {Record<string, any>} attributesToUpdate - The attributes to update in the user record.
   * @returns {Promise<JUser | null>} The user, or null if not found.
   */
  public async updateUser(uniqueIdentifier: string, attributesToUpdate: Record<string, any>): Promise<JUser | null> {
    return await UserManager.updateUserByUniqueIdentifier(uniqueIdentifier, attributesToUpdate);
  }

    /**
   * Deletes a user from the database by their unique identifier.
   * @param {string} uniqueIdentifier - The unique identifier of the user.
   * @returns {Promise<void>} A promise that resolves when the user is deleted.
   */
  public async deleteUser(uniqueIdentifier: string): Promise<void> {
    return await UserManager.deleteUserByUniqueIdentifier(uniqueIdentifier);
  }

  /**
   * Registers a new event type and adds it to the queue.
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
   * Creates a new interval timer event generator.
   * @param {string} eventTypeName - The name of the event type.
   * @param {number} intervalInMs - The interval in milliseconds.
   * @param {IntervalTimerEventGeneratorOptions} options - The options for the event generator.
   */
  public createIntervalTimerEventGenerator(eventTypeName: string, intervalInMs: number, options: IntervalTimerEventGeneratorOptions = {}): void {
    const eventGenerator = new IntervalTimerEventGenerator(intervalInMs, eventTypeName, options);
    this.intervalTimerEventGenerators.set(eventTypeName, eventGenerator);
  }

  /**
   * Returns the interval timer event generators.
   * @returns {Map<string, IntervalTimerEventGenerator>} The interval timer event generators.
   */
  public getIntervalTimerEventGenerators(): Map<string, IntervalTimerEventGenerator> {
    return this.intervalTimerEventGenerators;
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
   * Sets up the event queue listener.
   */
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
   * Configures the writer for a task result with a custom function.
   * Will default to writing to the db
   * @param {RecordResultFunction} taskWriter - The function to take in the results of a task
   */
  public configureTaskResultWriter(taskWriter: RecordResultFunction): void {
    setTaskResultRecorder(taskWriter)
  }

  /**
   * Configures the writer for a decision rule result with a custom function.
   * Will default to writing to the db
   * @param {RecordResultFunction} decisionRuleWriter - The function to take in the results of a task
   */
  public configureDecisionRuleResultWriter(decisionRuleWriter: RecordResultFunction): void {
    setDecisionRuleResultRecorder(decisionRuleWriter)
  }

  /**
   * Sets the logging levels for the application.
   * @param levels - The logging levels to enable or disable.
   */
  public setLoggingLevels(levels: Partial<typeof logLevels>): void {
    setLogLevels(levels);
  }
}

export const JustIn = () => {
  return JustInWrapper.getInstance();
};
