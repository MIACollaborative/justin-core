import sinon from "sinon";
// eslint-disable-next-line no-duplicate-imports
import type {SinonSandbox, SinonSpy, SinonStub} from "sinon";
import {ChangeListenerManager as CLM} from "../../data-manager/change-listener.manager";
import { MongoDBManager as mongoFns } from '../../data-manager/mongo/mongo-data-manager';
import * as Helpers from '../../data-manager/data-manager.helpers';

type ClmMock = {
  addChangeListener: SinonStub;
  removeChangeListener: SinonStub;
  clearChangeListeners: SinonStub;
};

type DataManagerUnitSandbox = {
  sb: SinonSandbox;
  clm: ClmMock;
  mongo: {
    init: SinonStub;
    ensureStore: SinonStub;
    ensureIndexes: SinonStub;
    close: SinonStub;
    addItemToCollection: SinonStub;
    updateItemInCollection: SinonStub;
    removeItemFromCollection: SinonStub;
    getAllInCollection: SinonStub;
    clearCollection: SinonStub;
    isCollectionEmpty: SinonStub;
    findItemByIdInCollection: SinonStub;
    findItemsInCollection: SinonStub;
    getCollectionChangeReadable: SinonStub;
  };
  handleDbErrorSpy: SinonSpy;
  restore(): void;
};

/**
 * Sandbox for DataManager unit tests that stub the MongoDBManager module functions
 * and ChangeListenerManager singleton instance.
 */
function makeDataManagerSandbox(): DataManagerUnitSandbox {
  const sb = sinon.createSandbox();

  const clm: ClmMock = {
    addChangeListener: sb.stub(),
    removeChangeListener: sb.stub(),
    clearChangeListeners: sb.stub(),
  };
  sb.stub(CLM, 'getInstance').returns(clm as any);

  const mongo = {
    init: sb.stub(mongoFns, 'init').resolves(),
    ensureStore: sb.stub(mongoFns, 'ensureStore').resolves(),
    ensureIndexes: sb.stub(mongoFns, 'ensureIndexes').resolves(),
    close: sb.stub(mongoFns, 'close').resolves(),
    addItemToCollection: sb.stub(mongoFns, 'addItemToCollection'),
    updateItemInCollection: sb.stub(mongoFns, 'updateItemInCollection'),
    removeItemFromCollection: sb.stub(mongoFns, 'removeItemFromCollection'),
    getAllInCollection: sb.stub(mongoFns, 'getAllInCollection'),
    clearCollection: sb.stub(mongoFns, 'clearCollection').resolves(),
    isCollectionEmpty: sb.stub(mongoFns, 'isCollectionEmpty'),
    findItemByIdInCollection: sb.stub(mongoFns, 'findItemByIdInCollection'),
    findItemsInCollection: sb.stub(mongoFns, 'findItemsInCollection'),
    getCollectionChangeReadable: sb.stub(mongoFns, 'getCollectionChangeReadable'),
  };

  const handleDbErrorSpy = sb.spy(Helpers, 'handleDbError');

  return {
    sb,
    clm,
    mongo,
    handleDbErrorSpy,
    restore() {
      sb.restore();
    },
  };
}

export { makeDataManagerSandbox, DataManagerUnitSandbox };
