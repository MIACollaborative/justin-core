import DataManager from '../data-manager/data-manager';
import { PROTECTED } from '../data-manager/data-manager.constants';
import { handleDbError } from '../data-manager/data-manager.helpers';
import { ProtectedAttributes, ProtectedAttributesDb } from './protected-manager.type';

const dm = DataManager.getInstance();

/**
 * Initializes the ProtectedManager by initializing the DataManager and creating indexes.
 *
 * @returns {Promise<void>} Resolves when initialization is complete.
 */
const init = async (): Promise<void> => {
  await dm.init();
  await dm.ensureStore(PROTECTED);
  await dm.ensureIndexes(PROTECTED, [
    {
      name: 'uniq_user_identifier_namespace',
      key: { uniqueIdentifier: 1, namespace: 1 },
      unique: true,
    },
  ]);
};

/**
 * Transforms a document to use `id` instead of `_id`.
 * @param {ProtectedAttributesDb} doc - The raw document from the database.
 * @returns {ProtectedAttributes} The transformed document.
 */
const transformProtectedDocument = (doc: ProtectedAttributesDb): ProtectedAttributes => {
  const { _id, ...rest } = doc;
  return { id: _id?.toString(), ...rest } as ProtectedAttributes;
};

/**
 * Ensures that the DataManager has been initialized before any
 * protected attributes management operation can proceed.
 *
 * @throws Error if DataManager is not initialized.
 * @private
 */
const _checkInitialization = (): void => {
  if (!dm.getInitializationStatus()) {
    throw new Error('ProtectedManager has not been initialized');
  }
};

/**
 * Retrieves the entire protected attributes record and converts it (_id to id) for a given unique identifier and namespace.
 *
 * @param {string} uniqueIdentifier - The unique identifier for the entity.
 * @param {string} namespace - The namespace under which the attributes are stored.
 * @returns {Promise<ProtectedAttributes | null>} A promise that resolves to a record, or null if not found.
 */
const _getProtectedAttributesObject = async (
  uniqueIdentifier: string,
  namespace: string
): Promise<ProtectedAttributes | null> => {
  _checkInitialization();
  try {
    const [doc] =
      (await dm.findItemsInCollection<ProtectedAttributesDb>(PROTECTED, { uniqueIdentifier, namespace })) ?? [];
    return doc ? transformProtectedDocument(doc) : null;
  } catch (error) {
    return handleDbError('Failed to get protected attributes object:', '_getProtectedAttributesObject', error);
  }
};

/**
 * Retrieves a list of protected attributes by names for a given unique identifier and namespace.
 *
 * @param {string} uniqueIdentifier - The unique identifier for the entity.
 * @param {string} namespace - The namespace under which the attributes are stored.
 * @param {string[]} names - An array of attribute names to retrieve.
 * @returns {Promise<Record<string, unknown> | null>} A promise that resolves to a record of attribute names and their values, or null if not found.
 * Non-existing attributes will have a value of undefined.
 */
const getProtectedAttributes = async (
  uniqueIdentifier: string,
  namespace: string,
  names: string[],
): Promise<Record<string, unknown> | null> => {
  _checkInitialization();
  try {
    const aObject = await _getProtectedAttributesObject(uniqueIdentifier, namespace);
    if (!aObject) return null;
    const { attributes } = aObject;
    return Object.fromEntries(
      names.map((key) => [key, 
        Object.prototype.hasOwnProperty.call(attributes, key) ? attributes[key] : undefined]),
    );
  } catch (error) {
    return handleDbError('Failed to get protected attributes:', 'getProtectedAttributes', error);
  }
};

/**
 * Creates protected attributes record with a given unique identifier and namespace.
 *
 * @param {string} uniqueIdentifier - The unique identifier for the entity.
 * @param {string} namespace - The namespace under which the attributes are stored.
 * @param {Record<string, unknown>} initialAttributes - The initial attributes to set on creation.
 * @returns {Promise<Record<string, unknown> | null>} A promise that resolves to the updated attributes or null if the operation failed.
 */
const createProtectedAttributes = async (
  uniqueIdentifier: string,
  namespace: string,
  initialAttributes: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
  _checkInitialization();
  try {
    const newItem = {
      uniqueIdentifier,
      namespace,
      attributes: { ...initialAttributes },
    };
    const newDoc = (await dm.addItemToCollection(
      PROTECTED,
      newItem,
    )) as unknown as ProtectedAttributes | null;
    return newDoc ? newDoc.attributes : null;
  } catch (error) {
    return handleDbError(
      'Failed to create protected attributes:',
      'createProtectedAttributes',
      error,
    );
  }
};

