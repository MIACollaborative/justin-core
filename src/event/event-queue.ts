import { v4 as uuidv4 } from 'uuid';
import { ChangeListenerManager } from '../data-manager/change-listener.manager';
import DataManager from '../data-manager/data-manager';
import { UserManager } from '../user-manager/user-manager';
import { JEvent, RegisterJEvent } from './event.type';
import {
  ARCHIVED_EVENTS,
  EVENTS,
  EVENTS_QUEUE,
} from '../data-manager/data-manager.constants';
import { Log } from '../logger/logger-manager';
import { executeTask, getTaskByName } from '../handlers/task.manager';
import {
  executeDecisionRule,
  getDecisionRuleByName,
} from '../handlers/decision-rule.manager';
import { JUser } from '../user-manager/user.type';
import { CollectionChangeType } from '../data-manager/data-manager.type';

const dataManager = DataManager.getInstance();
const clm = ChangeListenerManager.getInstance();
let isProcessingQueue = false;
let shouldProcessQueue = true;

/**
 * Registers an event in the `EVENTS` collection.
 */
export const registerEvent = async (event: RegisterJEvent): Promise<void> => {
  if (!validateEvent(event)) {
    Log.error(`Invalid event format: ${JSON.stringify(event)}`);
    throw new Error(
      'Invalid event format. Each event must include a valid eventType and procedures.'
    );
  }

  try {
    Log.info(`Registering event type "${event.name}".`);
    const existingEvents = await dataManager.getAllInCollection<JEvent>(EVENTS);
    const isAlreadyRegistered = existingEvents?.some(
      (e) => e.name === event.name
    );
    if (isAlreadyRegistered) {
      Log.warn(
        `Event "${event.eventType} - ${event.name}" is already registered.`
      );
      return;
    }
    await dataManager.addItemToCollection(EVENTS, event);
    Log.info(
      `Event "${event.eventType} - ${event.name}" registered successfully.`
    );
  } catch (error) {
    Log.error(
      `Failed to register event "${event.eventType} - ${event.name}": ${error}`
    );
    throw error;
  }
};

/**
 * Triggers an event by creating an instance in the `EVENTS_QUEUE`.
 */
export const publishEventInstance = async (name: string, eventDetails?: Record<string, any>): Promise<void> => {
  try {
    const registeredEvents =
      await dataManager.getAllInCollection<JEvent>(EVENTS);
    const registeredEvent = registeredEvents?.find((e) => e.name === name);

    if (!registeredEvent) {
      Log.error(`Event name "${name}" is not registered.`);
      throw new Error(`Event type or name "${name}" is not registered.`);
    }

    const eventInstance: JEvent = {
      id: uuidv4(),
      eventType: registeredEvent.eventType,
      name: registeredEvent.name,
      procedures: registeredEvent.procedures,
      timestamp: new Date(),
      eventDetails,
    };

    await dataManager.addItemToCollection(EVENTS_QUEUE, eventInstance);
    Log.info(
      `Published event "${eventInstance.eventType} - ${eventInstance.name}" with ID: ${eventInstance.id}.`
    );
  } catch (error) {
    Log.error(`Failed to publish event "${name}": ${error}`);
    throw error;
  }
};

/**
 * Processes events in the `EVENTS_QUEUE`.
 */
export const processEventQueue = async (): Promise<void> => {
  if (isProcessingQueue) {
    Log.info('Event queue processing already in progress. Skipping trigger.');
    return;
  }

  isProcessingQueue = true;

  try {
    Log.info('Starting event queue processing.');

    while (shouldProcessQueue) {
      const users = UserManager.getAllUsers();
      const events = (await dataManager.getAllInCollection(
        EVENTS_QUEUE
      )) as JEvent[];

      if (!events || events.length === 0) {
        Log.info('No events left in the queue. Pausing processing.');
        break;
      }

      for (const event of events) {
        Log.info(`Processing event "${event.eventType}" with ID: ${event.id}.`);

        for (const procedure of event.procedures) {
          await processExecutionLifecycle(procedure, event, "beforeExecution")
        }

        for (const user of users) {
          try {
            await processAssignments(event, user);
          } catch (error) {
            Log.error(
              `Error processing event "${event.eventType}" with ID: ${event.id} for user ${user.id}: ${error}`
            );
          }
        }

        for (const procedure of event.procedures) {
          await processExecutionLifecycle(procedure, event, "afterExecution")
        }

        try {
          await archiveEvent(event);
        } catch (error) {
          Log.error(
            `Failed to archive event "${event.eventType}" with ID: ${event.id}: ${error}`
          );
        }
      }
    }

    Log.info('Finished processing event queue.');
  } catch (error) {
    Log.error(`Error during event queue processing: ${error}`);
  } finally {
    isProcessingQueue = false;
  }
};

