import DataManager from '../data-manager/data-manager';
import { ChangeListenerManager } from '../data-manager/change-listener.manager';
import { USERS } from '../data-manager/data-manager.constants';
import { JUser, NewUserRecord } from './user.type';
import { handleDbError } from '../data-manager/data-manager.helpers';
import { CollectionChangeType } from '../data-manager/data-manager.type';
import { createLogger } from '../logger/logger';

const Log = createLogger({
  context: {
    source: 'user-manager',
  },
});
/**
 * @type {Map<string, JUser>} _users - In-memory cache for user data.
 * This Map enables quick lookups, insertions, and deletions by `id`.
 * @private
 */
const _users: Map<string, JUser> = new Map();

const dm = DataManager.getInstance();
const clm = ChangeListenerManager.getInstance();

/**
 * Initializes the UserManager by initializing the DataManager,
 * loading users into the cache, and setting up listeners for
 * user-related database changes.
 *
 * @returns {Promise<void>} Resolves when initialization is complete.
 */
const init = async (): Promise<void> => {
  await dm.init();

  // ensure USERS exists and has a unique index on uniqueIdentifier (idempotent, DB-agnostic)
  await dm.ensureStore(USERS);
  await dm.ensureIndexes(USERS, [
    { name: 'uniq_user_identifier', key: { uniqueIdentifier: 1 }, unique: true },
  ]);

  await refreshCache();
  setupChangeListeners();
};

/**
 * Shuts down the UserManager by removing all change listeners
 *
 * @returns {void}
 */
const shutdown = () => {
  clm.removeChangeListener(USERS, CollectionChangeType.INSERT);
  clm.removeChangeListener(USERS, CollectionChangeType.UPDATE);
  clm.removeChangeListener(USERS, CollectionChangeType.DELETE);
};

/**
 * Loads all users from the database into the in-memory cache.
 *
 * @returns {Promise<void>} Resolves when users are loaded into the cache.
 */
const refreshCache = async (): Promise<void> => {
  _checkInitialization();
  _users.clear();
  const userDocs = (await dm.getAllInCollection<JUser>(USERS)) || [];
  userDocs.forEach((jUser: any) => {
    _users.set(jUser.id, jUser);
  });
};

/**
 * Sets up change listeners for user-related database changes.
 * @private
 */
const setupChangeListeners = (): void => {
  clm.addChangeListener(USERS, CollectionChangeType.INSERT, (jUser: JUser) => {
    _users.set(jUser.id, jUser);
  });

  clm.addChangeListener(USERS, CollectionChangeType.UPDATE, (jUser: JUser) => {
    _users.set(jUser.id, jUser);
  });

  clm.addChangeListener(USERS, CollectionChangeType.DELETE, (userId: string) => {
    _users.delete(userId);
  });
};

/**
 * Ensures that the DataManager has been initialized before any user
 * management operation can proceed.
 *
 * @throws Error if DataManager is not initialized.
 * @private
 */
const _checkInitialization = (): void => {
  if (!dm.getInitializationStatus()) {
    throw new Error('UserManager has not been initialized');
  }
};

/**
 * Adds one user to the Users collection in a single operation.
 * @param {object} user - The user object to add.
 * @returns {Promise<JUser | null>} Resolves with the added user or null if the operation fails.
 * @throws {Error} If no user is provided or if the user fails validation.
 */
const addUser = async (user: NewUserRecord): Promise<JUser | null> => {
  _checkInitialization();

  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    const msg = `Invalid user data: ${JSON.stringify(user)}. It must be a non-null object and should not be an array.`;
    Log.warn(msg);
    return null;
  }

  if (!user.uniqueIdentifier) {
    const msg = `UniqueIdentifier is missing`;
    Log.warn(msg);
    return null;
  }

  const userDataCheck = await isIdentifierUnique(user['uniqueIdentifier']);

  if (!userDataCheck) {
    Log.warn(
      `User's unique identifier already exists. Skipping insertion: ${user.uniqueIdentifier}. `,
    );
    return null;
  }

  try {
    const { uniqueIdentifier, initialAttributes } = user;
    const convertedUser: object = { uniqueIdentifier, attributes: initialAttributes };
    const addedUser = (await dm.addItemToCollection(USERS, convertedUser)) as JUser;
    _users.set(addedUser.id, addedUser);
    Log.info(`Added user: ${user.uniqueIdentifier}. `);
    return addedUser;
  } catch (error) {
    return handleDbError('Failed to add users:', 'addUser', error);
  }
};

