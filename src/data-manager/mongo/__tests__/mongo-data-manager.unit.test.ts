import * as mongoDB from "mongodb";
import sinon from "sinon";
import { MongoDBManager } from "../mongo-data-manager";
import * as dataManagerHelpers from "../../data-manager.helpers";
import { TestingMongoDBManager } from "../mongo-data-manager";

describe("MongoDBManager.findItemsByCriteriaInCollection", () => {
  let findStub: sinon.SinonStub;
  let toArrayStub: sinon.SinonStub;
  let ensureInitializedStub: sinon.SinonStub;
  let handleDbErrorStub: sinon.SinonStub;
  let fakeCollection: any;
  let fakeDb: any;
  let mdStub: sinon.SinonStub;

  beforeEach(() => {
    ensureInitializedStub = sinon
      .stub(MongoDBManager, "ensureInitialized")
      .callsFake(() => {});

    handleDbErrorStub = sinon
      .stub(dataManagerHelpers, "handleDbError")
      .throws(new Error("fail"));

    toArrayStub = sinon.stub();
    findStub = sinon.stub().returns({ toArray: toArrayStub });
    fakeCollection = {
      find: findStub,
      updateOne: () => {},
      findOne: () => {},
      toArray: () => [],
    };
    fakeDb = { collection: (_collectionName: string) => fakeCollection };
    TestingMongoDBManager._db = fakeDb;

    mdStub = sinon.stub(MongoDBManager, "getDatabaseInstance").returns({
      collection: () => fakeCollection,
    } as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("returns null if criteria is null", async () => {
    const result = await MongoDBManager.findItemsByCriteriaInCollection(
      "users",
      null
    );
    expect(result).toBeNull();
  });

  it("returns transformed list when documents are found", async () => {
    const docs = [
      { _id: "123", name: "Alice" },
      { _id: "456", name: "Bob" },
    ];
    toArrayStub.resolves(docs);
    const result = await MongoDBManager.findItemsByCriteriaInCollection(
      "users",
      { name: "Alice" }
    );
    expect(findStub.calledWith({ name: "Alice" })).toBe(true);
    expect(toArrayStub.called).toBe(true);
    expect(result).toEqual([
      { name: "Alice", id: "123" },
      { name: "Bob", id: "456" },
    ]);
  });

  it("returns handleDbError result on error", async () => {
    findStub.throws(new Error("fail"));
    await expect(
      MongoDBManager.findItemsByCriteriaInCollection("users", { name: "Alice" })
    ).rejects.toThrow("fail");
    expect(handleDbErrorStub.called).toBe(true);
    expect(findStub.calledWith({ name: "Alice" })).toBe(true);
  });
});

/*
describe('MongoDBManager.updateItemInCollectionByUniqueProperty', () => {
  let collectionStub: sinon.SinonStub;
  let ensureInitializedStub: sinon.SinonStub;
  let handleDbErrorStub: sinon.SinonStub;
  let logWarnStub: sinon.SinonStub;
  let findStub: sinon.SinonStub;
  let updateOneStub: sinon.SinonStub;
  let findOneStub: sinon.SinonStub;
  let toArrayStub: sinon.SinonStub;
  let transformIdStub: sinon.SinonStub;

  const fakeCollection = {
    find: () => fakeCollection,
    updateOne: () => {},
    findOne: () => {},
    toArray: () => [],
  };

  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    ensureInitializedStub = sinon.stub(MongoDBManager as any, 'ensureInitialized').callsFake(() => {});
    collectionStub = sinon.stub((mongoDB as any).Db.prototype, 'collection').returns(fakeCollection); 
    handleDbErrorStub = sinon.stub(dataManagerHelpers, 'handleDbError').throws(new Error('fail'));
    logWarnStub = sinon.stub(logger.Log, 'warn');
    findStub = sinon.stub(fakeCollection, 'find').returns(fakeCollection);
    updateOneStub = sinon.stub(fakeCollection, 'updateOne');
    findOneStub = sinon.stub(fakeCollection, 'findOne');
    toArrayStub = sinon.stub(fakeCollection, 'toArray');
    transformIdStub = sandbox.stub(mongoHelpers, 'toObjectId').callsFake((doc: any) => ({ id: doc._id, ...doc }));
  });

  afterEach(() => {
    sinon.restore();
    sandbox.restore();
  });


  it('should return null and log warning if multiple items found', async () => {
    toArrayStub.resolves([{}, {}]);
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty('users', 'email', 'a@b.com', { name: 'A' });
    expect(result).toBeNull();
    expect(logWarnStub.called).toBe(true);
  });

  it('should update and return transformed item if one item found', async () => {
    toArrayStub.resolves([ { email: 'a@b.com' } ]);
    updateOneStub.resolves({ matchedCount: 1, modifiedCount: 1 });
    const updatedDoc = { email: 'a@b.com', name: 'A' };
    findOneStub.resolves(updatedDoc);
    transformIdStub.returns(updatedDoc);
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty('users', 'email', 'a@b.com', { name: 'A' });
    expect(result).toEqual(updatedDoc);
  });

  it('should handle error and call handleDbError', async () => {
    toArrayStub.rejects(new Error('fail'));
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty('users', 'email', 'fail@b.com', { name: 'Fail' });
    expect(handleDbErrorStub.called).toBe(true);
    expect(result).toBeNull();
  });

});

  */
