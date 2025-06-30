import * as mongoDB from "mongodb";
import sinon from "sinon";
import { MongoDBManager } from "../mongo-data-manager";
import * as mongoHelpers from "../mongo.helpers";
import * as logger from "../../../logger/logger-manager";
import * as dataManagerHelpers from "../../data-manager.helpers";

describe("MongoDBManager.findItemsByCriteriaInCollection", () => {
  let collectionStub: sinon.SinonStub;
  let findStub: sinon.SinonStub;
  let toArrayStub: sinon.SinonStub;
  let ensureInitializedStub: sinon.SinonStub;
  let handleDbErrorStub: sinon.SinonStub;
  let fakeCollection: any;
  let fakeDb: any;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    ensureInitializedStub = sinon
      .stub(MongoDBManager, "ensureInitialized")
      .callsFake(() => {});
    handleDbErrorStub = sinon
      .stub(dataManagerHelpers, "handleDbError")
      .throws(new Error("fail"));
    toArrayStub = sinon.stub();
    findStub = sinon.stub().returns({ toArray: toArrayStub });
    fakeCollection = { find: findStub };
    collectionStub = sinon.stub().returns(fakeCollection);
    fakeDb = { collection: collectionStub };
    // Patch the internal _db variable
    (require("../mongo-data-manager") as any)._db = fakeDb;
        sandbox = sinon.createSandbox();
    // Replace internalFunction on the required module object
    /*
    const transformId = (doc: any) => {
       if (!doc) return null;
        const { _id, ...rest } = doc;
        return { ...rest, id: _id?.toString()};
    };
    sandbox.replace(
      require("../mongo-data-manager") as any,
      'transformId',
      transformId
    );
    */
  });

  afterEach(() => {
    sinon.restore();
    //sandbox.restore();
  });

  it("returns null if criteria is null", async () => {
    const result = await MongoDBManager.findItemsByCriteriaInCollection(
      "users",
      null
    );
    expect(result).toBeNull();
    expect(collectionStub.notCalled).toBe(true);
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
    expect(collectionStub.calledWith("users")).toBe(true);
    expect(findStub.calledWith({ name: "Alice" })).toBe(true);
    expect(toArrayStub.called).toBe(true);
    expect(result).toEqual([
      { name: "Alice", id: "123" },
      { name: "Bob", id: "456" },
    ]);
  });

  /*
  it("filters out nulls from transformId", async () => {
    const docs = [{ _id: "123", name: "Alice" }, null];
    toArrayStub.resolves(docs);
    const transformId = (doc: any) => (doc ? { ...doc, id: doc._id } : null);
    sinon.replace(
      require("../mongo-data-manager") as any,
      "transformId",
      transformId
    );
    const result = await MongoDBManager.findItemsByCriteriaInCollection(
      "users",
      {}
    );
    expect(result).toEqual([{ _id: "123", name: "Alice", id: "123" }]);
  });

  it("returns handleDbError result on error", async () => {
    findStub.throws(new Error("fail"));
    const result = await MongoDBManager.findItemsByCriteriaInCollection(
      "users",
      { name: "Alice" }
    );
    expect(handleDbErrorStub.called).toBe(true);
    expect(result).toEqual(["error"]);
  });
  */
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
