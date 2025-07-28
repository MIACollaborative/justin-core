import DataManager from "../data-manager";
import { MongoDBManager } from "../mongo/mongo-data-manager";
import * as dataManagerHelpers from "../data-manager.helpers";
import sinon from "sinon";

// Use jest for assertions

describe("DataManager", () => {
  let dataManager: DataManager;
  let checkInitStub: sinon.SinonStub;
  let sandbox: sinon.SinonSandbox;
  let mongoFindStub: sinon.SinonStub;
  let handleDbErrorStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    checkInitStub = sandbox
      .stub(DataManager.prototype, "checkInitialization")
      .callsFake(() => {});

    mongoFindStub = sandbox.stub(MongoDBManager, "findItemsInCollection");

    sandbox.stub(console, "error").callsFake(() => {});
    handleDbErrorStub = sandbox
      .stub(dataManagerHelpers, "handleDbError")
      .throws(new Error("fail"));
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("getInstance", () => {
    it("should return a DataManager instance", () => {
      const instance = DataManager.getInstance();
      expect(instance).toBeInstanceOf(DataManager);
    });

    it("should return the same instance on multiple calls", () => {
      const instance1 = DataManager.getInstance();
      const instance2 = DataManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should create a new instance after killInstance is called", () => {
      const instance1 = DataManager.getInstance();
      // kill the singleton
      // @ts-ignore
      DataManager.killInstance();
      const instance2 = DataManager.getInstance();
      expect(instance2).toBeInstanceOf(DataManager);
      expect(instance2).not.toBe(instance1);
    });
  });

  describe("killInstance", () => {
    it("should set DataManager.instance to null", () => {
      const instance1 = DataManager.getInstance();
      // @ts-ignore
      DataManager.killInstance();
      // @ts-ignore
      expect((DataManager as any).instance).toBeNull();
    });
  });

  describe("init", () => {

    it("should initialize DataManager and set isInitialized to true", async () => {
      const instance = DataManager.getInstance();
      // Stub db.init to resolve
      const dbInitStub = sandbox.stub(instance["db"], "init").resolves();
      // Stub addChangeListener
      const addChangeListenerStub = sandbox.stub(instance["changeListenerManager"], "addChangeListener").resolves();
      await instance.init();
      expect(instance.getInitializationStatus()).toBe(true);
      expect(dbInitStub.calledOnce).toBe(true);
      expect(addChangeListenerStub.calledOnce).toBe(true);
    });

    it("should handle error from db.init", async () => {
      // force init to get called in case the instance still exist (possibly from other tests)
      sandbox.stub(DataManager.prototype, "getInitializationStatus").returns(false);

      const instance = DataManager.getInstance();
      // Stub db.init to resolve
      const dbInitStub = sandbox.stub(instance["db"], "init").resolves();
      // Stub addChangeListener
      dbInitStub.rejects(new Error("Database initialization failed"));
      const addChangeListenerStub = sandbox.stub(instance["changeListenerManager"], "addChangeListener").resolves();
      await expect(instance.init()).rejects.toThrow();
      expect(dbInitStub.calledOnce).toBe(true);
      expect(addChangeListenerStub.calledOnce).toBe(false);
    });

    it("should not re-initialize if already initialized and dbType is MONGO", async () => {
      const instance = DataManager.getInstance();
      instance["isInitialized"] = true;
      const dbInitStub = sandbox.stub(instance["db"], "init");
      await instance.init();
      expect(dbInitStub.called).toBe(false);
    });

    it("should throw error if dbType is not MONGO", async () => {
      const instance = DataManager.getInstance();
      // @ts-ignore
      await expect(instance.init("NOT_MONGO" as any)).rejects.toThrow();
    });
  });

  describe("findItemsInCollection", () => {
    it("returns null if collection name is an empty string", async () => {
      const result = await DataManager.getInstance().findItemsInCollection("", {
        foo: "bar",
      });
      expect(result).toBeNull();
      expect(mongoFindStub.called).toBe(false);
    });

    it("returns null if criteria is undefined", async () => {
      const result = await DataManager.getInstance().findItemsInCollection(
        "users",
        undefined as any
      );
      expect(result).toBeNull();
      expect(mongoFindStub.called).toBe(false);
    });

    it("returns null if criteria is null", async () => {
      mongoFindStub.resolves(null);
      const result = await DataManager.getInstance().findItemsInCollection(
        "users",
        null as any
      );
      expect(result).toBeNull();
      expect(mongoFindStub.calledWith("users", null)).toBe(false);
    });

    it("returns documents if found", async () => {
      const docs = [{ _id: "1", name: "Alice" }];
      mongoFindStub.resolves(docs);
      const result = await DataManager.getInstance().findItemsInCollection(
        "users",
        { name: "Alice" }
      );
      expect(result).toEqual(docs);
      expect(mongoFindStub.calledWith("users", { name: "Alice" })).toBe(true);
    });

    it("returns empty array if no documents found", async () => {
      mongoFindStub.resolves([]);
      const result = await DataManager.getInstance().findItemsInCollection(
        "users",
        { name: "Charlie" }
      );
      expect(result).toEqual([]);
      expect(mongoFindStub.calledWith("users", { name: "Charlie" })).toBe(true);
    });

    it("throws an error if db operation fails", async () => {
      const msg = "fail";
      mongoFindStub.rejects(new Error(msg));
      await expect(
        DataManager.getInstance().findItemsInCollection("users", {
          name: "Error",
        })
      ).rejects.toThrow(msg);
    });

    it("returns null if MongoDBManager.findItemsInCollection returns null", async () => {
      mongoFindStub.resolves(null);
      const result = await DataManager.getInstance().findItemsInCollection(
        "users",
        { foo: "bar" }
      );
      expect(result).toBeNull();
      expect(mongoFindStub.calledWith("users", { foo: "bar" })).toBe(true);
    });

    it("returns array if MongoDBManager.findItemsInCollection returns array", async () => {
      const docs = [{ _id: "2", name: "Bob" }];
      mongoFindStub.resolves(docs);
      const result = await DataManager.getInstance().findItemsInCollection(
        "users",
        { name: "Bob" }
      );
      expect(result).toEqual(docs);
      expect(mongoFindStub.calledWith("users", { name: "Bob" })).toBe(true);
    });
  });
});


