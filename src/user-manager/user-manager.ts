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
  await dm.init();
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
 * Modify the uniqueIdentifier of a user
 * @param {string} id - the user id.
 * @param {string} userUniqueIdentifierValueNew - the new uniqueIdentifier value.
 * @returns {Promise<object | null>} Resolves with the updated item or `null` on error.
 */
const modifyUserUniqueIdentifier = async (
  id: string,
  userUniqueIdentifierValueNew: string
): Promise<JUser | null> => {

  if (!id || !userUniqueIdentifierValueNew) {
    const msg = `Invalid parameters: id (${id}) and userUniqueIdentifierValueNew (${userUniqueIdentifierValueNew}) are required.`;
    Log.warn(msg);
    throw new Error(msg);
  }

  const updatedUser: JUser | null =
    (await dm.updateItemByIdInCollection(USERS, id, {
      uniqueIdentifier: userUniqueIdentifierValueNew,
    })) as JUser;
  return updatedUser;
};

/**
 * Update the properties of a user by uniqueIdentifier
 * @param {string} userUniqueIdentifier - the uniqueIdentifier value.
 * @param {object} updateData - the data to update.
 * @returns {Promise<JUser | null>} Resolves with the updated JUser or `null` on error.
 * @throws {Error} If trying to update the uniqueIdentifier field directly.
 * If the user with the given uniqueIdentifier does not exist.
 * If the update operation fails.
 */
const updateUserByUniqueIdentifier = async (
  userUniqueIdentifier: string,
  updateData: Record<string, any>
): Promise<JUser | null> => {

  if (!userUniqueIdentifier || typeof userUniqueIdentifier !== "string") {
    const msg = `Invalid uniqueIdentifier: ${userUniqueIdentifier}`;
    Log.warn(msg);
    throw new Error(msg);
  }

  if ("uniqueIdentifier" in updateData) {
    const msg = `Cannot update uniqueIdentifier field using updateUserByUniqueIdentifier. Use modifyUserUniqueIdentifier instead.`;
    throw new Error(msg);
  }

  if (!updateData || typeof updateData !== "object" || Object.keys(updateData).length === 0 || Array.isArray(updateData)) {
    const msg = `Invalid updateData: ${JSON.stringify(updateData)}. It must be a non-null and non-empty object and should not be an array.`;
    Log.warn(msg);
    throw new Error(msg);
  }

  const userList: JUser[] | null =
    await dm.findItemsInCollection<JUser>(
      USERS,
      {
        uniqueIdentifier: userUniqueIdentifier,
      }
    );

  if (!userList || userList.length === 0) {
    const msg = `User with uniqueIdentifier: ${userUniqueIdentifier} not found.`;
    throw new Error(msg);
  }

  // throw error if more than one user found with the same uniqueIdentifier
  if (userList.length > 1) {
    const msg = `Multiple users found with uniqueIdentifier: ${userUniqueIdentifier}. Please ensure uniqueIdentifier is unique.`;
    throw new Error(msg);
  }

  const theUser = userList[0];

  const {
    id,
    uniqueIdentifier: _,
    ...dataToUpdate
  } = updateData as { [key: string]: any };

  const updatedUser: JUser | null =
    (await dm.updateItemByIdInCollection(USERS, theUser.id, dataToUpdate)) as JUser;

  return updatedUser;
};

/**
 * Confirm that unique identifier is present for a user.
 * @param {object} user - the user object.
 * @returns {boolean, string} An object containing the result (true if uniqueIdentifier exists, false otherwise) and message.
 */
const doesUserUniqueIdentifierExist = (user: {
  [key: string]: any;
}): { result: boolean; message: string } => {

  if( typeof user !== "object" || user === null || Array.isArray(user) ) {
    const msg = `Invalid user data: ${JSON.stringify(user)}. It must be a non-null object and should not be an array.`;
    Log.warn(msg);
    return { result: false, message: msg };
  }

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
 * @returns {Promise<{ result: boolean; message: string }>} Resolves with an object containing the result and message.
 * If the unique identifier is new, it returns true; otherwise, it returns false.
 */

const isUserUniqueIdentifierNew = async (
  userUniqueIdentifier: string
): Promise<{ result: boolean; message: string }> => {
  if (
    !userUniqueIdentifier ||
    typeof userUniqueIdentifier !== "string" ||
    userUniqueIdentifier.trim() === ""
  ) {
    const msg = `Invalid unique identifier: ${userUniqueIdentifier}`;
    Log.warn(msg);
    return { result: false, message: msg };
  }

  const existingUsers =
    await dm.findItemsInCollection<JUser>(
      USERS,
      {
        uniqueIdentifier: userUniqueIdentifier,
      }
    );

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
 * @returns {Promise<(JUser | null)[]>} Resolves with the added users or null if the operation fails.
 * @throws {Error} If no users are provided or if any user fails validation.
 */
export const addUsersToDatabase = async (
  users: object[]
): Promise<(JUser | null)[]> => {
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error("No users provided for insertion.");
  }

  try {
    let newUsers: object[] = [];

    for (const user of users) {
      const userUniqueIdentifierExist =
        await doesUserUniqueIdentifierExist(user);
      const userWithId = user as {
        uniqueIdentifier: string;
        [key: string]: any;
      };
      const userDataCheck = await isUserUniqueIdentifierNew(
        userWithId["uniqueIdentifier"]
      );
      if (!userUniqueIdentifierExist["result"] || !userDataCheck["result"]) {
        Log.warn(
          `${userDataCheck["message"]} - User: ${JSON.stringify(userWithId)}`
        );
      } else {
        newUsers.push(user);
      }
    }

    let addedUsers: (JUser | null)[] = [];
    for (const user of newUsers) {
      const addedUser = (await dm.addItemToCollection(
        USERS,
        user
      )) as JUser;
      addedUsers.push(addedUser);
    }
    return addedUsers;
  } catch (error) {
    return handleDbError("Failed to add users:", error);
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
  const addedUser = (await dm.addItemToCollection(
    USERS,
    initialData
  )) as JUser;
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
  const userDocs =
    (await dm.getAllInCollection<JUser>(USERS)) || [];
  userDocs.forEach((user: any) => {
    const jUser: JUser = transformUserDocument(user);
    _users.set(jUser.id, jUser);
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
  const updatedUser =
    (await dm.updateItemByIdInCollection(
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

const stopUserManager = () => {
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
