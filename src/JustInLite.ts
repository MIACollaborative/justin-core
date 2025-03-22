import { JustIn, JustInWrapper } from './JustInWrapper';
import DataManager from './data-manager/data-manager';
import { ChangeListenerManager } from './data-manager/change-listener.manager';
import { Log } from './logger/logger-manager';
import { isRunning, queueIsEmpty } from './event/event-queue';
import { EVENTS_QUEUE, USERS } from './data-manager/data-manager.constants';

/**
 * JustinLite is a lightweight version of the core JustInWrapper singleton,
 * designed specifically for stateless environments like Google Cloud Functions or Cloud Run.
 *
 * It extends the core functionality with lifecycle controls such as singleton reset
 * and event engine queue waiting.
 */
class JustinLiteWrapper extends JustInWrapper {
  protected static instance: JustinLiteWrapper | null = null;

  /**
   * Private constructor ensures use through getInstance().
   */
  protected constructor() {
    super();
  }

  /**
   * Retrieves the singleton instance of JustinLite.
   * @returns {JustinLite} The singleton instance.
   */
  public static getInstance(): JustinLiteWrapper {
    if (!JustinLiteWrapper.instance) {
      JustinLiteWrapper.instance = new JustinLiteWrapper();
    }
    return JustinLiteWrapper.instance;
  }

  /**
   * Resets all singleton instances used by the framework.
   *
   * This should be called at the start of a stateless execution context,
   * such as in Google Cloud Functions or tests.
   */
  public static reset(): void {
    JustInWrapper['killInstance']?.();
    DataManager['killInstance']?.();
    ChangeListenerManager['killInstance']?.();
    JustinLiteWrapper.instance = null;
  }

  public async cleanseDB(): Promise<void> {
    await DataManager.getInstance().clearCollection(EVENTS_QUEUE);
    await DataManager.getInstance().clearCollection(USERS);
    Log.info('DB cleansed');
  }

  /**
   * Waits until the event engine queue is empty before proceeding.
   * Useful for ensuring all events are processed before shutdown in serverless environments.
   *
   * @param timeout - Maximum wait time in milliseconds (default: 10 seconds)
   * @throws Error if the queue is not empty within the timeout period
   */
  public async waitUntilQueueIsEmpty(timeout = 10000): Promise<void> {
    const start = Date.now();
    Log.info('Waiting for event queue to empty, is it empty?', await queueIsEmpty(), 'isRunning', isRunning());
    while (isRunning()) {
      if (await queueIsEmpty()) return;
      if (Date.now() - start > timeout) {
        throw new Error('Timeout while waiting for event queue to empty');
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
}

// export const JustInLite = JustinLiteWrapper.getInstance();

interface JustInLiteAPI {
  (): JustinLiteWrapper;
  reset(): void;
}

export const JustInLite: JustInLiteAPI = Object.assign(
  () => JustinLiteWrapper.getInstance(),
  {
    reset: () => {
      Log.info('Calling JustInLite.reset()');
      JustinLiteWrapper.reset();
    },
  }
);
