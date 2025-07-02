import { v4 as uuidv4 } from 'uuid';
import { ChangeListenerManager } from '../data-manager/change-listener.manager';
import DataManager from '../data-manager/data-manager';
import { UserManager } from '../user-manager/user-manager';
import { JEvent, RegisterJEvent } from './event.type';
import {
  ARCHIVED_EVENTS,
  EVENT_QUEUE,
} from '../data-manager/data-manager.constants';
import { Log } from '../logger/logger-manager';
import { executeTask, getTaskByName } from '../handlers/task.manager';
import {
  executeDecisionRule,
  getDecisionRuleByName,
} from '../handlers/decision-rule.manager';
import { JUser } from '../user-manager/user.type';
import { CollectionChangeType } from '../data-manager/data-manager.type';
import { EventHandlerManager } from './event-handler-manager';

const dataManager = DataManager.getInstance();
const clm = ChangeListenerManager.getInstance();
const eventHandlerManager = EventHandlerManager.getInstance();

let isProcessingQueue = false;
let shouldProcessQueue = true;


/**
 * Triggers an event by creating an instance in the `EVENTS_QUEUE`.
 */
export const publishEvent = async (
  eventType: string, 
  generatedTimestamp: Date, 
  eventDetails?: Record<string, any>
): Promise<void> => {
  try {
    if (!eventHandlerManager.hasHandlersForEventType(eventType)) {
      Log.warn(`No handlers found for event type "${eventType}". Skipping event publication.`);
      return;
    }

    const eventInstance: JEvent = {
      eventType,
      generatedTimestamp,
      eventDetails,
    };

    const addedEvent = await dataManager.addItemToCollection(EVENT_QUEUE, eventInstance) as JEvent;
    Log.info(
      `Published event "${eventInstance.eventType}" with ID: ${addedEvent.id}.`
    );
  } catch (error) {
    Log.error(`Failed to publish event "${eventType}": ${error}`);
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
        EVENT_QUEUE
      )) as JEvent[];

      if (!events || events.length === 0) {
        Log.info('No events left in the queue. Pausing processing.');
        break;
      }

      for (const event of events) {
        Log.info(`Processing event "${event.eventType}" with ID: ${event.id}.`);

        for (const handlerName of eventHandlerManager.getHandlersForEventType(event.eventType)) {
          await processExecutionLifecycle(handlerName, event, "beforeExecution")
        }

        for (const user of users) {
          try {
            await processHandlers(event, user);
          } catch (error) {
            Log.error(
              `Error processing event "${event.eventType}" with ID: ${event.id} for user ${user.id}: ${error}`
            );
          }
        }

        for (const handler of eventHandlerManager.getHandlersForEventType(event.eventType)) {
          await processExecutionLifecycle(handler, event, "afterExecution")
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
  Log.dev('Setting up event queue listener.');
  if (clm.hasChangeListener(EVENT_QUEUE, CollectionChangeType.INSERT)) {
    Log.info('Event queue listener already set up. Skipping setup.');
    return;
  }

  clm.addChangeListener(EVENT_QUEUE, CollectionChangeType.INSERT, async () => {
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
const processHandlers = async (event: JEvent, user: JUser): Promise<void> => {
  for (const handlerName of eventHandlerManager.getHandlersForEventType(event.eventType)) {
    try {
      const task = getTaskByName(handlerName);
      if (task) {
        await executeTask(task, event, user);
        continue;
      }

      const decisionRule = getDecisionRuleByName(handlerName);
      if (decisionRule) {
        await executeDecisionRule(decisionRule, event, user);
        continue;
      }

      Log.warn(
        `Handler "${handlerName}" not found for event "${event.eventType}".`
      );
    } catch (error) {
      Log.error(
        `Error processing assignment "${handlerName}" for event "${event.eventType}" and user "${user.id}": ${error}`
      );
    }
  }
};

const processExecutionLifecycle = async (
  handlerName: string,
  event: JEvent,
  functionName: "beforeExecution" | "afterExecution"
): Promise<void> => {
  try {
    const task = getTaskByName(handlerName);
    if (task && typeof task[functionName] === "function") {
      await task[functionName](event);
      return;
    }

    const decisionRule = getDecisionRuleByName(handlerName);
    if (decisionRule && typeof decisionRule[functionName] === "function") {
      await decisionRule[functionName](event);
      return;
    }

    // Log warning if function is not found
    Log.warn(`"${functionName}" not found for handler "${handlerName}".`);
  } catch (error) {
    Log.error(
      `Error executing "${functionName}" for handler "${handlerName}" and event "${event.eventType}": ${error}`
    );
  }
};

/**
 * Archives a processed event by moving it from `EVENTS_QUEUE` to `ARCHIVED_EVENTS`.
 */
const archiveEvent = async (event: JEvent): Promise<void> => {
  try {
    Log.dev(`Archiving event of type "${event.eventType}" with ID: ${event.id}.`);
    await dataManager.addItemToCollection(ARCHIVED_EVENTS, event);
    if (event.id) {
      await dataManager.removeItemFromCollection(EVENT_QUEUE, event.id);
    } else {
      Log.error(`Event "${event}" has no ID. Skipping archiving.`);
    }
    Log.info(
      `Event of type "${event.eventType}" with ID: ${event.id} archived successfully.`
    );
  } catch (error) {
    Log.error(
      `Failed to archive event "${event.eventType}" with ID: ${event.id}: ${error}`
    );
    throw error;
  }
};

/**
 * Stops the event queue processing.
 */
export const stopEventQueueProcessing = (): void => {
  shouldProcessQueue = false;
  clm.removeChangeListener(EVENT_QUEUE, CollectionChangeType.INSERT);
  Log.info('Event queue processing stopped.');
};

/**
 * Starts the event queue processing.
 */
export const startEventQueueProcessing = (): void => {
  setupEventQueueListener();
  shouldProcessQueue = true;
  Log.info('Event queue processing started.');
};

/**
 * Returns true if the event queue is running.
 */
export function isRunning(): boolean {
  return shouldProcessQueue;
}

/**
 * Returns true if the event queue is empty.
 */
export async function queueIsEmpty(): Promise<boolean> {
  const events = await dataManager.getAllInCollection(EVENT_QUEUE);
  return !events || events.length === 0;
}
