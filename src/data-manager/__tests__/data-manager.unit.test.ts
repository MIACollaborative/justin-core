import DataManager from "../data-manager";
import { MongoDBManager } from "../mongo/mongo-data-manager";
import { handleDbError } from "../data-manager.helpers";
import sinon from "sinon";

// Use jest for assertions

describe("DataManager", () => {
  let dataManager: DataManager;
  let dataManagerInstanceStub: sinon.SinonStub;
  let dbStub: sinon.SinonStub;
  let checkInitStub: sinon.SinonStub;
  let emitSpy: sinon.SinonSpy;
  let sandbox: sinon.SinonSandbox;
  let mongoFindStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // version 2: from justin-heartsteps
    /*    
    const dataManagerStub = sandbox.createStubInstance(DataManager);
    dataManagerInstanceStub = sinon
      .stub(DataManager, "getInstance")
      .returns(dataManagerStub as any);
    */
    checkInitStub = sandbox
      .stub(DataManager.prototype, "checkInitialization")
      .callsFake(() => {});

    mongoFindStub = sandbox.stub(MongoDBManager, "findItemsInCollection");
    // version 1: I write it
    /*
    dataManager = DataManager.getInstance();
    
    checkInitStub = sinon
      .stub(dataManager, "checkInitialization")
      .callsFake(() => {});
    
    emitSpy = sinon.spy(dataManager, "emit");
    */
  });

  afterEach(() => {
    sandbox.restore();
    // Reset singleton for isolation
    // @ts-ignore
    //DataManager.instance = null;
  });

  it("should return true", async () => {
    expect(true).toBe(true);
  });

  describe("findItemsInCollection", () => {
    it("returns null if criteria is null", async () => {
      mongoFindStub.resolves(null);
      const result = await DataManager.getInstance().findItemsInCollection(
        "users",
        null as any
      );
      expect(result).toBeNull();
      expect(mongoFindStub.calledWith("users", null)).toBe(true);
    });

    /*
    it("returns documents if found", async () => {
      const docs = [{ _id: "1", name: "Alice" }, { _id: "2", name: "Bob" }];
      mongoFindStub.resolves(docs);
      const result = await DataManager.getInstance().findItemsInCollection("users", { name: "Alice" });
      expect(result).toEqual(docs);
      expect(mongoFindStub.calledWith("users", { name: "Alice" })).toBe(true);
    });

    it("returns empty array if no documents found", async () => {
      mongoFindStub.resolves([]);
      const result = await DataManager.getInstance().findItemsInCollection("users", { name: "Charlie" });
      expect(result).toEqual([]);
      expect(mongoFindStub.calledWith("users", { name: "Charlie" })).toBe(true);
    });

    it("handles errors and returns null", async () => {
      mongoFindStub.rejects(new Error("db error"));
      const result = await DataManager.getInstance().findItemsInCollection("users", { name: "Error" });
      expect(result).toBeNull();
    });
    */
  });
});