/**
 * Override protected attributes record with a given unique identifier and namespace.
 *
* @param {string} protectedAttributesId - The ID of the protected attributes record to override.
* @param {Record<string, unknown>} newAttributes - The new attributes to set (replaces all existing attributes).
 * @returns {Promise<Record<string, unknown> | null>} A promise that resolves to the attributes or null if the operation failed.
 */
const overrideProtectedAttributes = async (
  protectedAttributesId: string,
  newAttributes: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
  _checkInitialization();
  try {
    // TODO: confirm if data manager's methods support type generics to avoid the 'as' casting
    const updatedProtectedAttr: object | null = await dm.updateItemByIdInCollection(
      PROTECTED,
      protectedAttributesId,
      {
        attributes: newAttributes,
      },
    );

    if (!updatedProtectedAttr) return null;

    const { attributes } = updatedProtectedAttr as { attributes: Record<string, unknown> };
    return attributes;
  } catch (error) {
    return handleDbError('Failed to update protected attributes:', 'updateProtectedAttributes', error);
  }
};

/**
 * Sets protected attributes for a given unique identifier and namespace.
 *
 * @param {string} uniqueIdentifier - The unique identifier for the entity.
 * @param {string} namespace - The namespace under which the attributes are stored.
 * @param {Record<string, unknown>} attributesUpdate - The attributes to update.
* @returns {Promise<Record<string, unknown> | null>} A promise that resolves to the updated attributes (not the full set) or null if the operation failed.
 */
const setProtectedAttributes = async (
  uniqueIdentifier: string,
  namespace: string,
  attributesUpdate: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
  _checkInitialization();
  try {
    const aObject = await _getProtectedAttributesObject(uniqueIdentifier, namespace);
    if (!aObject) return await createProtectedAttributes(uniqueIdentifier, namespace, attributesUpdate);
    const mergedAttributes = { ...aObject.attributes, ...attributesUpdate };
    const result = await overrideProtectedAttributes(aObject.id, mergedAttributes);
    // filter the result yb only the updated attributes
    const updatedAttributes = Object.fromEntries(
      Object.entries(result ?? {}).filter(([key]) => Object.prototype.hasOwnProperty.call(attributesUpdate, key)),
    );
    return result? updatedAttributes : null;
  } catch (error) {
    return handleDbError('Failed to set protected attributes:', 'setProtectedAttributes', error);
  }
};

/**
 * Deletes specified protected attributes for a given unique identifier and namespace.
 *
 * @param {string} uniqueIdentifier - The unique identifier for the entity.
 * @param {string} namespace - The namespace under which the attributes are stored.
 * @param {string[]} names - An array of attribute names to delete.
* @returns {Promise<boolean>} True if the attributes were deleted or did not exist, false if the record was not found or update failed.
 */
const deleteProtectedAttributes = async (
  uniqueIdentifier: string,
  namespace: string,
  names: string[],
): Promise<boolean> => {
  _checkInitialization();
  try {
    const aObject = await _getProtectedAttributesObject(uniqueIdentifier, namespace);
    if (!aObject) return false;

    const filteredAttributes = Object.fromEntries(
      Object.entries(aObject.attributes).filter(([key]) => !names.includes(key)),
    );
    const updatedProtectedAttr: object | null = await overrideProtectedAttributes(
      aObject.id,
      filteredAttributes
    );
    return !updatedProtectedAttr ? false : true;
  } catch (error) {
    return handleDbError(
      'Failed to delete protected attributes:',
      'deleteProtectedAttributes',
      error,
    );
  }
};

/**
 * ProtectedManager provides methods for managing protected attributes.
 *
 * Includes retrieval, updates, and deletion of protected attributes.
 * @namespace ProtectedManager
 */
export const ProtectedManager = {
  init,
  // main methods for managing protected attributes exposed through UserManager
  getProtectedAttributes,
  setProtectedAttributes,
  deleteProtectedAttributes,

  // utility methods that can stand alone but are currently not exposed through UserManager.
  createProtectedAttributes,
  overrideProtectedAttributes,
};

/**
 * Test-only variant of {@link ProtectedManager} that exposes
 * internal methods for testing purposes.
 *
 * Not exported from the package entry.
 *
 * @internal
 */
export const TestingProtectedManager = {
  ...ProtectedManager,
  _getProtectedAttributesObject
};
