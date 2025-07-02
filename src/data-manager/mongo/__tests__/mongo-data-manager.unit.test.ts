import * as mongoDB from "mongodb";
import sinon from "sinon";
import { MongoDBManager } from "../mongo-data-manager";
import * as dataManagerHelpers from "../../data-manager.helpers";

describe("MongoDBManager.findItemsByCriteriaInCollection", () => {
  let findStub: sinon.SinonStub;
  let toArrayStub: sinon.SinonStub;
  let ensureInitializedStub: sinon.SinonStub;
  let handleDbErrorStub: sinon.SinonStub;
  let fakeCollection: any;
  let fakeDb: any;
  let mdStub: sinon.SinonStub;

  beforeEach(() => {
    ensureInitializedStub = sinon
      .stub(MongoDBManager, "ensureInitialized")
      .callsFake(() => {});

    handleDbErrorStub = sinon
      .stub(dataManagerHelpers, "handleDbError")
      .throws(new Error("fail"));

    toArrayStub = sinon.stub();
    findStub = sinon.stub().returns({ toArray: toArrayStub });
    fakeCollection = {
      find: findStub,
      updateOne: () => {},
      findOne: () => {},
      toArray: () => [],
    };
    fakeDb = { collection: (_collectionName: string) => fakeCollection };

    mdStub = sinon.stub(MongoDBManager, "getDatabaseInstance").returns({
      collection: () => fakeCollection,
    } as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("returns null if criteria is null", async () => {
    const result = await MongoDBManager.findItemsByCriteriaInCollection(
      "users",
      null
    );
    expect(result).toBeNull();
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
      MongoDBManager.findItemsByCriteriaInCollection("users", { name: "Alice" })
    ).rejects.toThrow("fail");
    expect(handleDbErrorStub.called).toBe(true);
    expect(findStub.calledWith({ name: "Alice" })).toBe(true);
  });
});

describe("MongoDBManager.updateItemInCollectionByUniqueProperty", () => {
  let findStub: sinon.SinonStub;
  let toArrayStub: sinon.SinonStub;
  let updateOneStub: sinon.SinonStub;
  let findOneStub: sinon.SinonStub;
  let ensureInitializedStub: sinon.SinonStub;
  let handleDbErrorStub: sinon.SinonStub;
  let logWarnStub: sinon.SinonStub;
  let fakeCollection: any;
  let fakeDb: any;
  let mdStub: sinon.SinonStub;
  let transformIdStub: sinon.SinonStub;

  beforeEach(() => {
    ensureInitializedStub = sinon
      .stub(MongoDBManager, "ensureInitialized")
      .callsFake(() => {});

    handleDbErrorStub = sinon
      .stub(dataManagerHelpers, "handleDbError")
      .throws(new Error("fail"));

    toArrayStub = sinon.stub();
    updateOneStub = sinon.stub();
    findOneStub = sinon.stub();
    findStub = sinon.stub().returns({ toArray: toArrayStub });
    fakeCollection = {
      find: findStub,
      updateOne: updateOneStub,
      findOne: findOneStub,
      toArray: () => [],
    };
    fakeDb = { collection: (_collectionName: string) => fakeCollection };

    mdStub = sinon.stub(MongoDBManager, "getDatabaseInstance").returns({
      collection: () => fakeCollection,
    } as any);

    logWarnStub = sinon.stub(console, "warn");
    transformIdStub = sinon.stub().callsFake((doc: any) => doc);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("returns null if multiple items found", async () => {
    toArrayStub.resolves([{}, {}]);
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty(
      "users",
      "email",
      "a@b.com",
      { name: "A" }
    );
    expect(result).toBeNull();
  });

  it("updates and returns transformed item if one item found", async () => {
    toArrayStub.resolves([{ email: "a@b.com", id: "123" }]);
    updateOneStub.resolves({ matchedCount: 1, modifiedCount: 1 });
    const updatedDoc = { email: "a@b.com", name: "A", _id: "123" };
    const transformedDoc = { email: "a@b.com", name: "A", id: "123" };
    findOneStub.resolves(updatedDoc);
    transformIdStub.returns(transformedDoc);
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty(
      "users",
      "email",
      "a@b.com",
      { name: "A" }
    );
    expect(result).toEqual(transformedDoc);
  });

  it("handles error and calls handleDbError", async () => {
    toArrayStub.rejects(new Error("fail"));
    await expect(
      MongoDBManager.updateItemInCollectionByUniqueProperty(
        "users",
        "email",
        "fail@b.com",
        { name: "Fail" }
      )
    ).rejects.toThrow("fail");
    expect(handleDbErrorStub.called).toBe(true);
  });

  
  it("returns null if no items found", async () => {
    toArrayStub.resolves([]);
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty(
      "users",
      "email",
      "notfound@b.com",
      { name: "A" }
    );
    expect(result).toBeNull();
  });

  /*
  it("returns null if updateOne does not match or modify", async () => {
    toArrayStub.resolves([{ email: "a@b.com" }]);
    updateOneStub.resolves({ matchedCount: 0, modifiedCount: 0 });
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty(
      "users",
      "email",
      "a@b.com",
      { name: "A" }
    );
    expect(result).toBeNull();
  });

  it("returns null if findOne returns null after update", async () => {
    toArrayStub.resolves([{ email: "a@b.com" }]);
    updateOneStub.resolves({ matchedCount: 1, modifiedCount: 1 });
    findOneStub.resolves(null);
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty(
      "users",
      "email",
      "a@b.com",
      { name: "A" }
    );
    expect(result).toBeNull();
  });

  it("returns null if transformId returns null", async () => {
    toArrayStub.resolves([{ email: "a@b.com" }]);
    updateOneStub.resolves({ matchedCount: 1, modifiedCount: 1 });
    const updatedDoc = { email: "a@b.com", name: "A", _id: "123" };
    findOneStub.resolves(updatedDoc);
    transformIdStub.returns(null);
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty(
      "users",
      "email",
      "a@b.com",
      { name: "A" }
    );
    expect(result).toBeNull();
  });

  it("handles error thrown in updateOne", async () => {
    toArrayStub.resolves([{ email: "a@b.com" }]);
    updateOneStub.rejects(new Error("fail"));
    await expect(
      MongoDBManager.updateItemInCollectionByUniqueProperty(
        "users",
        "email",
        "a@b.com",
        { name: "A" }
      )
    ).rejects.toThrow("fail");
  });

  it("handles error thrown in findOne", async () => {
    toArrayStub.resolves([{ email: "a@b.com" }]);
    updateOneStub.resolves({ matchedCount: 1, modifiedCount: 1 });
    findOneStub.rejects(new Error("fail"));
    await expect(
      MongoDBManager.updateItemInCollectionByUniqueProperty(
        "users",
        "email",
        "a@b.com",
        { name: "A" }
      )
    ).rejects.toThrow("fail");
  });

  it("returns null if unique property value is undefined", async () => {
    toArrayStub.resolves([]);
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty(
      "users",
      "email",
      undefined as any,
      { name: "A" }
    );
    expect(result).toBeNull();
  });

  it("returns null if unique property value is null", async () => {
    toArrayStub.resolves([]);
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty(
      "users",
      "email",
      null as any,
      { name: "A" }
    );
    expect(result).toBeNull();
  });

  */
});
