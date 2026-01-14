import { MongoDBManager } from './mongo/mongo-data-manager';
import { EventEmitter } from 'events';
import { ChangeListenerManager } from './change-listener.manager';
import { CollectionChangeType } from './data-manager.type';
import { DBType, USERS } from './data-manager.constants';
import { handleDbError } from './data-manager.helpers';
import { Readable } from 'stream';
import { createLogger } from '../logger/logger';

const Log = createLogger({
  context: {
    source: 'data-manager',
  },
});
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
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
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
   * @param {DBType} dbType - The type of database to initialize. Defaults to MongoDB.
   * @returns {Promise<void>} Resolves when initialization is complete.
   */
  public async init(dbType: DBType = DBType.MONGO): Promise<void> {
    try {
      if (this.getInitializationStatus() && dbType === DBType.MONGO) return;
      if (dbType !== DBType.MONGO) {
        throw new Error('MongoDB is the only supported DB type');
      }
      await this.db.init();
      this.isInitialized = true;
    } catch (error) {
      handleDbError('Failed to initialize DataManager', 'init', error);
    }
  }

  /**
   * Ensures a store exists and applies adapter-supported options (idempotent).
   * @param {string} storeName - The collection/table name.
   * @param {object} [options] - Optional storage options (adapter-specific).
   */
  public async ensureStore(storeName: string, options?: { validator?: unknown }): Promise<void> {
    this.checkInitialization();
    await this.db.ensureStore(storeName, options as any);
  }

  /**
   * Ensures indexes exist on a store (idempotent by name and key).
   * @param {string} storeName - The collection/table name.
   * @param {Array<{name?: string; key: unknown; unique?: boolean; partialFilterExpression?: unknown}>} indexes
   */
  public async ensureIndexes(
    storeName: string,
    indexes: Array<{
      name?: string;
      key: unknown;
      unique?: boolean;
      partialFilterExpression?: unknown;
    }>,
  ): Promise<void> {
    this.checkInitialization();
    await this.db.ensureIndexes(storeName, indexes as any);
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
    try {
      this.checkInitialization();
      this.changeListenerManager.clearChangeListeners();
      await this.db.close();
      this.isInitialized = false;
      Log.debug('DataManager closed and uninitialized');
    } catch (error) {
      handleDbError('Failed to close DataManager', 'close', error);
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
  public async addItemToCollection(collectionName: string, item: object): Promise<object | null> {
    try {
      this.checkInitialization();
      const id = await this.db.addItemToCollection(collectionName, item);
      const newItem = { id, ...item };

      if (collectionName === USERS) {
        this.emit('userAdded', newItem);
      }

      return newItem;
    } catch (error) {
      return handleDbError(
        `Failed to add item to collection: ${collectionName}`,
        'addItemToCollection',
        error,
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
  public async updateItemByIdInCollection(
    collectionName: string,
    id: string,
    updateObject: object,
  ): Promise<object | null> {
    try {
      this.checkInitialization();
      const updatedItem = await this.db.updateItemInCollection(collectionName, id, updateObject);

      if (collectionName === USERS) {
        this.emit('userUpdated', { id, ...updateObject });
      }
      return updatedItem;
    } catch (error) {
      return handleDbError(
        `Failed to update item in collection: ${collectionName}`,
        'updateItemByIdInCollection',
        error,
      );
    }
  }

  /**
   * Removes an item from a collection by ID and emits an event.
   * @param {string} collectionName - The name of the collection.
   * @param {string} id - The ID of the item to remove.
   * @returns {Promise<boolean>} Resolves with `true` if removed, `false` on error.
   */
  public async removeItemFromCollection(collectionName: string, id: string): Promise<boolean> {
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
          'removeItemFromCollection',
          error,
        ) ?? false
      );
    }
  }

  /**
   * Retrieves all items from a collection.
   * @param {string} collectionName - The name of the collection.
   * @returns {Promise<T[] | null>} Resolves with items or `null` on error.
   */
  public async getAllInCollection<T>(collectionName: string): Promise<T[] | null> {
    try {
      this.checkInitialization();
      return (await this.db.getAllInCollection(collectionName)) as T[] | null;
    } catch (error) {
      return handleDbError(
        `Failed to retrieve items from collection: ${collectionName}`,
        'getAllInCollection',
        error,
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
      handleDbError(`Failed to clear collection: ${collectionName}`, 'clearCollection', error);
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
          'isCollectionEmpty',
          error,
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
  public async findItemByIdInCollection<T>(collectionName: string, id: string): Promise<T | null> {
    try {
      this.checkInitialization();
      const item = await this.db.findItemByIdInCollection(collectionName, id);
      return item as T | null;
    } catch (error) {
      return handleDbError(
        `Failed to find item by ID in collection: ${collectionName}`,
        'findItemByIdInCollection',
        error,
      ) as null;
    }
  }

  /**
   * Finds items by criteria in a specified collection.
   * @template T - The expected type of the item in the collection.
   * @param {string} collectionName - The name of the collection.
   * @param {object} criteria - An object containing the key-value pair to search for. An empty object will return all items.
   *                            If `null`, it will return `null`.
   * @returns {Promise<T[] | null>} Resolves with the found item of type `T` or `null` if not found or on error.
   */
  public async findItemsInCollection<T>(
    collectionName: string,
    criteria: Record<string, any>,
  ): Promise<T[] | null> {
    if (!criteria || !collectionName) {
      return null; // Return null if criteria is null
    }

    try {
      this.checkInitialization();
      const itemList = await this.db.findItemsInCollection(collectionName, criteria);
      return itemList as T[] | null;
    } catch (error) {
      return handleDbError(
        `Failed to find items by criteria: ${criteria} in collection: ${collectionName}`,
        'findItemsInCollection',
        error,
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
  public getChangeStream(collectionName: string, changeType: CollectionChangeType): Readable {
    this.checkInitialization();
    return this.db.getCollectionChangeReadable(collectionName, changeType);
  }
}

export default DataManager;
