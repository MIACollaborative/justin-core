import sinon from 'sinon';
import DataManager from '../../data-manager/data-manager';
import { makeStream } from '../../__tests__/helpers/streams';

type Key = string; // `${collection}:${type}`

/**
 * Mocks the DataManager singleton *just enough* for ChangeListenerManager tests:
 * - replaces DataManager.getInstance() with an object that has getChangeStream()
 * - getChangeStream() returns a stable Readable per (collection, changeType)
 */
function mockDataManager() {
  const sb = sinon.createSandbox();
  const streams = new Map<Key, ReturnType<typeof makeStream>>();

  const getKey = (col: string, type: unknown) => `${col}:${String(type)}`;

  const getChangeStream = sb.stub().callsFake((collection: string, changeType: unknown) => {
    const key = getKey(collection, changeType);
    if (!streams.has(key)) streams.set(key, makeStream());
    return streams.get(key)!;
  });

  const instance = { getChangeStream };

  sb.stub(DataManager as any, 'getInstance').returns(instance as any);

  return {
    instance,
    getStream(collection: string, changeType: unknown) {
      return getChangeStream(collection, changeType);
    },
    restore() {
      sb.restore();
    },
  };
}

/**
 * A standalone sinon-stubbed DataManager-shaped object.
 *
 * This does NOT patch the singleton; use installDataManagerSingleton for that.
 */
function createDataManagerMock() {
  return {
    // lifecycle
    init: sinon.stub().resolves(),
    ensureStore: sinon.stub().resolves(),
    ensureIndexes: sinon.stub().resolves(),
    close: sinon.stub().resolves(),
    getInitializationStatus: sinon.stub().returns(true),

    // CRUD-ish
    addItemToCollection: sinon.stub(),
    updateItemByIdInCollection: sinon.stub(),
    removeItemFromCollection: sinon.stub(),
    getAllInCollection: sinon.stub(),
    clearCollection: sinon.stub().resolves(),
    isCollectionEmpty: sinon.stub(),
    findItemByIdInCollection: sinon.stub(),
    findItemsInCollection: sinon.stub(),

    // change streams (optional)
    getChangeStream: sinon.stub(),
  };
}

type DataManagerMock = ReturnType<typeof createDataManagerMock>;

/**
 * Installs a DataManagerMock as the DataManager singleton.
 */
function installDataManagerSingleton(dm: DataManagerMock) {
  const sb = sinon.createSandbox();
  sb.stub(DataManager as any, 'getInstance').returns(dm as any);

  return {
    dm,
    restore() {
      sb.restore();
    },
  };
}



export type { DataManagerMock };

export {
  mockDataManager,
  createDataManagerMock,
  installDataManagerSingleton,
};
