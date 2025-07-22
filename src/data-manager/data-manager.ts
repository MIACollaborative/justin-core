import { MongoDBManager } from './mongo/mongo-data-manager';
import { EventEmitter } from 'events';
import { ChangeListenerManager } from './change-listener.manager';
import { CollectionChangeType } from './data-manager.type';
import { DBType } from './data-manager.constants';
import { handleDbError } from './data-manager.helpers';
import { Readable } from 'stream';
import { Log } from '../logger/logger-manager';
import { USERS } from './data-manager.constants';

/**
 * Manages database operations and collection change listeners.
 */
class DataManager extends EventEmitter {
  protected static instance: DataManager | null = null;
  private db = MongoDBManager;
  private changeListenerManager = ChangeListenerManager.getInstance();
  private isInitialized = false;
  private initializedAt: Date | null = null;

  private constructor() {
    super();
    this.isInitialized = false;
    this.initializedAt = new Date();
  }

  /**
   * Retrieves the singleton instance of DataManager.
   * @returns {DataManager} The singleton instance.
   */
  public static getInstance(): DataManager {
    Log.dev('Entering DM.getInstance, instance:', DataManager.instance ? DataManager.instance.initializedAt : 'not initialized');
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
      Log.dev('In DM.getInstance, new DataManager instance created at:', DataManager.instance.initializedAt);
    }
    return DataManager.instance;
  }

  /**
   * Deletes the singleton instance of DataManager.
   */
  protected static killInstance(): void {
    if (DataManager.instance) {
      DataManager.instance = null;
    }
  }

  /**
   * Initializes the DataManager with the specified database type.
   * Sets up listeners for collection changes.
   * @param {DBType} dbType - The type of database to initialize. Defaults to MongoDB.
   * @returns {Promise<void>} Resolves when initialization is complete.
   */
  public async init(dbType: DBType = DBType.MONGO): Promise<void> {
    Log.dev('Entering DM.init, isInitialized:', this.isInitialized);
    try {
      if (this.isInitialized && dbType === DBType.MONGO) return;
      if (dbType !== DBType.MONGO) {
        throw new Error('MongoDB is the only supported DB type');
      }
      await this.db.init();
      this.isInitialized = true;
      // TODO: figure out why we're doing this here
      this.changeListenerManager.addChangeListener(
        'EVENTS_QUEUE',
        CollectionChangeType.INSERT,
        this.handleEventsQueueInsert.bind(this)
      );
      Log.info('DataManager initialized successfully');
    } catch (error) {
      handleDbError('Failed to initialize DataManager', error);
    }
  }

  /**
   * Handles `insert` changes in the EVENTS_QUEUE collection.
   * Emits an `eventAdded` signal to notify external systems.
   * @param {any} data - Data from the change stream.
   * @private
   */
  private async handleEventsQueueInsert(data: any): Promise<void> {
    this.emit('eventAdded', data);
  }

  /**
   * Checks if DataManager is initialized.
   * @returns {boolean} Initialization status.
   */
  public getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * Closes the DataManager and removes all listeners.
   * @returns {Promise<void>} Resolves when closed.
   */
  public async close(): Promise<void> {
    Log.dev('Initiating DataManager.close');
    try {
      this.checkInitialization();
      this.changeListenerManager.clearChangeListeners();
      await this.db.close();
      this.isInitialized = false;
      Log.dev('DataManager closed and uninitialized');
    } catch (error) {
      handleDbError('Failed to close DataManager', error);
    }
  }

  public checkInitialization(): void {
    if (!this.isInitialized) {
      throw new Error('DataManager has not been initialized');
    }
  }

  /**
   * Adds an item to a specified collection, ensuring the collection exists.
   * Emits a specific event (e.g., `userAdded`) if applicable to the collection.
   * @param {string} collectionName - The name of the collection to which the item will be added.
   * @param {object} item - The item to add to the collection.
   * @returns {Promise<object | null>} Resolves with the added item, or `null` if an error occurs.
   */
  public async addItemToCollection(
    collectionName: string,
    item: object
  ): Promise<object | null> {
    try {
      this.checkInitialization();
      const id = await this.db.addItemToCollection(collectionName, item);
      const newItem = { id, ...item };

      if (collectionName === USERS) {
        this.emit('userAdded', newItem);
      } else if (collectionName === 'EVENTS_QUEUE') {
        this.emit('eventAdded', newItem);
      }

      return newItem;
    } catch (error) {
      return handleDbError(
        `Failed to add item to collection: ${collectionName}`,
        error
      );
    }
  }

  /**
   * Updates an item in a collection by ID and emits an event.
   * @param {string} collectionName - The name of the collection.
   * @param {string} id - The ID of the item to update.
   * @param {object} updateObject - The update data.
   * @returns {Promise<object | null>} Resolves with the updated item or `null` on error.
   */
  public async updateItemInCollectionById(
    collectionName: string,
    id: string,
    updateObject: object
  ): Promise<object | null> {
    try {
      this.checkInitialization();
      const updatedItem = await this.db.updateItemInCollection(
        collectionName,
        id,
        updateObject
      );

      if (collectionName === USERS) {
        this.emit('userUpdated', { id, ...updateObject });
      }
      return updatedItem;
    } catch (error) {
      return handleDbError(
        `Failed to update item in collection: ${collectionName}`,
        error
      );
    }
  }

  /**
   * Removes an item from a collection by ID and emits an event.
   * @param {string} collectionName - The name of the collection.
   * @param {string} id - The ID of the item to remove.
   * @returns {Promise<boolean>} Resolves with `true` if removed, `false` on error.
   */
  public async removeItemFromCollection(
    collectionName: string,
    id: string
  ): Promise<boolean> {
    try {
      this.checkInitialization();
      const result = await this.db.removeItemFromCollection(collectionName, id);

      if (result && collectionName === USERS) {
        this.emit('userDeleted', id);
      }
      return result;
    } catch (error) {
      return (
        handleDbError(
          `Failed to remove item from collection: ${collectionName}`,
          error
        ) ?? false
      );
    }
  }

  /**
   * Retrieves all items from a collection.
   * @param {string} collectionName - The name of the collection.
   * @returns {Promise<T[] | null>} Resolves with items or `null` on error.
   */
  public async getAllInCollection<T>(
    collectionName: string
  ): Promise<T[] | null> {
    try {
      this.checkInitialization();
      return this.db.getAllInCollection(collectionName) as Promise<T[] | null>;
    } catch (error) {
      return handleDbError(
        `Failed to retrieve items from collection: ${collectionName}`,
        error
      );
    }
  }

  /**
   * Clears all items in a collection.
   * @param {string} collectionName - The name of the collection.
   * @returns {Promise<void>} Resolves when the collection is cleared.
   */
  public async clearCollection(collectionName: string): Promise<void> {
    try {
      this.checkInitialization();
      await this.db.clearCollection(collectionName);
    } catch (error) {
      handleDbError(`Failed to clear collection: ${collectionName}`, error);
    }
  }

  /**
   * Checks if a collection is empty.
   * @param {string} collectionName - The name of the collection.
   * @returns {Promise<boolean>} Resolves with `true` if empty, `false` on error.
   */
  public async isCollectionEmpty(collectionName: string): Promise<boolean> {
    try {
      this.checkInitialization();
      return await this.db.isCollectionEmpty(collectionName);
    } catch (error) {
      return (
        handleDbError(
          `Failed to check if collection is empty: ${collectionName}`,
          error
        ) ?? false
      );
    }
  }

  /**
   * Finds an item by ID in a specified collection.
   * @template T - The expected type of the item in the collection.
   * @param {string} collectionName - The name of the collection.
   * @param {string} id - The ID of the item to find.
   * @returns {Promise<T | null>} Resolves with the found item of type `T` or `null` if not found or on error.
   */
  public async findItemInCollectionById<T>(
    collectionName: string,
    id: string
  ): Promise<T | null> {
    try {
      this.checkInitialization();
      const item = await this.db.findItemByIdInCollection(collectionName, id);
      return item as T | null;
    } catch (error) {
      return handleDbError(
        `Failed to find item by ID in collection: ${collectionName}`,
        error
      ) as null;
    }
  }

  /**
   * Provides a change stream for a specific collection and change type.
   * This method is used by the ChangeListenerManager to abstract away database-specific logic.
   * @param {string} collectionName - The name of the collection to monitor.
   * @param {CollectionChangeType} changeType - The type of change to monitor.
   * @returns {Readable} A readable stream of change events.
   */
  public getChangeStream(
    collectionName: string,
    changeType: CollectionChangeType
  ): Readable {
    this.checkInitialization();
    return this.db.getCollectionChangeReadable(collectionName, changeType);
  }
}

export default DataManager;
