import DataManager from "../data-manager";
import { MongoDBManager } from "../mongo/mongo-data-manager";
import { handleDbError } from "../data-manager.helpers";
import sinon from "sinon";

// Use jest for assertions

describe("DataManager.updateItemInCollectionByUniquePropertyValue", () => {
  let dataManager: DataManager;
  let dbStub: sinon.SinonStub;
  let checkInitStub: sinon.SinonStub;
  let emitSpy: sinon.SinonSpy;

  beforeEach(() => {
    dataManager = DataManager.getInstance();
    dbStub = sinon.stub(
      MongoDBManager,
      "updateItemInCollectionByUniqueProperty"
    );
    checkInitStub = sinon
      .stub(dataManager, "checkInitialization")
      .callsFake(() => {});
    emitSpy = sinon.spy(dataManager, "emit");
  });

  afterEach(() => {
    sinon.restore();
    // Reset singleton for isolation
    // @ts-ignore
    DataManager.instance = null;
  });

  it("should update item and emit userUpdated for USERS collection", async () => {
    const updated = { name: "John" };
    dbStub.resolves(updated);
    const result =
      await dataManager.updateItemInCollectionByUniquePropertyValue(
        "USERS",
        "email",
        "john@example.com",
        { name: "John" }
      );
    expect(result).toBe(updated);
    expect(
      emitSpy.calledWith("userUpdated", {
        email: "john@example.com",
        name: "John",
      })
    ).toBe(true);
  });

  it("should update item and not emit userUpdated for non-USERS collection", async () => {
    const updated = { foo: "bar" };
    dbStub.resolves(updated);
    const result =
      await dataManager.updateItemInCollectionByUniquePropertyValue(
        "OTHER",
        "id",
        "123",
        { foo: "bar" }
      );
    expect(result).toBe(updated);
    expect(emitSpy.calledWith("userUpdated")).toBe(false);
  });

  it("should handle error and call handleDbError", async () => {
    const error = new Error("fail");
    dbStub.rejects(error);
    const handleDbErrorStub = sinon
      .stub(require("../data-manager.helpers"), "handleDbError")
      .returns(null);
    const result =
      await dataManager.updateItemInCollectionByUniquePropertyValue(
        "USERS",
        "email",
        "fail@example.com",
        { name: "Fail" }
      );
    expect(handleDbErrorStub.called).toBe(true);
    expect(result).toBeNull();
    handleDbErrorStub.restore();
  });
  it("should call checkInitialization before updating", async () => {
    const updated = { name: "Jane" };
    dbStub.resolves(updated);
    await dataManager.updateItemInCollectionByUniquePropertyValue(
      "USERS",
      "email",
      "jane@example.com",
      { name: "Jane" }
    );
    expect(checkInitStub.called).toBe(true);
  });
});