/**
 * Adds multiple users to the Users collection in a single operation.
 * @param {NewUserRecord[]} users - An array of user objects to add.
 * @returns {Promise<(JUser | null)[]>} Resolves with the added users or null if the operation fails.
 * @throws {Error} If no users are provided or if any user fails validation.
 */
const addUsers = async (users: NewUserRecord[]): Promise<(JUser | null)[]> => {
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('No users provided for insertion.');
  }

  try {
    const addedUsers: JUser[] = [];

    for (const user of users) {
      const addedUser = await addUser(user);
      if (addedUser) {
        addedUsers.push(addedUser);
      }
    }
    if (addedUsers.length > 0) {
      Log.info(`${addedUsers.length} user(s) added successfully.`);
    } else {
      Log.info('No new users were added.');
    }
    return addedUsers;
  } catch (error) {
    return handleDbError('Failed to add users:', 'addUsers', error);
  }
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
 * Retrieves a user by their unique identifier from the cache.
 * @returns {JUser | null} The user with the specified unique identifier, or null if not found.
 */
const getUserByUniqueIdentifier = (uniqueIdentifier: string): JUser | null => {
  _checkInitialization();
  return (
    Array.from(_users.values()).find((user) => user.uniqueIdentifier === uniqueIdentifier) || null
  );
};

/**
 * Update the properties of a user by uniqueIdentifier
 * @param {string} userUniqueIdentifier - the uniqueIdentifier value.
 * @param {object} attributesToUpdate - the data to update.
 * @returns {Promise<JUser | null>} Resolves with the updated JUser or `null` on error.
 * @throws {Error} If trying to update the uniqueIdentifier field directly.
 * If the user with the given uniqueIdentifier does not exist.
 * If the update operation fails.
 */
const updateUserByUniqueIdentifier = async (
  userUniqueIdentifier: string,
  attributesToUpdate: Record<string, any>,
): Promise<JUser | null> => {
  if (!userUniqueIdentifier || typeof userUniqueIdentifier !== 'string') {
    const msg = `Invalid uniqueIdentifier: ${userUniqueIdentifier}`;
    throw new Error(msg);
  }

  if ('uniqueIdentifier' in attributesToUpdate) {
    const msg = `Cannot update uniqueIdentifier field using updateUserByUniqueIdentifier. Use modifyUserUniqueIdentifier instead.`;
    throw new Error(msg);
  }

  if (
    !attributesToUpdate ||
    typeof attributesToUpdate !== 'object' ||
    Object.keys(attributesToUpdate).length === 0 ||
    Array.isArray(attributesToUpdate)
  ) {
    const msg = `Invalid updateData: ${JSON.stringify(attributesToUpdate)}. It must be a non-null and non-empty object and should not be an array.`;
    throw new Error(msg);
  }

  const theUser: JUser = (await getUserByUniqueIdentifier(userUniqueIdentifier)) as JUser;

  if (!theUser) {
    const msg = `User with uniqueIdentifier (${userUniqueIdentifier}) not found.`;
    throw new Error(msg);
  }

  const { id, uniqueIdentifier, ...dataToUpdate } = attributesToUpdate as { [key: string]: any };

  const updatedUser: JUser | null = await updateUserById(theUser.id, dataToUpdate);

  return updatedUser;
};

/**
 * Updates a user's data in both the database and the in-memory cache.
 *
 * @param {string} userId - The user's ID.
 * @param {object} attributesToUpdate - New data to update.
 * @returns {Promise<JUser>} Resolves to the updated user.
 */
const updateUserById = async (userId: string, attributesToUpdate: object): Promise<JUser> => {
  _checkInitialization();

  const existingUser: JUser | null = _users.get(userId) as JUser;

  const mergedAttributes = { ...existingUser.attributes, ...attributesToUpdate };

  const updatedUser = (await dm.updateItemByIdInCollection(USERS, userId, {
    attributes: mergedAttributes,
  })) as JUser;
  if (!updatedUser) {
    throw new Error(`Failed to update user: ${userId}`);
  }
  _users.set(updatedUser.id, updatedUser);
  return updatedUser;
};

