import { Log } from '../logger/logger-manager';
import { BaseHandler } from '../handlers/handler.type';

export class EventHandlerManager {
  private handlerMap: Map<string, string[]>;
  private static instance: EventHandlerManager | null = null;

  private constructor() {
    this.handlerMap = new Map();
  }

  /**
   * Returns the singleton instance of the EventManager.
   *
   * @returns {EventManager} The singleton instance of the EventManager.
   */
  public static getInstance(): EventHandlerManager {
    if (!EventHandlerManager.instance) {
      EventHandlerManager.instance = new EventHandlerManager();
    }
    return EventHandlerManager.instance;
  }

  /**
   * Registers a custom event by creating a standardized event object and adding it to the queue.
   *
   * @param {string} eventType - The type of event (e.g., 'CUSTOM_EVENT').
   * @param {string[]} handlerNames - The list of handler names associated with the event.
   * @returns {Promise<void>}
   */
  public registerEventHandlers = async (
    eventType: string,
    handlerNames: string[],
    overwriteExisting: boolean = false
  ): Promise<void> => {
    this.validateEventHandlerParams(eventType, handlerNames);
    if (this.hasHandlersForEventType(eventType) && !overwriteExisting) {
      Log.error(`Event registration failed.Event "${eventType}" already registered.`);
      throw new Error(`Event "${eventType}" already registered.`);
    } else {
      this.handlerMap.set(eventType, handlerNames);
    }
    Log.info(`Event "${eventType}" registered with handlers: ${handlerNames} and added to the event registry.`);
  };

  /**
   * Unregisters an event handler mapping by its event type.
   *
   * @param {string} eventType - The event type to unregister.
   */
  public unregisterEventHandlers = (eventType: string): void => {
    if (this.hasHandlersForEventType(eventType)) {
      this.handlerMap.delete(eventType);
      Log.info(`Event "${eventType}" unregistered.`);
    } else {
      Log.warn(`Unregister event failed. Event "${eventType}" not found in the event registry.`);
    }
  };

  /**
   * Validates the parameters for an event registration.
   *
   * @param {string} eventType - The name of the event.
   * @param {string[]} handlerNames - The list of handlers.
   * @throws {Error} If the eventType or handlers are invalid.
   */
  private validateEventHandlerParams = (
    eventType: string, handlerNames: string[]): void => {
    if (!eventType || typeof eventType !== 'string') {
      Log.error(`Invalid event type: "${eventType}"`);
      throw new Error('Event name must be a non-empty string.');
    }
    if (
      !Array.isArray(handlerNames) ||
      handlerNames.length === 0 ||
      !handlerNames.every((h) => typeof h === 'string' && h !== '')
    ) {
      Log.error(`Invalid handler names for event "${eventType}": ${handlerNames}`);
      throw new Error('Handler names must be a non-empty array of strings.');
    }
  };

  /**
   * Returns the handlers for a given event type.
   *
   * @param {string} eventType - The event type.
   * @returns {string[]} The handler names for the event type.
   */
  public getHandlersForEventType = (eventType: string): string[] => {
    if (!this.hasHandlersForEventType(eventType)) {
      Log.error(`No handlers found for event type "${eventType}".`);
      return [];
    }
    return this.handlerMap.get(eventType) ?? [];
  };

  /**
   * Checks if there are handlers for a given event type.
   *
   * @param {string} eventType - The event type.
   * @returns {boolean} True if there are handlers for the event type, false otherwise.
   */
  public hasHandlersForEventType = (eventType: string): boolean => {
    return this.handlerMap.has(eventType);
  };

  /**
   * Clears all event handlers from the event registry.
   */
  public clearEventHandlers = (): void => {
    this.handlerMap.clear();
    Log.info(`All event handlers cleared. handler map now: ${JSON.stringify(this.handlerMap)}.`);
  };
}
