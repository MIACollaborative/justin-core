import { v4 as uuidv4 } from 'uuid';
import { JEvent } from './event.type';
import { registerEvent, publishEventInstance } from './event-queue';
import { EVENTS } from '../data-manager/data-manager.constants'
import { Log } from '../logger/logger-manager';
import DataManager from '../data-manager/data-manager';

const dataManager = DataManager.getInstance();
const clockIntervals: Map<string, NodeJS.Timeout> = new Map();

/**
 * Registers a custom event by creating a standardized event object and adding it to the queue.
 */
const registerCustomEventHandlers = async (
  name: string,
  eventType: string,
  procedures: string[]
): Promise<void> => {
  validateEventHandlerParams(name, procedures);
  const customEventHandler = createEventObject(eventType, name, procedures);
  await registerEvent(customEventHandler);
  Log.info(`Custom event "${name}" registered and added to the event registry.`);
  const eventRegistry = await dataManager.getAllInCollection<JEvent>(EVENTS);
  Log.info(`Event registry: ${JSON.stringify(eventRegistry)}`);
};

/**
 * Registers a clock event with the given name, interval, and procedures.
 */
const registerClockEventHandlers = async (
  name: string,
  interval: number,
  procedures: string[]
): Promise<void> => {
  validateEventHandlerParams(name, procedures);
  validateInterval(interval, name);

  const existingEventHandlers = await dataManager.getAllInCollection<JEvent>('events');
  const isAlreadyRegistered = existingEventHandlers?.some(
    (event: JEvent) => event.eventType === 'CLOCK_EVENT' && event.name === name
  );

  if (isAlreadyRegistered) {
    Log.warn(`Clock event "${name}" is already registered.`);
    return;
  }

  const event = createEventObject('CLOCK_EVENT', name, procedures);
  event.interval = interval; // Add interval to the event metadata
  await registerEvent(event);

  Log.info(`Clock event "${name}" registered with interval ${interval}ms.`);
};

/**
 * Initializes all registered clock events from the database.
 * Retrieves their metadata and triggers them with their respective intervals.
 */
const initializeClockEvents = async (): Promise<void> => {
  const clockEvents = await dataManager.getAllInCollection<JEvent>(EVENTS);

  if (!clockEvents || clockEvents.length === 0) {
    Log.warn('No clock events found to initialize.');
    return;
  }

  clockEvents
    .filter(event => event.eventType === 'CLOCK_EVENT')
    .forEach(event => {
      if (event.interval && event.procedures) {
        startClockEventInterval(event.name, event.interval, event.procedures);
        Log.info(`Clock event "${event.name}" initialized with interval ${event.interval}ms.`);
      } else {
        Log.warn(`Incomplete metadata for clock event "${event.name}". Skipping initialization.`);
      }
    });
};

/**
 * Handles the interval logic for triggering a clock event.
 */
const startClockEventInterval = (
  name: string,
  interval: number,
  procedures: string[]
): void => {
  const clockEventLogic = async () => {
    await publishEventInstance(name);
  };

  const intervalId = setInterval(clockEventLogic, interval);
  clockIntervals.set(name, intervalId);

  Log.info(`Clock event "${name}" trigger set with interval ${interval}ms.`);
};

/**
 * Unregisters a clock or custom event by its name.
 */
const unregisterEventHandlers = (name: string): void => {
  if (clockIntervals.has(name)) {
    const interval = clockIntervals.get(name);
    if (interval) {
      clearInterval(interval);
      clockIntervals.delete(name);
      Log.info(`Clock event "${name}" unregistered and stopped.`);
    }
  } else {
    Log.info(`Custom event "${name}" unregistered.`);
  }
};

/**
 * Validates the name and procedures of an event.
 */
const validateEventHandlerParams = (name: string, procedures: string[]): void => {
  if (!name || typeof name !== 'string') {
    Log.error(`Invalid event name: "${name}"`);
    throw new Error('Event name must be a non-empty string.');
  }
  if (
    !Array.isArray(procedures) ||
    procedures.length === 0 ||
    !procedures.every((p) => typeof p === 'string')
  ) {
    Log.error(`Invalid procedures for event "${name}": ${procedures}`);
    throw new Error('Procedures must be a non-empty array of strings.');
  }
};

/**
 * Validates the interval for clock events.
 */
const validateInterval = (interval: number, name: string): void => {
  if (typeof interval !== 'number' || interval <= 0) {
    Log.error(`Invalid interval for clock event "${name}": ${interval}`);
    throw new Error('Interval must be a positive number.');
  }
};

/**
 * Creates a standardized event object with the specified type, name, and procedures.
 */
const createEventObject = (
  eventType: string,
  name: string,
  procedures: string[]
): JEvent => {
  return {
    id: uuidv4(),
    eventType,
    name,
    procedures,
    timestamp: new Date(),
  };
};

/**
 * Returns the current clock intervals.
 */
const getClockIntervals = (): Map<string, NodeJS.Timeout> => {
  return clockIntervals;
};

const EventManager = {
  registerCustomEventHandlers,
  registerClockEventHandlers,
  initializeClockEvents,
  startClockEventInterval,
  unregisterEventHandler: unregisterEventHandlers,
  getClockIntervals,
}
export default EventManager;