/**
 * Change a user's uniqueIdentifier to a new value.
 * @param {string} currentUniqueIdentifier - The user's current uniqueIdentifier.
 * @param {string} newUniqueIdentifier - The new uniqueIdentifier to set.
 * @returns {Promise<JUser>} Resolves with the updated JUser.
 */
const modifyUserUniqueIdentifier = async (
  currentUniqueIdentifier: string,
  newUniqueIdentifier: string,
): Promise<JUser> => {
  _checkInitialization();

  if (
    !newUniqueIdentifier ||
    typeof newUniqueIdentifier !== 'string' ||
    newUniqueIdentifier.trim() === ''
  ) {
    throw new Error('uniqueIdentifier must be a non-empty string.');
  }

  const theUser: JUser | null = getUserByUniqueIdentifier(currentUniqueIdentifier);

  if (!theUser) {
    throw new Error(`User with uniqueIdentifier (${currentUniqueIdentifier}) not found.`);
  }

  if (theUser.uniqueIdentifier === newUniqueIdentifier) {
    return theUser; // no-op
  }

  const updatedUser = (await dm.updateItemByIdInCollection(USERS, theUser.id, {
    uniqueIdentifier: newUniqueIdentifier,
  })) as JUser;

  if (!updatedUser) {
    throw new Error(`Failed to update uniqueIdentifier for user: ${theUser.id}`);
  }

  _users.set(updatedUser.id, updatedUser);
  return updatedUser;
};

/**
 * Deletes a user by ID from both the database and the in-memory cache.
 *
 * @param {string} userId - The user's ID.
 * @returns {Promise<boolean>} Resolves to true if deletion was successful, false otherwise.
 */
const deleteUserById = async (userId: string): Promise<boolean> => {
  _checkInitialization();
  const result = await dm.removeItemFromCollection(USERS, userId);
  if (result) _users.delete(userId);
  return result;
};

/**
 * Deletes a user by ID from both the database and the in-memory cache.
 *
 * @param {string} userId - The user's ID.
 * @returns {Promise<boolean>} Resolves to true if deletion was successful, false otherwise.
 */
const deleteUserByUniqueIdentifier = async (uniqueIdentifier: string): Promise<boolean> => {
  const theUser: JUser | null = await getUserByUniqueIdentifier(uniqueIdentifier);
  const userId = theUser?.id as any;
  const result = await deleteUserById(userId);
  if (result) _users.delete(userId);
  return result;
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

/**
 * Check for unique identifier duplication.
 * @param {string} userUniqueIdentifier - the unique identifier.
 * @returns {Promise<boolean>} Resolves with a boolean indicating if the identifier is unique.
 * If the unique identifier is new, it returns true; otherwise, it returns false.
 */

const isIdentifierUnique = async (userUniqueIdentifier: string): Promise<boolean> => {
  if (
    !userUniqueIdentifier ||
    typeof userUniqueIdentifier !== 'string' ||
    userUniqueIdentifier.trim() === ''
  ) {
    const msg = `Invalid unique identifier: ${userUniqueIdentifier}`;
    throw new Error(msg);
  }

  const existingUser: JUser | null = (await getUserByUniqueIdentifier(
    userUniqueIdentifier,
  )) as JUser;

  if (existingUser) {
    const msg = `User with unique identifier (${userUniqueIdentifier}) already exists.`;
    Log.debug(msg);
    return false;
  }

  return true;
};

/**
 * UserManager provides methods for managing users.
 *
 * Includes user creation, deletion, retrieval, and updates.
 * @namespace UserManager
 */
export const UserManager = {
  init,
  addUser,
  addUsers,
  getAllUsers,
  getUserByUniqueIdentifier,
  updateUserByUniqueIdentifier,
  modifyUserUniqueIdentifier,
  deleteUserByUniqueIdentifier,
  deleteAllUsers,
  shutdown,
};

/**
 * TestingUserManager provides additional utilities for testing.
 *
 * @namespace TestingUserManager
 * @private
 */
export const TestingUserManager = {
  ...UserManager,
  updateUserById,
  deleteUserById,
  _checkInitialization,
  refreshCache,
  isIdentifierUnique,
  setupChangeListeners,
  _users, // Exposes the in-memory cache for testing purposes
};
