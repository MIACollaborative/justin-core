import DataManager from "../data-manager/data-manager";
import { ChangeListenerManager } from "../data-manager/change-listener.manager";
import { USERS } from "../data-manager/data-manager.constants";
import { JUser } from "./user.type";
import { handleDbError } from "../data-manager/data-manager.helpers";
import { CollectionChangeType } from "../data-manager/data-manager.type";
import { Log } from "../logger/logger-manager";

/**
 * @type {Map<string, JUser>} _users - In-memory cache for user data.
 * This Map enables quick lookups, insertions, and deletions by `id`.
 * @private
 */
export const _users: Map<string, JUser> = new Map();

/**
 * Ensures that the DataManager has been initialized before any user
 * management operation can proceed.
 *
 * @throws Error if DataManager is not initialized.
 * @private
 */
export const _checkInitialization = (): void => {
  if (!DataManager.getInstance().getInitializationStatus()) {
    throw new Error("UserManager has not been initialized");
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
  Log.info("Entering UserManager.init, about to init dm");
  await DataManager.getInstance().init();
  Log.info("In UserManager.init, after dm.init");
  await loadUsers();
  Log.info("In UserManager.init, after loadUsers");
  setupChangeListeners();
  Log.info("In UserManager.init, after setupChangeListeners");
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
  ChangeListenerManager.getInstance().addChangeListener(USERS, CollectionChangeType.INSERT, (user: JUser) => {
    const transformedUser = transformUserDocument(user);
    _users.set(transformedUser.id, transformedUser);
  });

  ChangeListenerManager.getInstance().addChangeListener(USERS, CollectionChangeType.UPDATE, (user: JUser) => {
    const transformedUser = transformUserDocument(user);
    _users.set(transformedUser.id, transformedUser);
  });

  ChangeListenerManager.getInstance().addChangeListener(
    USERS,
    CollectionChangeType.DELETE,
    (userId: string) => {
      _users.delete(userId);
    }
  );
};

/**
 * Modify the uniqueIdentifier of a user
 * @param {string} id - the user id.
 * @param {string} userUniqueIdentifierValueNew - the new uniqueIdentifier value.
 * @returns {Promise<object | null>} Resolves with the updated item or `null` on error.
 */
const modifyUserUniqueIdentifier = async (
  id: string,
  userUniqueIdentifierValueNew: string
): Promise<JUser | null> => {
  const updatedUser: JUser | null = await DataManager.getInstance().updateItemInCollectionById(USERS, id, {
    uniqueIdentifier: userUniqueIdentifierValueNew,
  }) as JUser;
  return updatedUser;
};

/**
 * Update the properties of a user by uniqueIdentifier
 * @param {string} userUniqueIdentifier - the uniqueIdentifier value.
 * @param {object} updateData - the data to update.
 * @returns {Promise<JUser | null>} Resolves with the updated item or `null` on error.
 */
const updateUserByUniqueIdentifier = async (
  userUniqueIdentifier: string,
  updateData: object
): Promise<JUser | null> => {

  if( "uniqueIdentifier" in updateData ) {
    const msg = `Cannot update uniqueIdentifier field using updateUserByUniqueIdentifier. Use modifyUserUniqueIdentifier instead.`;
    Log.warn(msg);
    return null;
  }
  
  const userList: JUser[] | null = await DataManager.getInstance().findItemsInCollectionByCriteria<JUser>(USERS, {
    uniqueIdentifier: userUniqueIdentifier,
  });

  if (!userList || userList.length === 0) {
    const msg = `User with uniqueIdentifier: ${userUniqueIdentifier} not found.`;
    Log.warn(msg);
    return null;
  }

  const {
    id,
    uniqueIdentifier: _,
    ...dataToUpdate
  } = updateData as { [key: string]: any };

  const updatedUser: JUser | null = await DataManager.getInstance().updateItemInCollectionByUniquePropertyValue(
    USERS,
    "uniqueIdentifier",
    userUniqueIdentifier,
    dataToUpdate
  ) as JUser;

  return updatedUser;
};

/**
 * Confirm that unique identifier is present
 * @param {object} user - the user object.
 * @returns {boolean} Return true if the unique identifier exists, false otherwise.
 */
const doesUserUniqueIdentifierExist = (user: {
  [key: string]: any;
}): { result: boolean; message: string } => {
  if (!user || !("uniqueIdentifier" in user) || !user["uniqueIdentifier"]) {
    const msg = `User data is incomplete: uniqueIdentifier is required.`;
    Log.warn(msg);
    return { result: false, message: msg };
  }
  return { result: true, message: "User unique identifier exists." };
};

/**
 * Check for unique identifier duplication.
 * @param {string} userUniqueIdentifier - the unique identifier.
 * @returns {boolean} Return true if the unique identifier is new, false otherwise.
 */
const isUserUniqueIdentifierNew = async (
  userUniqueIdentifier: string
): Promise<{ result: boolean; message: string }> => {
  if (!userUniqueIdentifier || typeof userUniqueIdentifier !== "string" || userUniqueIdentifier.trim() === "") {
    const msg = `Invalid unique identifier: ${userUniqueIdentifier}`;
    Log.warn(msg);
    return { result: false, message: msg };
  }

  const existingUsers = await DataManager.getInstance().findItemsInCollectionByCriteria<JUser>(USERS, {
    uniqueIdentifier: userUniqueIdentifier,
  });

  if (existingUsers && existingUsers.length > 0) {
    const msg = `User with unique identifier (${userUniqueIdentifier}) already exists.`;
    Log.warn(msg);
    return { result: false, message: msg };
  }
  return { result: true, message: `User's unique identifier is valid.` };
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
    throw new Error("No users provided for insertion.");
  }

  for (const user of users) {
    const userUniqueIdentifierExist = await doesUserUniqueIdentifierExist(user);
    const userWithId = user as { uniqueIdentifier: string, [key: string]: any };
    const userDataCheck = await isUserUniqueIdentifierNew(
      userWithId["uniqueIdentifier"]
    );
    if (!userUniqueIdentifierExist || !userDataCheck["result"]) {
      throw new Error(`${userDataCheck["message"]} - Add users failed.`);
    }
  }

  try {
    let addedUsers: (JUser | null)[] = [];
    for (const user of users) {
      const addedUser = await DataManager.getInstance().addItemToCollection(USERS, user) as JUser;
      addedUsers.push(addedUser);
    }
    return addedUsers;
  } catch (error) {
    return handleDbError(
      "Failed to add users:",
      error
    );
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
  const addedUser = (await DataManager.getInstance().addItemToCollection(USERS, initialData)) as JUser;
  if (!addedUser) {
    throw new Error("Failed to create user: result is null");
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
  await DataManager.getInstance().removeItemFromCollection(USERS, userId);
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
  const userDocs = (await DataManager.getInstance().getAllInCollection<JUser>(USERS)) || [];
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
  const updatedUser = (await DataManager.getInstance().updateItemInCollectionById(
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
  await DataManager.getInstance().clearCollection(USERS);
  _users.clear();
};

const stopUserManager = () => {
  ChangeListenerManager.getInstance().removeChangeListener(USERS, CollectionChangeType.INSERT);
  ChangeListenerManager.getInstance().removeChangeListener(USERS, CollectionChangeType.UPDATE);
  ChangeListenerManager.getInstance().removeChangeListener(USERS, CollectionChangeType.DELETE);
};

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
  modifyUserUniqueIdentifier,
  updateUserByUniqueIdentifier,
  doesUserUniqueIdentifierExist,
  isUserUniqueIdentifierNew,
  getAllUsers,
  getUser,
  updateUser,
  deleteAllUsers,
  stopUserManager,
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
