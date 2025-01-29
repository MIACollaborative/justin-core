import sinon from 'sinon';
import DataManager from '../../data-manager/data-manager';

export const initializeDataManagerMock = () => {
  const dataManagerMock = {
    mockInit: sinon.stub(DataManager.prototype, 'init').resolves(),
    mockGetInitializationStatus: sinon
      .stub(DataManager.prototype, 'getInitializationStatus')
      .returns(true),
    mockCheckInitialization: sinon.stub(DataManager.prototype, 'checkInitialization').callsFake(() => {
      // Simulate successful check
    }),
    mockAddItemToCollection: sinon.stub(DataManager.prototype, 'addItemToCollection').resolves(),
    mockGetAllInCollection: sinon.stub(DataManager.prototype, 'getAllInCollection').resolves([]),
    mockRemoveItemFromCollection: sinon.stub(DataManager.prototype, 'removeItemFromCollection').resolves(true),
    mockUpdateItemInCollectionById: sinon.stub(DataManager.prototype, 'updateItemInCollectionById').resolves(),
    mockClearCollection: sinon.stub(DataManager.prototype, 'clearCollection').resolves(),
    mockClient: { isConnected: true }, // Simulate a connected client
    resetDataManagerMocks: () => {
      // @ts-ignore
      Object.values(dataManagerMock).forEach((stub) => stub.resetHistory && stub.resetHistory());
    },
    restoreDataManagerMocks: () => {
      sinon.restore();
    },
  };

  return dataManagerMock;
};


export type DataManagerMocksType = ReturnType<typeof initializeDataManagerMock>;