/**
 * Sets up a listener for the `EVENTS_QUEUE` collection.
 */
export const setupEventQueueListener = (): void => {
  Log.info('Setting up event queue listener.');
  clm.addChangeListener(EVENTS_QUEUE, CollectionChangeType.INSERT, async () => {
    if (shouldProcessQueue) {
      Log.info('New event detected in EVENTS_QUEUE. Triggering processing.');
      await processEventQueue();
    }
  });

  processEventQueue().catch((error) =>
    Log.error(`Error during initial queue processing: ${error}`)
  );

  Log.info('Event queue listener set up successfully.');
};

/**
 * Processes assignments (tasks or decision rules) for an event and user.
 */
const processAssignments = async (event: JEvent, user: JUser): Promise<void> => {
  for (const assignmentName of event.procedures) {
    try {
      const task = getTaskByName(assignmentName);
      if (task) {
        await executeTask(task, event, user);
        continue;
      }

      const decisionRule = getDecisionRuleByName(assignmentName);
      if (decisionRule) {
        await executeDecisionRule(decisionRule, event, user);
        continue;
      }

      Log.warn(
        `Assignment "${assignmentName}" not found for event "${event.eventType}".`
      );
    } catch (error) {
      Log.error(
        `Error processing assignment "${assignmentName}" for event "${event.eventType}" and user "${user.id}": ${error}`
      );
    }
  }
};

const processExecutionLifecycle = async (
  procedureName: string,
  event: JEvent,
  functionName: "beforeExecution" | "afterExecution"
): Promise<void> => {
  try {
    const task = getTaskByName(procedureName);
    if (task && typeof task[functionName] === "function") {
      await task[functionName](event);
      return;
    }

    const decisionRule = getDecisionRuleByName(procedureName);
    if (decisionRule && typeof decisionRule[functionName] === "function") {
      await decisionRule[functionName](event);
      return;
    }

    // Log warning if function is not found
    Log.warn(`"${functionName}" not found for assignment "${procedureName}".`);
  } catch (error) {
    Log.error(
      `Error executing "${functionName}" for assignment "${procedureName}" and event "${event.eventType}": ${error}`
    );
  }
};

/**
 * Archives a processed event by moving it from `EVENTS_QUEUE` to `ARCHIVED_EVENTS`.
 */
const archiveEvent = async (event: JEvent): Promise<void> => {
  try {
    Log.info(`Archiving event "${event.eventType}" with ID: ${event.id}.`);
    await dataManager.addItemToCollection(ARCHIVED_EVENTS, event);
    await dataManager.removeItemFromCollection(EVENTS_QUEUE, event.id);
    Log.info(
      `Event "${event.eventType}" with ID: ${event.id} archived successfully.`
    );
  } catch (error) {
    Log.error(
      `Failed to archive event "${event.eventType}" with ID: ${event.id}: ${error}`
    );
    throw error;
  }
};

/**
 * Validates the format of an event.
 */
const validateEvent = (event: RegisterJEvent): boolean => {
  return (
    typeof event.eventType === 'string' &&
    Array.isArray(event.procedures) &&
    event.procedures.every((p) => typeof p === 'string')
  );
};

/**
 * Stops the event queue processing.
 */
export const stopEventQueueProcessing = (): void => {
  shouldProcessQueue = false;
  clm.removeChangeListener(EVENTS_QUEUE, CollectionChangeType.INSERT);
  Log.info('Event queue processing stopped.');
};


export function isRunning(): boolean {
  return shouldProcessQueue;
}

export async function queueIsEmpty(): Promise<boolean> {
  const events = await dataManager.getAllInCollection(EVENTS_QUEUE);
  return !events || events.length === 0;
}
