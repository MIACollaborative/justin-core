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
  let mdStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    jest.spyOn(console, "error").mockImplementation(() => {});
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

    TestingMongoDBManager._setDatabaseInstance({
      collection: () => fakeCollection,
    } as unknown as mongoDB.Db);
    TestingMongoDBManager._setClient({
      connect: () => {},
      close: () => {},
      db: () => fakeDb,
    } as unknown as mongoDB.MongoClient);
    TestingMongoDBManager._setIsConnected(true);

    handleDbErrorStub = sandbox
      .stub(dataManagerHelpers, "handleDbError")
      .throws(new Error("fail"));

    fakeDb = { collection: (_collectionName: string) => fakeCollection };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("ensureInitialized", () => {
    it("should not throw error if database is initialized", async () => {
      expect(() => MongoDBManager.ensureInitialized()).not.toThrow();
    });

    it("should throw if database is not connected", async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      TestingMongoDBManager._setIsConnected(false);
      expect(() => {
        MongoDBManager.ensureInitialized();
      }).toThrow(/MongoDB client not initialized/);
    });

    it("should throw if client is not set", () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      TestingMongoDBManager._setIsConnected(true);
      TestingMongoDBManager._setClient(null as any);
      expect(() => {
        MongoDBManager.ensureInitialized();
      }).toThrow(/MongoDB client not initialized/);
    });

    it("should throw if db instance is not set", () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      TestingMongoDBManager._setIsConnected(true);
      TestingMongoDBManager._setClient({} as any);
      TestingMongoDBManager._setDatabaseInstance(null as any);
      expect(() => {
        MongoDBManager.ensureInitialized();
      }).toThrow(/MongoDB client not initialized/);
    });

    it("should not throw if all required properties are set", () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      TestingMongoDBManager._setIsConnected(true);
      TestingMongoDBManager._setClient({} as any);
      TestingMongoDBManager._setDatabaseInstance({} as any);
      expect(() => {
        MongoDBManager.ensureInitialized();
      }).not.toThrow();
    });
  });

  describe("findItemsInCollection", () => {
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
  });
});
