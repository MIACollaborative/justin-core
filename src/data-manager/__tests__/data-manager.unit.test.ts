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

  beforeEach(() => {
    // version 2: from justin-heartsteps    
    const dataManagerStub = sinon.createStubInstance(DataManager);
    dataManagerInstanceStub = sinon
      .stub(DataManager, "getInstance")
      .returns(dataManagerStub as any);

    checkInitStub = sinon
      .stub(DataManager.prototype, "checkInitialization")
      .callsFake(() => {});

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
    sinon.restore();
    // Reset singleton for isolation
    // @ts-ignore
    DataManager.instance = null;
  });

  it("should return true", async () => {
    expect(true).toBe(true);
  });

  // findItemsInCollection
  describe("findItemsInCollection", () => {
    

  });
});
