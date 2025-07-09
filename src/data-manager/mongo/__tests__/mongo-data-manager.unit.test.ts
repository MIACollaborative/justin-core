import * as mongoDB from "mongodb";
import sinon from "sinon";
import { MongoDBManager, TestingMongoDBManager } from "../mongo-data-manager";
import * as dataManagerHelpers from "../../data-manager.helpers";
import { Log } from "../../../logger/logger-manager";

describe("MongoDBManager", () => {
  let sandbox: sinon.SinonSandbox;

  let findStub: sinon.SinonStub;
  let toArrayStub: sinon.SinonStub;
  let ensureInitializedStub: sinon.SinonStub;
  let handleDbErrorStub: sinon.SinonStub;
  let fakeCollection: any;
  let fakeDb: any;
  let mdStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    ensureInitializedStub = sandbox
      .stub(MongoDBManager, "ensureInitialized")
      .callsFake(() => {
        Log.dev("MongoDBManager ensureInitialized stub called");
      });

    TestingMongoDBManager._setDatabaseInstance({
      collection: () => fakeCollection,
    } as unknown as mongoDB.Db); // Set a fake database instance for testing
    TestingMongoDBManager._setClient({ connect: () => {}, close: () => {}, db: () => fakeDb } as unknown as mongoDB.MongoClient); // Set a fake client instance for testing
    TestingMongoDBManager._setIsConnected(true); // Set connected state to true for testing

    handleDbErrorStub = sandbox
      .stub(dataManagerHelpers, "handleDbError")
      .throws(new Error("fail"));

    toArrayStub = sandbox.stub();
    findStub = sandbox.stub().returns({ toArray: toArrayStub });
    fakeCollection = {
      find: findStub,
      updateOne: () => {},
      findOne: () => {},
      toArray: () => [],
    };
    fakeDb = { collection: (_collectionName: string) => fakeCollection };

    mdStub = sandbox.stub(MongoDBManager, "getDatabaseInstance").returns({
      collection: () => fakeCollection,
    } as any);
  });

  afterEach(() => {
    sandbox.restore();
  });

  // passing
  
  describe("ensureInitialized", () => {
    it("should not throw error if database is initialized", async () => {
      // so, the stubbing is actually working if call it through MongoDBManager
      await MongoDBManager.ensureInitialized();
    });

    it("should throw if database is not connected", async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();

      TestingMongoDBManager._setIsConnected(false); 
      expect(() => {MongoDBManager.ensureInitialized()}).toThrow(
        /MongoDB client not initialized/
      );
    });
  });
  

  describe("findItemsByCriteriaInCollection", () => {
    
    it("returns null if criteria is null", async () => {
      const result = await MongoDBManager.findItemsByCriteriaInCollection(
        "users",
        null
      );
      expect(result).toBeNull();
    });

    /*
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

    it("returns empty array if no documents found", async () => {
      toArrayStub.resolves([]);
      const result = await MongoDBManager.findItemsByCriteriaInCollection(
        "users",
        { name: "Nobody" }
      );
      expect(result).toEqual([]);
    });

    it("filters out nulls from transformId", async () => {
      const docs = [{ _id: "123", name: "Alice" }, null];
      toArrayStub.resolves(docs);
      const result = await MongoDBManager.findItemsByCriteriaInCollection(
        "users",
        {}
      );
      expect(result).toEqual([{ id: "123", name: "Alice" }]);
    });

    it("returns handleDbError result on error", async () => {
      findStub.throws(new Error("fail"));
      await expect(
        MongoDBManager.findItemsByCriteriaInCollection("users", {
          name: "Alice",
        })
      ).rejects.toThrow("fail");
      expect(handleDbErrorStub.called).toBe(true);
      expect(findStub.calledWith({ name: "Alice" })).toBe(true);
    });
    */
  });
});
