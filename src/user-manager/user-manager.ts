import DataManager from "../data-manager/data-manager";
import { ChangeListenerManager } from "../data-manager/change-listener.manager";
import { USERS } from "../data-manager/data-manager.constants";
import { JUser } from "./user.type";
import { handleDbError } from "../data-manager/data-manager.helpers";
import { CollectionChangeType } from "../data-manager/data-manager.type";
import { Log } from "../logger/logger-manager";
import { NewUserRecord } from "./user.type";
/**
 * @type {Map<string, JUser>} _users - In-memory cache for user data.
 * This Map enables quick lookups, insertions, and deletions by `id`.
 * @private
 */
export const _users: Map<string, JUser> = new Map();

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
  await refreshCache();
  setupChangeListeners();
};


/**
 * Shuts down the UserManager by removing all change listeners
 *
 * @returns {void}
 */
const shutdown = () => {
  clm.removeChangeListener(
    USERS,
    CollectionChangeType.INSERT
  );
  clm.removeChangeListener(
    USERS,
    CollectionChangeType.UPDATE
  );
  clm.removeChangeListener(
    USERS,
    CollectionChangeType.DELETE
  );
};


/**
 * Loads all users from the database into the in-memory cache.
 *
 * @returns {Promise<void>} Resolves when users are loaded into the cache.
 */
const refreshCache = async (): Promise<void> => {
  _checkInitialization();
  _users.clear();
  const userDocs =
    (await dm.getAllInCollection<JUser>(USERS)) || [];
  userDocs.forEach((user: any) => {
    const jUser: JUser = transformUserDocument(user);
    _users.set(jUser.id, jUser);
  });
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
  clm.addChangeListener(
    USERS,
    CollectionChangeType.INSERT,
    (user: JUser) => {
      const jUser: JUser = transformUserDocument(user);
      _users.set(jUser.id, jUser);
    }
  );

  clm.addChangeListener(
    USERS,
    CollectionChangeType.UPDATE,
    (user: JUser) => {
      const jUser: JUser = transformUserDocument(user);
      _users.set(jUser.id, jUser);
    }
  );

  clm.addChangeListener(
    USERS,
    CollectionChangeType.DELETE,
    (userId: string) => {
      _users.delete(userId);
    }
  );
};

/**
 * Ensures that the DataManager has been initialized before any user
 * management operation can proceed.
 *
 * @throws Error if DataManager is not initialized.
 * @private
 */
export const _checkInitialization = (): void => {
  if (!dm.getInitializationStatus()) {
    throw new Error("UserManager has not been initialized");
  }
};




/**
 * Adds one user to the Users collection in a single operation.
 * @param {object} user - The user object to add.
 * @returns {Promise<JUser | null>} Resolves with the added user or null if the operation fails.
 * @throws {Error} If no user is provided or if the user fails validation.
 */
export const addUser = async (
  user: NewUserRecord
): Promise<(JUser | null)> => {
  _checkInitialization();

  if (!user || typeof user !== "object" || Array.isArray(user)) {
    const msg = `Invalid user data: ${JSON.stringify(user)}. It must be a non-null object and should not be an array.`;
    Log.warn(msg);
    return null;
  }

  if (!user.uniqueIdentifier) {
    const msg = `UniqueIdentifier is missing`;
    Log.warn(msg);
    return null;
  }

  const userDataCheck = await isIdentifierUnique(user["uniqueIdentifier"]);

  if (!userDataCheck) {
    Log.warn(
      `User's unique identifier is not unique: ${JSON.stringify(user)}`
    );
    return null;
  }

  try {
    const { uniqueIdentifier, initialAttributes } = user;
    const convertedUser: object = { uniqueIdentifier, attributes: initialAttributes };
    const addedUser = (await dm.addItemToCollection(
      USERS,
      convertedUser
    )) as JUser;
    _users.set(addedUser.id, addedUser);
    return addedUser;
  } catch (error) {
    return handleDbError("Failed to add users:", error);
  }
};



/**
 * Adds multiple users to the Users collection in a single operation.
 * @param {NewUserRecord[]} users - An array of user objects to add.
 * @returns {Promise<(JUser | null)[]>} Resolves with the added users or null if the operation fails.
 * @throws {Error} If no users are provided or if any user fails validation.
 */
