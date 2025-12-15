import DataManager from '../data-manager/data-manager';
import { PROTECTED } from '../data-manager/data-manager.constants';
import { createLogger } from '../logger/logger';
import { ProtectedAttributes } from './protected-manager.type';

const Log = createLogger({
  context: {
    source: 'protected-manager',
  },
});

const dm = DataManager.getInstance();

/**
 * Initializes the ProtectedManager by initializing the DataManager,
 * loading users into the cache, and setting up listeners for
 * user-related database changes.
 *
 * @returns {Promise<void>} Resolves when initialization is complete.
 */
const init = async (): Promise<void> => {
  await dm.init();

  // ensure PROTECTED exists and has a unique index on uniqueIdentifier (idempotent, DB-agnostic)
  await dm.ensureStore(PROTECTED);
  await dm.ensureIndexes(PROTECTED, [
    { name: 'uniq_user_identifier_namespace', key: { uniqueIdentifier: 1, namespace: 1 }, unique: true },
  ]);
};

/**
 * Transforms a document to use `id` instead of `_id`.
 * @param {any} doc - The raw document from the database.
 * @returns {any} The transformed document.
 */
const transformProtectedDocument = (doc: any): ProtectedAttributes => {
  const { _id, ...rest } = doc;
  return { id: _id?.toString(), ...rest } as ProtectedAttributes;
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
    throw new Error('ProtectedManager has not been initialized');
  }
};


const getProtectedAttributes = async (uniqueIdentifier: string, namespace: string, names: string[]): Promise<Record<string, unknown> | null> => {
  _checkInitialization();
  const result = await dm.findItemsInCollection(PROTECTED, { uniqueIdentifier, namespace });
  if (!result || result.length === 0) {
    return null;
  }
  const protectedAttr = transformProtectedDocument(result[0]);
  const filteredAttributes: Record<string, unknown> = Object.fromEntries(
    Object.entries(protectedAttr.attributes).filter(([key]) => names.includes(key))
  );
  return filteredAttributes;
};


const setProtectedAttributes = async (uniqueIdentifier: string, namespace: string, attributesUpdate: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
  _checkInitialization();
  const result = await dm.findItemsInCollection(PROTECTED, { uniqueIdentifier, namespace });
  if (!result || result.length === 0) {
    return null;
  }
  const protectedAttr = transformProtectedDocument(result[0]);
  const mergedAttributes = { ...protectedAttr.attributes, ...attributesUpdate };
  const updatedProtectedAttr: object | null = (await dm.updateItemByIdInCollection(PROTECTED, protectedAttr.id, {
    attributes: mergedAttributes,
  }));

  if (!updatedProtectedAttr) {
    throw new Error(`Failed to update protected attributes for: ${protectedAttr.id}`);
  }
  return attributesUpdate;
};

const deleteProtectedAttributes = async (uniqueIdentifier: string, namespace: string, names: string[]): Promise<boolean> => {
  _checkInitialization();
  const result = await dm.findItemsInCollection(PROTECTED, { uniqueIdentifier, namespace });
  if (!result || result.length === 0) {
    return false;
  }
  const protectedAttr = transformProtectedDocument(result[0]);

  for (const name of names) {
    delete protectedAttr.attributes[name];
  }
  const updatedProtectedAttr: object | null = (await dm.updateItemByIdInCollection(PROTECTED, protectedAttr.id, {
    attributes: protectedAttr.attributes,
  }));

  if (!updatedProtectedAttr) {
    throw new Error(`Failed to delete protected attributes for: ${protectedAttr.id}`);
  }
  return true;
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