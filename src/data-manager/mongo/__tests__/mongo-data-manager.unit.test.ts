import * as mongoDB from "mongodb";
import sinon from "sinon";
import { MongoDBManager, TestingMongoDBManager } from "../mongo-data-manager";
import * as dataManagerHelpers from "../../data-manager.helpers";
import { Log } from "../../../logger/logger-manager";

describe("MongoDBManager", () => {
  let sandbox: sinon.SinonSandbox;

  let findStub: sinon.SinonStub;
  let findResultListStub: sinon.SinonStub;
  let ensureInitializedStub: sinon.SinonStub;
  let handleDbErrorStub: sinon.SinonStub;
  let fakeCollection: any;
  let fakeDb: any;
  let dbStub: sinon.SinonStub;
  let clientStub: sinon.SinonStub;
  let isConnectedStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(console, "error").callsFake(() => {});
    ensureInitializedStub = sandbox
      .stub(MongoDBManager, "ensureInitialized")
      .callsFake(() => {
        Log.dev("MongoDBManager ensureInitialized stub called");
      });

    findResultListStub = sandbox.stub();
    findStub = sandbox.stub().returns({ toArray: findResultListStub });
    fakeCollection = {
      find: findStub,
      updateOne: () => {},
      findOne: () => {},
      toArray: () => [],
    };

    // version 2, try stubbing the property directly
    fakeDb = { collection: (_collectionName: string) => fakeCollection };

    // Stub the _db property
    dbStub = sandbox.stub(TestingMongoDBManager as any, "_db").value(fakeDb);
    // Stub the _client property
    clientStub = sandbox.stub(TestingMongoDBManager as any, "_client").value({
      connect: () => {},
      close: () => {},
      db: () => fakeDb,
    } as unknown as mongoDB.MongoClient);
    // Stub the _isConnected property
    isConnectedStub = sandbox.stub(TestingMongoDBManager as any, "_isConnected").value(true);

    // version 1: original
    /*
    TestingMongoDBManager._setDatabaseInstance({
      collection: () => fakeCollection,
    } as unknown as mongoDB.Db);
     
    TestingMongoDBManager._setClient({
      connect: () => {},
      close: () => {},
      db: () => fakeDb,
    } as unknown as mongoDB.MongoClient);
    TestingMongoDBManager._setIsConnected(true);
    */

    handleDbErrorStub = sandbox
      .stub(dataManagerHelpers, "handleDbError")
      .throws(new Error("fail"));

    
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("ensureInitialized", () => {
    /*
    it("should not throw error if database is initialized", async () => {
      expect(() => MongoDBManager.ensureInitialized()).not.toThrow();
    });
    */
    
    it("should throw if database is not connected", async () => {
      // ensureInitialized is stubbed by default, so we need to restore it
      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(TestingMongoDBManager as any, "_isConnected").value(false);
      sandbox.stub(console, "error").callsFake(() => {});
      expect(() => {
        MongoDBManager.ensureInitialized();
      }).toThrow(/MongoDB client not initialized/);
    });
    
    it("should throw if client is not set", () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(TestingMongoDBManager as any, "_isConnected").value(true);
      sandbox.stub(TestingMongoDBManager as any, "_client").value(null as any);
      sandbox.stub(console, "error").callsFake(() => {});
      expect(() => {
        MongoDBManager.ensureInitialized();
      }).toThrow(/MongoDB client not initialized/);
    });

    it("should throw if db instance is not set", () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(TestingMongoDBManager as any, "_isConnected").value(true);
      sandbox.stub(TestingMongoDBManager as any, "_client").value({} as any);
      sandbox.stub(TestingMongoDBManager as any, "_db").value(null as any);
      expect(() => {
        MongoDBManager.ensureInitialized();
      }).toThrow(/MongoDB client not initialized/);
    });

    
    it("should not throw if all required properties are set", () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(TestingMongoDBManager as any, "_isConnected").value(true);
      sandbox.stub(TestingMongoDBManager as any, "_client").value({} as any);
      sandbox.stub(TestingMongoDBManager as any, "_db").value({} as any);
      expect(() => {
        MongoDBManager.ensureInitialized();
      }).not.toThrow();
    });
  });

  /*
  describe("findItemsInCollection", () => {
    it("returns null if collection name is an empty string", async () => {
      const result = await MongoDBManager.findItemsInCollection("", {
        foo: "bar",
      });
      expect(result).toBeNull();
    });

    it("returns null if criteria is undefined", async () => {
      const result = await MongoDBManager.findItemsInCollection(
        "users",
        undefined as any
      );
      expect(result).toBeNull();
    });

    it("returns null if criteria is null", async () => {
      const result = await MongoDBManager.findItemsInCollection("users", null);
      expect(result).toBeNull();
    });

    it("returns documents fitting the criteria", async () => {
      const docs = [{ _id: "123", name: "Alice" }];
      findResultListStub.resolves(docs);
      const result = await MongoDBManager.findItemsInCollection("users", {
        name: "Alice",
      });
      expect(findStub.calledWith({ name: "Alice" })).toBe(true);
      expect(findResultListStub.called).toBe(true);
      expect(result).toEqual([{ name: "Alice", id: "123" }]);
    });

    it("returns empty array if no documents found", async () => {
      findResultListStub.resolves([]);
      const result = await MongoDBManager.findItemsInCollection("users", {
        name: "Nobody",
      });
      expect(result).toEqual([]);
    });

    it("filters out nulls from transformId", async () => {
      const docs = [{ _id: "123", name: "Alice" }, null];
      findResultListStub.resolves(docs);
      const result = await MongoDBManager.findItemsInCollection("users", {});
      expect(result).toEqual([{ id: "123", name: "Alice" }]);
    });

    it("returns handleDbError result on error", async () => {
      findStub.throws(new Error("fail"));
      await expect(
        MongoDBManager.findItemsInCollection("users", {
          name: "Alice",
        })
      ).rejects.toThrow("fail");
      expect(handleDbErrorStub.called).toBe(true);
      expect(findStub.calledWith({ name: "Alice" })).toBe(true);
    });

    it("throws if collection method throws", async () => {
      TestingMongoDBManager._setDatabaseInstance({
        collection: () => {
          throw new Error("collection fail");
        },
      } as unknown as mongoDB.Db);
      await expect(
        MongoDBManager.findItemsInCollection("users", { foo: "bar" })
      ).rejects.toThrow("fail");
      expect(handleDbErrorStub.called).toBe(true);
    });
  });
  */
});
