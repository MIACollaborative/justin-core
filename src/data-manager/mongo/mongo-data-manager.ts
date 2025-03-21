import * as mongoDB from 'mongodb';
import { Readable } from 'stream';
import { CollectionChangeType } from '../data-manager.type';
import { NO_ID } from '../data-manager.constants';
import {
  DeletedDocRecord,
  InsertedOrUpatedDocRecord,
  WithId,
} from './mongo-data-manager.type';
import { Log } from '../../logger/logger-manager';
import { handleDbError } from '../data-manager.helpers';
import { toObjectId } from './mongo.helpers';

const DEFAULT_MONGO_URI =
  'mongodb://127.0.0.1:27017?retryWrites=true&w=majority';
const DEFAULT_DB_NAME = 'justin';

let _db: mongoDB.Db | undefined;
let _client: mongoDB.MongoClient | undefined;
let _isConnected = false;

/**
 * Initializes the MongoDB connection.
 * Establishes a connection to MongoDB using environment variables or default values.
 * @returns A Promise that resolves when the connection is established.
 * @throws Will throw an error if the connection fails.
 */
const init = async (): Promise<void> => {
  if (_isConnected) return;

  Log.info(`In mongo-data-manager.ts, MONGO_URI: ${process.env.MONGO_URI}`);
  const uri = process.env.MONGO_URI || DEFAULT_MONGO_URI;
  const dbName = process.env.DB_NAME || DEFAULT_DB_NAME;
  _client = new mongoDB.MongoClient(uri);

  try {
    await _client.connect();
    Log.info(`MongoDBManager connected to ${uri}`);
    Log.info(`MongoDBManager timeoutMS: ${_client.timeoutMS}`);
    _isConnected = true;
    _db = _client.db(dbName);
    Log.info(`MongoDBManager initialized with database ${dbName}`);
  } catch (error) {
    Log.error('Failed to connect to MongoDB', error);
    throw error;
  }
};

/**
 * Closes the MongoDB connection.
 * Ensures the MongoDB connection is initialized, then attempts to close it.
 * @returns A Promise that resolves when the connection is closed.
 * @throws Will throw an error if closing the connection fails.
 */
const close = async (): Promise<void> => {
  ensureInitialized();
  try {
    await _client!.close();
    _isConnected = false;
    Log.info('MongoDBManager connection closed');
  } catch (error) {
    handleDbError('Error closing MongoDBManager connection', error);
  }
};

/**
 * Ensures the MongoDB connection is initialized.
 * @throws Will throw an error if the MongoDB client is not initialized.
 */
const ensureInitialized = (): void => {
  if (!_client || !_isConnected || !_db) {
    const errorMessage = 'MongoDB client not initialized';
    Log.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Transforms a MongoDB document by replacing `_id` with `id`.
 * @param {any} doc - The document to transform.
 * @returns {object | null} The transformed document with `id` instead of `_id` or null if .
 */
const transformId = (doc: any): object | null => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id?.toString() || NO_ID };
};

/**
 * Creates a readable stream to monitor collection changes.
 * @param collectionName - The name of the collection to monitor.
 * @param changeType - The type of change to monitor (insert, update, or delete).
 * @returns A readable stream of collection changes.
 */
const getCollectionChangeReadable = (
  collectionName: string,
  changeType: CollectionChangeType
): Readable => {
  ensureInitialized();

  const filterList = [{ $match: { operationType: changeType } }];
  const options =
    changeType === CollectionChangeType.UPDATE
      ? { fullDocument: 'updateLookup' }
      : {};
  const changeStream = _db!
    .collection(collectionName)
    .watch(filterList, options);

  const collectionChangeReadable = new Readable({ objectMode: true });
  collectionChangeReadable._read = () => {};

  const handleStreamClose = () => {
    Log.info(`Change stream for ${collectionName} closed`);
    collectionChangeReadable.destroy();
  };

  const handleStreamError = (error: unknown) => {
    Log.error('Change stream error', error);
    collectionChangeReadable.emit('error', error);
    throw error;
  };

  const pushToStream = (
    nextDoc: DeletedDocRecord | InsertedOrUpatedDocRecord
  ) => {
    let normalizedDoc;

    if (changeType === CollectionChangeType.DELETE) {
      normalizedDoc = {
        id: (nextDoc as DeletedDocRecord).documentKey._id?.toString() || NO_ID,
      };
    } else {
      normalizedDoc = transformId(
        (nextDoc as InsertedOrUpatedDocRecord).fullDocument
      );
    }

    collectionChangeReadable.push(normalizedDoc);
  };

  changeStream.on('change', pushToStream);
  changeStream.on('close', handleStreamClose);
  changeStream.on('error', handleStreamError);

  collectionChangeReadable.on('close', () => changeStream.close());

  return collectionChangeReadable;
};

/**
 * Inserts an item into a specified collection.
 * @param collectionName - The name of the collection.
 * @param obj - The object to insert into the collection.
 * @returns A Promise resolving with the ID of the inserted item.
 */
