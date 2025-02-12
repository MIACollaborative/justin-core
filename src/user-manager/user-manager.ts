import DataManager from '../data-manager/data-manager';
import { ChangeListenerManager } from '../data-manager/change-listener.manager';
import { USERS } from '../data-manager/data-manager.constants';
import { JUser } from './user.type';
import { CollectionChangeType } from '../data-manager/data-manager.type';
import { Log } from '../logger/logger-manager';

/**
 * @type {Map<string, JUser>} _users - In-memory cache for user data.
 * This Map enables quick lookups, insertions, and deletions by `id`.
 * @private
 */
export const _users: Map<string, JUser> = new Map();

const dm = DataManager.getInstance();
const clm = ChangeListenerManager.getInstance();

/**
 * Ensures that the DataManager has been initialized before any user
 * management operation can proceed.
 *
 * @throws Error if DataManager is not initialized.
 * @private
 */
export const _checkInitialization = (): void => {
  if (!dm.getInitializationStatus()) {
    throw new Error('UserManager has not been initialized');
  }
};

/**
 * Initializes the UserManager by initializing the DataManager,
 * loading users into the cache, and setting up listeners for
 * user-related database changes.
 *
 * @returns {Promise<void>} Resolves when initialization is complete.
 */
const init = async (): Promise<void> => {
  await dm.init();
  await loadUsers();
  setupChangeListeners();
};

/**
 * Transforms a document to use `id` instead of `_id`.
 * @param {any} doc - The raw document from the database.
 * @returns {any} The transformed document.
 */
const transformUserDocument = (doc: any): JUser => {
  const { _id, ...rest } = doc;
  return { id: _id?.toString(), ...rest } as JUser;
};

/**
 * Sets up change listeners for user-related database changes.
 * @private
 */
const setupChangeListeners = (): void => {
  clm.addChangeListener(USERS, CollectionChangeType.INSERT, (user: JUser) => {
    const transformedUser = transformUserDocument(user);
    _users.set(transformedUser.id, transformedUser);
  });

  clm.addChangeListener(USERS, CollectionChangeType.UPDATE, (user: JUser) => {
    const transformedUser = transformUserDocument(user);
    _users.set(transformedUser.id, transformedUser);
  });

  clm.addChangeListener(
    USERS,
    CollectionChangeType.DELETE,
    (userId: string) => {
      _users.delete(userId);
    }
  );
};

/**
 * Adds multiple users to the Users collection in a single operation.
 * @param {object[]} users - An array of user objects to add.
 * @returns {Promise<(object | null)[]>} Resolves with the added users or null if the operation fails.
 */
export const addUsersToDatabase = async (
  users: object[]
): Promise<(object | null)[]> => {
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('No users provided for insertion.');
  }
  try {
    const dataManager = dm;
    let addedUsers = [];
    for (const user of users) {
      const addedUser = await dm.addItemToCollection(USERS, user);
      addedUsers.push(addedUser);
    }
    return addedUsers;
  } catch (error) {
    Log.error('Failed to add users:', error);
    throw error;
  }
};

/**
 * Creates a new user with optional initial data.
 * Saves to both the database and the in-memory cache.
 *
 * @param {object} initialData - Initial user data.
 * @returns {Promise<JUser>} Resolves to the created user.
 */
const createUser = async (initialData: object = {}): Promise<JUser> => {
  _checkInitialization();
  const addedUser = (await dm.addItemToCollection(USERS, initialData)) as JUser;
  if (!addedUser) {
    throw new Error('Failed to create user: result is null');
  }
  _users.set(addedUser.id, addedUser);
  return addedUser;
};

/**
 * Deletes a user by ID from both the database and the in-memory cache.
 *
 * @param {string} userId - The user's ID.
 * @returns {Promise<void>} Resolves when deletion is complete.
 */
const deleteUser = async (userId: string): Promise<void> => {
  _checkInitialization();
  await dm.removeItemFromCollection(USERS, userId);
  _users.delete(userId);
};

/**
 * Loads all users from the database into the in-memory cache.
 *
 * @returns {Promise<void>} Resolves when users are loaded into the cache.
 */
const loadUsers = async (): Promise<void> => {
  _checkInitialization();
  _users.clear();
  const userDocs = (await dm.getAllInCollection<JUser>(USERS)) || [];
  userDocs.forEach((user: any) => {
    const transformedUser = transformUserDocument(user);
    _users.set(transformedUser.id, transformedUser);
  });
};

/**
 * Retrieves all cached users.
 *
 * @returns {JUser[]} An array of all cached users.
 */
const getAllUsers = (): JUser[] => {
  _checkInitialization();
  return Array.from(_users.values());
};

/**
 * Retrieves a user from the cache by ID.
 *
 * @param {string} userId - The user's ID.
 * @returns {JUser | null} The user if found, otherwise `null`.
 */
const getUser = (userId: string): JUser | null => {
  _checkInitialization();
  return _users.get(userId) || null;
};

/**
 * Updates a user's data in both the database and the in-memory cache.
 *
 * @param {string} userId - The user's ID.
 * @param {object} updatedData - New data to update.
 * @returns {Promise<JUser>} Resolves to the updated user.
 */
const updateUser = async (
  userId: string,
  updatedData: object
): Promise<JUser> => {
  _checkInitialization();
  const updatedUser = (await dm.updateItemInCollectionById(
    USERS,
    userId,
    updatedData
  )) as JUser;
  if (!updatedUser) {
    throw new Error(`Failed to update user: ${userId}`);
  }
  _users.set(updatedUser.id, updatedUser);
  return updatedUser;
};

/**
 * Deletes all users from the database and clears the in-memory cache.
 *
 * @returns {Promise<void>} Resolves when all users are deleted.
 */
const deleteAllUsers = async (): Promise<void> => {
  _checkInitialization();
  await dm.clearCollection(USERS);
  _users.clear();
};

const stopUserManager = () =>{
  clm.removeChangeListener(USERS, CollectionChangeType.INSERT);
  clm.removeChangeListener(USERS, CollectionChangeType.UPDATE);
  clm.removeChangeListener(USERS, CollectionChangeType.DELETE);
}

/**
 * UserManager provides methods for managing users.
 *
 * Includes user creation, deletion, retrieval, and updates.
 * @namespace UserManager
 */
export const UserManager = {
  init,
  createUser,
  addUsersToDatabase,
  deleteUser,
  loadUsers,
  getAllUsers,
  getUser,
  updateUser,
  deleteAllUsers,
  stopUserManager
};

/**
 * TestingUserManager provides additional utilities for testing.
 *
 * @namespace TestingUserManager
 * @private
 */
export const TestingUserManager = {
  ...UserManager,
  _checkInitialization,
  _users, // Exposes the in-memory cache for testing purposes
};
