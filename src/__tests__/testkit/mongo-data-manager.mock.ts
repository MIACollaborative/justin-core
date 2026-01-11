import sinon from 'sinon';
// eslint-disable-next-line no-duplicate-imports
import type { SinonStub } from 'sinon';

type MongoManagerMock = ReturnType<typeof createMongoManagerMock>;

function createMongoManagerMock() {
  return {
    // lifecycle
    init: sinon.stub().resolves(),
    ensureStore: sinon.stub().resolves(),
    ensureIndexes: sinon.stub().resolves(),
    close: sinon.stub().resolves(),

    // CRUD
    addItemToCollection: sinon.stub(),
    updateItemInCollection: sinon.stub(),
    removeItemFromCollection: sinon.stub(),
    getAllInCollection: sinon.stub(),
    clearCollection: sinon.stub().resolves(),
    isCollectionEmpty: sinon.stub(),
    findItemByIdInCollection: sinon.stub(),
    findItemsInCollection: sinon.stub(),

    // change streams
    getCollectionChangeReadable: sinon.stub(),
  };
}

/**
 * Lightweight fake mongo objects (sinon stubs) used by mongo adapter unit tests.
 */
type FakeCollection = {
  watch: SinonStub;
  listIndexes: SinonStub;
  createIndexes: SinonStub;
  findOne: SinonStub;
  find: SinonStub;
  insertOne: SinonStub;
  findOneAndUpdate: SinonStub;
  updateOne: SinonStub;
  deleteOne: SinonStub;
  deleteMany: SinonStub;
  countDocuments: SinonStub;
};

type FakeDb = {
  collection: SinonStub;
  listCollections: SinonStub;
  createCollection: SinonStub;
  command: SinonStub;
};

type FakeClient = {
  close: SinonStub;
};

type FakeMongo = {
  collection: FakeCollection;
  db: FakeDb;
  client: FakeClient;
};

function makeFakeMongo(): FakeMongo {
  const collection: FakeCollection = {
    watch: sinon.stub(),
    listIndexes: sinon.stub(),
    createIndexes: sinon.stub(),
    findOne: sinon.stub(),
    find: sinon.stub(),
    insertOne: sinon.stub(),
    findOneAndUpdate: sinon.stub(),
    updateOne: sinon.stub(),
    deleteOne: sinon.stub(),
    deleteMany: sinon.stub(),
    countDocuments: sinon.stub(),
  };

  const db: FakeDb = {
    collection: sinon.stub().returns(collection),
    listCollections: sinon.stub(),
    createCollection: sinon.stub(),
    command: sinon.stub(),
  };

  const client: FakeClient = {
    close: sinon.stub(),
  };

  return { collection, db, client };
}



export type { MongoManagerMock, FakeMongo, FakeCollection, FakeDb, FakeClient };

export { createMongoManagerMock, makeFakeMongo };
