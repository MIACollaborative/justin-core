import DataManager from "../data-manager";
import { MongoDBManager } from "../mongo/mongo-data-manager";
import { handleDbError } from "../data-manager.helpers";
import sinon from "sinon";

// Use jest for assertions

describe("DataManager", () => {
  let dataManager: DataManager;
  let dbStub: sinon.SinonStub;
  let checkInitStub: sinon.SinonStub;
  let emitSpy: sinon.SinonSpy;

  beforeEach(() => {
    dataManager = DataManager.getInstance();
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

  it("should return true", async () => {
    expect(true).toBe(true);
  });
});