export const addUsers = async (
  users: NewUserRecord[]
): Promise<(JUser | null)[]> => {

  if (!Array.isArray(users) || users.length === 0) {
    throw new Error("No users provided for insertion.");
  }

  try {
    let addedUsers: JUser[] = [];

    for (const user of users) {
      const addedUser = await addUser(user);
      if (addedUser) {
        addedUsers.push(addedUser);
      }
    }
    return addedUsers;
  } catch (error) {
    return handleDbError("Failed to add users:", error);
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
  return Array.from(_users.values()).find(user => user.uniqueIdentifier === uniqueIdentifier) || null;
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
  attributesToUpdate: Record<string, any>
): Promise<JUser | null> => {

  if (!userUniqueIdentifier || typeof userUniqueIdentifier !== "string") {
    const msg = `Invalid uniqueIdentifier: ${userUniqueIdentifier}`;
    throw new Error(msg);
  }

  if ("uniqueIdentifier" in attributesToUpdate) {
    const msg = `Cannot update uniqueIdentifier field using updateUserByUniqueIdentifier. Use modifyUserUniqueIdentifier instead.`;
    throw new Error(msg);
  }

  if (!attributesToUpdate || typeof attributesToUpdate !== "object" || Object.keys(attributesToUpdate).length === 0 || Array.isArray(attributesToUpdate)) {
    const msg = `Invalid updateData: ${JSON.stringify(attributesToUpdate)}. It must be a non-null and non-empty object and should not be an array.`;
    throw new Error(msg);
  }

  const theUser: JUser = await getUserByUniqueIdentifier(userUniqueIdentifier) as JUser;

  if (!theUser) {
    const msg = `User with uniqueIdentifier (${userUniqueIdentifier}) not found.`;
    throw new Error(msg);
  }

  const {
    id,
    uniqueIdentifier,
    ...dataToUpdate
  } = attributesToUpdate as { [key: string]: any };

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
const updateUserById = async (
  userId: string,
  attributesToUpdate: object
): Promise<JUser> => {
  _checkInitialization();
  const updatedUser =
    (await dm.updateItemByIdInCollection(
      USERS,
      userId,
      attributesToUpdate
    )) as JUser;
  if (!updatedUser) {
    throw new Error(`Failed to update user: ${userId}`);
  }
  _users.set(updatedUser.id, updatedUser);
  return updatedUser;
};



/**
 * Deletes a user by ID from both the database and the in-memory cache.
 *
 * @param {string} userId - The user's ID.
 * @returns {Promise<void>} Resolves when deletion is complete.
 */
const deleteUserByUniqueIdentifier = async (uniqueIdentifier: string): Promise<void> => {
  const theUser: JUser = await getUserByUniqueIdentifier(uniqueIdentifier) as JUser;
  await deleteUserById(theUser.id);
  _users.delete(theUser.id);
};

/**
 * Deletes a user by ID from both the database and the in-memory cache.
 *
 * @param {string} userId - The user's ID.
 * @returns {Promise<void>} Resolves when deletion is complete.
 */
const deleteUserById = async (userId: string): Promise<void> => {
  _checkInitialization();
  await dm.removeItemFromCollection(USERS, userId);
  _users.delete(userId);
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

const isIdentifierUnique = async (
  userUniqueIdentifier: string
): Promise<boolean> => {

  if (
    !userUniqueIdentifier ||
    typeof userUniqueIdentifier !== "string" ||
    userUniqueIdentifier.trim() === ""
  ) {
    const msg = `Invalid unique identifier: ${userUniqueIdentifier}`;
    throw new Error(msg);
  }

  const existingUser: JUser | null = await getUserByUniqueIdentifier(userUniqueIdentifier) as JUser;

  if (existingUser) {
    const msg = `User with unique identifier (${userUniqueIdentifier}) already exists.`;
    Log.warn(msg);
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
  deleteUserById,
  updateUserByUniqueIdentifier,
  getAllUsers,
  getUserByUniqueIdentifier,
  updateUserById,
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
  /*
  init: UserManager.init,
  addUser: UserManager.addUser,
  addUsers: UserManager.addUsers,
  deleteUserById: UserManager.deleteUserById,
  updateUserByUniqueIdentifier: UserManager.updateUserByUniqueIdentifier,
  getAllUsers: UserManager.getAllUsers,
  getUserByUniqueIdentifier: UserManager.getUserByUniqueIdentifier,
  updateUserById: UserManager.updateUserById,
  deleteUserByUniqueIdentifier: UserManager.deleteUserByUniqueIdentifier,
  deleteAllUsers: UserManager.deleteAllUsers,
  shutdown: UserManager.shutdown,
  */
  ...UserManager,
  transformUserDocument,
  _checkInitialization,
  refreshCache,
  isIdentifierUnique,
  setupChangeListeners,
  _users, // Exposes the in-memory cache for testing purposes
};