const addItemToCollection = async (
  collectionName: string,
  obj: object
): Promise<string> => {
  ensureInitialized();
  const { id, _id, ...filteredObject } = obj as WithId;

  try {
    const result = await _db!
      .collection(collectionName)
      .insertOne(filteredObject);
    Log.info(`Item added to ${collectionName}`, {
      id: result.insertedId.toString(),
    });
    return result.insertedId.toString();
  } catch (error) {
    return handleDbError(`Failed to add item to ${collectionName}`, error);
  }
};


/**
 * Updates an item by ID in a specified collection and returns the updated item.
 * @param collectionName - The name of the collection.
 * @param id - The ID of the item to update.
 * @param updateObject - The fields to update in the item.
 * @returns A Promise resolving with the updated item object if the update succeeded, otherwise `null`.
 */
const updateItemInCollection = async (
  collectionName: string,
  id: string,
  updateObject: object
): Promise<object | null> => {
  ensureInitialized();
  const objectId = toObjectId(id);
  if (!objectId) return null;

  try {
    const { matchedCount, modifiedCount } = await _db!
      .collection(collectionName)
      .updateOne({ _id: objectId }, { $set: updateObject });

    if (matchedCount === 1 && modifiedCount === 1) {
      const updatedItem = await _db!
        .collection(collectionName)
        .findOne({ _id: objectId });
      Log.info(`Update succeeded for item with id ${id} in ${collectionName}`);
      return transformId(updatedItem);
    } else {
      Log.warn(`Update failed for item with id ${id} in ${collectionName}`);
      return null;
    }
  } catch (error) {
    return handleDbError(
      `Error updating item with id ${id} in ${collectionName}`,
      error
    );
  }
};

/**
 * Finds an item by ID in a specified collection.
 * @param collectionName - The name of the collection.
 * @param id - The ID of the item to find.
 * @returns A `Promise` resolving with the item if found, or `null` if not found.
 */
const findItemByIdInCollection = async (
  collectionName: string,
  id: string
): Promise<object | null> => {
  ensureInitialized();
  const objectId = toObjectId(id);
  if (!objectId) return null;

  try {
    const foundDoc = await _db!
      .collection(collectionName)
      .findOne({ _id: objectId });
    return transformId(foundDoc);
  } catch (error) {
    return handleDbError(
      `Error finding item with id ${id} in ${collectionName}`,
      error
    );
  }
};

/**
 * Retrieves all items from a specified collection.
 * @param collectionName - The name of the collection.
 * @returns A Promise resolving with an array of items in the collection.
 */
const getAllInCollection = async (
  collectionName: string
): Promise<object[]> => {
  ensureInitialized();
  try {
    const results = (
      await _db!.collection(collectionName).find({}).toArray()
    ).map(transformId);
    return results.filter((doc) => doc !== null);
  } catch (error) {
    return handleDbError(
      `Failed to retrieve items from ${collectionName}`,
      error
    );
  }
};

/**
 * Removes an item by ID from a specified collection.
 * @param collectionName - The name of the collection.
 * @param id - The ID of the item to remove.
 * @returns A `Promise` resolving with `true` if the item was removed, otherwise `false`.
 */
const removeItemFromCollection = async (
  collectionName: string,
  id: string
): Promise<boolean> => {
  ensureInitialized();
  const objectId = toObjectId(id);
  if (!objectId) return false;

  try {
    const { acknowledged } = await _db!
      .collection(collectionName)
      .deleteOne({ _id: objectId });
    return acknowledged;
  } catch (error) {
    return handleDbError(
      `Error removing item with id ${id} from ${collectionName}`,
      error
    );
  }
};

/**
 * Clears all items in a specified collection.
 * @param collectionName - The name of the collection.
 * @returns A `Promise` resolving when the collection is cleared.
 * @throws Will throw an error if the operation fails.
 */
const clearCollection = async (collectionName: string): Promise<void> => {
  ensureInitialized();
  try {
    await _db!.collection(collectionName).drop();
  } catch (error) {
    handleDbError(`Failed to clear collection: ${collectionName}`, error);
  }
};

/**
 * Checks if a specified collection is empty.
 * @param collectionName - The name of the collection.
 * @returns A `Promise` resolving with `true` if the collection is empty, otherwise `false`.
 */
const isCollectionEmpty = async (collectionName: string): Promise<boolean> => {
  ensureInitialized();
  try {
    const count = await _db!.collection(collectionName).countDocuments({});
    return count === 0;
  } catch (error) {
    return handleDbError(
      `Failed to check if collection is empty: ${collectionName}`,
      error
    );
  }
};

export const MongoDBManager = {
  init,
  close,
  getCollectionChangeReadable,
  findItemByIdInCollection,
  addItemToCollection,
  updateItemInCollection,
  getAllInCollection,
  removeItemFromCollection,
  clearCollection,
  isCollectionEmpty,
};
