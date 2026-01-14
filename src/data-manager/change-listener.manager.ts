import { EventEmitter } from 'events';
import { CollectionChangeType } from '../data-manager/data-manager.type';
import DataManager from '../data-manager/data-manager';
import { Readable } from 'stream';
import { createLogger } from '../logger/logger';

const Log = createLogger({
  context: {
    source: 'change-listener-manager',
  },
});

/**
 * Manages change listeners for database collections.
 *
 * The `ChangeListenerManager` allows registering, removing, and managing
 * listeners for changes in database collections. It works with the DataManager
 * to ensure a database-agnostic implementation.
 */
class ChangeListenerManager extends EventEmitter {
  private static instance: ChangeListenerManager | undefined = undefined;
  private changeListeners: Map<
    string,
    {
      stream: Readable;
      collectionName: string;
      changeType: CollectionChangeType;
      cleanup: () => void;
    }
  > = new Map();

  private constructor() {
    super();
  }

  /**
   * Retrieves the singleton instance of `ChangeListenerManager`.
   * @returns {ChangeListenerManager} The singleton instance.
   */
  public static getInstance(): ChangeListenerManager {
    if (!ChangeListenerManager.instance) {
      ChangeListenerManager.instance = new ChangeListenerManager();
    }
    return ChangeListenerManager.instance;
  }

  protected static killInstance(): void {
    if (ChangeListenerManager.instance) {
      ChangeListenerManager.instance = undefined;
    }
  }

  /**
   * Registers a change listener for a specific collection and change type.
   *
   * This method interacts with the `DataManager` abstraction to fetch
   * change streams, ensuring no direct dependency on database-specific logic.
   *
   * @template T - The expected type of data emitted by the change stream.
   * @param {string} collectionName - The name of the collection to monitor.
   * @param {CollectionChangeType} changeType - The type of changes to listen for.
   * @param {(data: T) => void} callback - The function to execute on change events.
   */
  public addChangeListener<T = any>(
    collectionName: string,
    changeType: CollectionChangeType,
    callback: (data: T) => void,
  ): void {
    const key = `${collectionName}-${changeType}`;
    if (this.changeListeners.has(key)) {
      Log.warn(`Change listener for ${key} is already registered.`);
      return;
    }

    const stream = DataManager.getInstance().getChangeStream(collectionName, changeType);

    const listener = (data: T) => {
      callback(data);
      this.emit(`${collectionName}-${changeType}`, data);
    };

    const errorHandler = (error: Error) => {
      Log.error('Change stream error', error);
    };

    stream.on('data', listener);
    stream.on('error', errorHandler);

    this.changeListeners.set(key, {
      stream,
      collectionName,
      changeType,
      cleanup: () => {
        stream.removeListener('data', listener);
        stream.removeListener('error', errorHandler);
      },
    });

    Log.debug(`Change listener added for ${key}.`);
  }

  /**
   * Removes a change listener for a specific collection and change type.
   *
   * @param {string} collectionName - The name of the collection.
   * @param {CollectionChangeType} changeType - The type of changes to stop listening for.
   */
  public removeChangeListener(collectionName: string, changeType: CollectionChangeType): void {
    const key = `${collectionName}-${changeType}`;

    if (!this.changeListeners.has(key)) {
      Log.warn(`No change listener registered for ${key}.`);
      return;
    }

    const { stream, cleanup } = this.changeListeners.get(key)!;
    cleanup();
    stream.destroy();
    this.changeListeners.delete(key);

    Log.info(`Change listener removed for ${key}.`);
  }

  /**
   * Clears all registered change listeners.
   *
   * This method clears only the custom change listeners managed by
   * `ChangeListenerManager` and does not override the default `EventEmitter` behavior.
   */
  public clearChangeListeners(): void {
    for (const { stream, cleanup, collectionName, changeType } of this.changeListeners.values()) {
      cleanup();
      stream.destroy();
      Log.info(`Change listener for ${collectionName}:${changeType} removed.`);
    }
    this.changeListeners.clear();
    Log.info(`All custom change listeners removed.`);
  }

  /**
   * Checks if a change listener exists for a given collection and change type.
   *
   * @param {string} collectionName - The name of the collection.
   * @param {CollectionChangeType} changeType - The type of changes to check for.
   * @returns {boolean} True if the listener exists, false otherwise.
   */
  public hasChangeListener(collectionName: string, changeType: CollectionChangeType): boolean {
    return this.changeListeners.has(`${collectionName}-${changeType}`);
  }
}

export { ChangeListenerManager };
