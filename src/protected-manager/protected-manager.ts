import DataManager from '../data-manager/data-manager';
import { PROTECTED } from '../data-manager/data-manager.constants';
import { handleDbError } from '../data-manager/data-manager.helpers';
import { ProtectedAttributes } from './protected-manager.type';

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
 * @param {any} doc - The raw document from the database.
 * @returns {ProtectedAttributes} The transformed document.
 */
const transformProtectedDocument = (doc: any): ProtectedAttributes => {
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
 * Retrieves protected attributes for a given unique identifier and namespace.
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
    const [doc] =
      (await dm.findItemsInCollection(PROTECTED, { uniqueIdentifier, namespace })) ?? [];
    if (!doc) return null;
    const { attributes } = transformProtectedDocument(doc);
    return Object.fromEntries(
      names.map((key) => [key, attributes.hasOwnProperty(key) ? attributes[key] : undefined]),
    );
  } catch (error) {
    return handleDbError('Failed to get protected attributes:', 'getProtectedAttributes', error);
  }
};

/**
 * Creates protected attributes for a given unique identifier and namespace.
 *
 * @param {string} uniqueIdentifier - The unique identifier for the entity.
 * @param {string} namespace - The namespace under which the attributes are stored.
 * @param {Record<string, unknown>} initialAttributes - The attributes to update.
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
 * Updates protected attributes for a given unique identifier and namespace.
 *
 * @param {string} uniqueIdentifier - The unique identifier for the entity.
 * @param {string} namespace - The namespace under which the attributes are stored.
 * @param {Record<string, unknown>} attributesUpdate - The attributes to update.
 * @returns {Promise<Record<string, unknown> | null>} A promise that resolves to the updated attributes or null if the operation failed.
 */
const updateProtectedAttributes = async (
  protectedAttributesId: string,
  originalAttributes: Record<string, unknown>,
  attributesUpdate: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
  _checkInitialization();
  try {
    const mergedAttributes = { ...originalAttributes, ...attributesUpdate };
    const updatedProtectedAttr: object | null = await dm.updateItemByIdInCollection(
      PROTECTED,
      protectedAttributesId,
      {
        attributes: mergedAttributes,
      },
    );
    // return only the updated attributes (not the whole set) if successful
    return updatedProtectedAttr?attributesUpdate:null;
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
 * @returns {Promise<Record<string, unknown> | null>} A promise that resolves to the updated attributes or null if the operation failed.
 */
const setProtectedAttributes = async (
  uniqueIdentifier: string,
  namespace: string,
  attributesUpdate: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
  _checkInitialization();
  try {
    const [doc] =
      (await dm.findItemsInCollection(PROTECTED, { uniqueIdentifier, namespace })) ?? [];
    if (!doc) {
      return await createProtectedAttributes(uniqueIdentifier, namespace, attributesUpdate);
    }
    const protectedAttr = transformProtectedDocument(doc);
    return await updateProtectedAttributes(protectedAttr.id, protectedAttr.attributes, attributesUpdate);
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
 * @returns {Promise<boolean>} A promise that resolves to true if deletion was successful, false otherwise.
 */
const deleteProtectedAttributes = async (
  uniqueIdentifier: string,
  namespace: string,
  names: string[],
): Promise<boolean> => {
  _checkInitialization();
  try {
    const [doc] =
      (await dm.findItemsInCollection(PROTECTED, { uniqueIdentifier, namespace })) ?? [];
    if (!doc) return false;
    const protectedAttr = transformProtectedDocument(doc);

    const filteredAttributes = Object.fromEntries(
      Object.entries(protectedAttr.attributes).filter(([key]) => !names.includes(key)),
    );
    const updatedProtectedAttr: object | null = await dm.updateItemByIdInCollection(
      PROTECTED,
      protectedAttr.id,
      {
        attributes: filteredAttributes,
      },
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
  getProtectedAttributes,
  setProtectedAttributes,
  deleteProtectedAttributes,
};
