import { v4 as uuidv4 } from 'uuid';
import { JEvent } from './event.type';
import { registerEvent, publishEventInstance } from './event-queue';
import { EVENTS } from '../data-manager/data-manager.constants';
import { Log } from '../logger/logger-manager';
import DataManager from '../data-manager/data-manager';

const dataManager = DataManager.getInstance();
const clockIntervals: Map<string, NodeJS.Timeout> = new Map();

/**
 * Registers a custom event by creating a standardized event object and adding it to the queue.
 *
 * @param {string} name - The unique name of the event.
 * @param {string} eventType - The type of event (e.g., 'CUSTOM_EVENT').
 * @param {string[]} procedures - The list of procedures associated with the event.
 * @returns {Promise<void>}
 */
const registerCustomEventHandlers = async (
  name: string,
  eventType: string,
  procedures: string[]
): Promise<void> => {
  validateEventHandlerParams(name, procedures);

  const event = createEventObject(eventType, name, procedures);
  await registerEvent(event);

  Log.info(`Custom event "${name}" registered and added to the queue.`);
};

/**
 * Registers a clock event with the given name, interval, and procedures.
 * Ensures that the event starts at the next valid multiple of the interval.
 *
 * @param {string} name - The unique name of the clock event.
 * @param {number} interval - The interval in milliseconds at which the event should trigger.
 * @param {string[]} procedures - The list of procedures associated with the event.
 * @returns {Promise<void>}
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
  event.interval = interval;
  await registerEvent(event);

  Log.info(`Clock event "${name}" registered with interval ${interval}ms.`);
};

/**
 * Initializes all registered clock events from the database.
 * Ensures that each event starts at the correct time.
 *
 * @returns {Promise<void>}
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
 * Starts a clock event at the next aligned interval.
 * Ensures that execution aligns with the correct time slots (e.g., 0, 2, 4, 6, ...).
 *
 * @param {string} name - The name of the clock event.
 * @param {number} interval - The interval in milliseconds.
 * @param {string[]} procedures - The list of procedures associated with the event.
 */
const startClockEventInterval = (
  name: string,
  interval: number,
  procedures: string[]
): void => {
  const now = new Date();
  const nowMinutes = now.getMinutes();
  const nowSeconds = now.getSeconds();
  const nowMilliseconds = now.getMilliseconds();

  const intervalInMinutes = interval / 60000;

  let nextAlignedMinute = Math.floor(nowMinutes / intervalInMinutes) * intervalInMinutes;
  if (nextAlignedMinute <= nowMinutes) {
    nextAlignedMinute += intervalInMinutes;
  }

  if (nextAlignedMinute >= 60) {
    nextAlignedMinute = 0;
  }

  // Calculate delay until next aligned execution time
  const firstDelay = ((nextAlignedMinute - nowMinutes) * 60 * 1000) - (nowSeconds * 1000) - nowMilliseconds;

  Log.info(`Clock event "${name}" will start in ${firstDelay / 1000} seconds, then every ${interval / 1000 / 60} minute(s).`);

  setTimeout(() => {
    publishEventInstance(name);
    const intervalId = setInterval(() => publishEventInstance(name), interval);
    clockIntervals.set(name, intervalId);
    Log.info(`Clock event "${name}" started with interval ${interval}ms.`);
  }, firstDelay);
};


/**
 * Unregisters a clock or custom event by its name.
 * Clears any scheduled intervals associated with the event.
 *
 * @param {string} name - The name of the event to unregister.
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
 * Validates the parameters for an event registration.
 *
 * @param {string} name - The name of the event.
 * @param {string[]} procedures - The list of procedures.
 * @throws {Error} If the name or procedures are invalid.
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
 * Validates the interval value for clock events.
 *
 * @param {number} interval - The interval in milliseconds.
 * @param {string} name - The name of the event.
 * @throws {Error} If the interval is invalid.
 */
const validateInterval = (interval: number, name: string): void => {
  if (typeof interval !== 'number' || interval <= 0) {
    Log.error(`Invalid interval for clock event "${name}": ${interval}`);
    throw new Error('Interval must be a positive number.');
  }
};

/**
 * Creates a standardized event object.
 *
 * @param {string} eventType - The type of the event.
 * @param {string} name - The name of the event.
 * @param {string[]} procedures - The list of procedures.
 * @returns {JEvent} The created event object.
 */
const createEventObject = (
  eventType: string,
  name: string,
  procedures: string[]
): JEvent => ({
  id: uuidv4(),
  eventType,
  name,
  procedures,
  timestamp: new Date(),
});

const EventManager = {
  registerCustomEventHandlers,
  registerClockEventHandlers,
  initializeClockEvents,
  startClockEventInterval,
  unregisterEventHandler: unregisterEventHandlers,
};

export default EventManager;
