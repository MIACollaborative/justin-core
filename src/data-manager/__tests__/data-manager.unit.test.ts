import DataManager from "../data-manager";
import { MongoDBManager } from "../mongo/mongo-data-manager";
import * as dataManagerHelpers from "../data-manager.helpers";
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
  let handleDbErrorStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    checkInitStub = sandbox
      .stub(DataManager.prototype, "checkInitialization")
      .callsFake(() => {});

    mongoFindStub = sandbox.stub(MongoDBManager, "findItemsInCollection");

    jest.spyOn(console, "error").mockImplementation(() => {});
    handleDbErrorStub = sandbox
      .stub(dataManagerHelpers, "handleDbError")
      .throws(new Error("fail"));
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should return true", async () => {
    expect(true).toBe(true);
  });

  describe("findItemsInCollection", () => {
    it("returns null if collection name is falsy", async () => {
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
