import sinon from "sinon";
import { UserManager, TestingUserManager } from "../user-manager";
import { USERS } from "../../data-manager/data-manager.constants";
import DataManager from "../../data-manager/data-manager";
import { ChangeListenerManager } from "../../data-manager/change-listener.manager";
import { Log } from "../../logger/logger-manager";

const fakeUser = { id: "1", uniqueIdentifier: "abc", name: "Test User" };
const fakeUser2 = { id: "2", uniqueIdentifier: "def", name: "Another User" };

describe("UserManager", () => {
  let dmStub: any, clmStub: any, logInfoStub: any, logWarnStub: any;
  let findStub: sinon.SinonStub;
  let updateStub: sinon.SinonStub;
  let updateUniqueStub: sinon.SinonStub;
  let addStub = sinon.stub().resolves(fakeUser);

  beforeEach(() => {
    findStub = sinon.stub().resolves([fakeUser]);
    updateStub = sinon.stub().resolves(fakeUser);
    updateUniqueStub = sinon.stub().resolves(fakeUser);
    dmStub = sinon.stub(DataManager, "getInstance").returns({
      checkInitialization: sinon.stub().resolves(),
      getInitializationStatus: sinon.stub().returns(true),
      init: sinon.stub().resolves(),
      addItemToCollection: addStub,
      removeItemFromCollection: sinon.stub().resolves(),
      getAllInCollection: sinon.stub().resolves([fakeUser, fakeUser2]),
      updateItemInCollectionById: updateStub,
      clearCollection: sinon.stub().resolves(),
      findItemsInCollectionByCriteria: findStub,
      updateItemInCollectionByUniquePropertyValue: updateUniqueStub,
    } as any);
    clmStub = sinon.stub(ChangeListenerManager, "getInstance").returns({
      addChangeListener: sinon.stub(),
      removeChangeListener: sinon.stub(),
    } as any);
    logInfoStub = sinon.stub(Log, "info");
    logWarnStub = sinon.stub(Log, "warn");
    // Clear cache before each test
    TestingUserManager._users.clear();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("doesUserUniqueIdentifierExist", () => {
    it("returns true when uniqueIdentifier exists in cache", () => {
      const result = UserManager.doesUserUniqueIdentifierExist({
        uniqueIdentifier: "abc",
      });
      expect(result.result).toBe(true);
    });
    it("returns false when uniqueIdentifier is missing from input", () => {
      const result = UserManager.doesUserUniqueIdentifierExist({});
      expect(result.result).toBe(false);
    });
    it("returns false when input is null", () => {
      // @ts-ignore
      const result = UserManager.doesUserUniqueIdentifierExist(null);
      expect(result.result).toBe(false);
    });
    it("returns false when input is undefined", () => {
      // @ts-ignore
      const result = UserManager.doesUserUniqueIdentifierExist(undefined);
      expect(result.result).toBe(false);
    });
    it("returns false when uniqueIdentifier is empty string", () => {
      const result = UserManager.doesUserUniqueIdentifierExist({
        uniqueIdentifier: "",
      });
      expect(result.result).toBe(false);
    });
  });

  describe("isUserUniqueIdentifierNew", () => {
    it("returns false and message if identifier already exists", async () => {
      findStub.resolves([fakeUser]);
      const result = await UserManager.isUserUniqueIdentifierNew("abc");
      expect(result.result).toBe(false);
      expect(result.message).toMatch(/already exists/);
    });
    it("returns true and message if identifier is new", async () => {
      findStub.resolves([]);
      const result = await UserManager.isUserUniqueIdentifierNew("new-uid");
      expect(result.result).toBe(true);
      expect(result.message).toMatch(/valid/);
    });
    it("returns false and message if identifier is null", async () => {
      // @ts-ignore
      const result = await UserManager.isUserUniqueIdentifierNew(null);
      expect(result.result).toBe(false);
      expect(result.message).toMatch(/Invalid/);
    });
    it("returns false and message if identifier is undefined", async () => {
      // @ts-ignore
      const result = await UserManager.isUserUniqueIdentifierNew(undefined);
      expect(result.result).toBe(false);
      expect(result.message).toMatch(/Invalid/);
    });
    it("returns false and message if identifier is empty string", async () => {
      const result = await UserManager.isUserUniqueIdentifierNew("");
      expect(result.result).toBe(false);
      expect(result.message).toMatch(/Invalid/);
    });
  });

  it("should modify user unique identifier", async () => {
    updateStub.resolves({ ...fakeUser, uniqueIdentifier: "new-uid" });
    const result = await UserManager.modifyUserUniqueIdentifier("1", "new-uid");
    expect(
      updateStub.calledOnceWith(USERS, "1", { uniqueIdentifier: "new-uid" })
    ).toBe(true);
    expect(result).toEqual({ ...fakeUser, uniqueIdentifier: "new-uid" });
  });

  it("should return null if attempting to update uniqueIdentifier through updateUserByUniqueIdentifier", async () => {
    updateUniqueStub.callsFake((_col, _prop, _val, updateData) => {
      if ("uniqueIdentifier" in updateData) {
        return null;
      }
      return { ...fakeUser, ...updateData };
    });
    findStub.resolves([fakeUser]);
    const result = await UserManager.updateUserByUniqueIdentifier("abc", {
      name: "Updated Name",
      uniqueIdentifier: "should-not-update",
    });
    expect(result).toBeNull();
    expect(updateUniqueStub.notCalled).toBe(true);
    expect(findStub.notCalled).toBe(true);
  });

  it("should update user by unique identifier when user exists", async () => {
    updateUniqueStub.resolves({ ...fakeUser, name: "Updated Name" });
    const result = await UserManager.updateUserByUniqueIdentifier("abc", {
      name: "Updated Name",
    });
    expect(
      updateUniqueStub.calledOnceWith(USERS, "uniqueIdentifier", "abc", {
        name: "Updated Name",
      })
    ).toBe(true);
    expect(result).toEqual({ ...fakeUser, name: "Updated Name" });
  });

  it("should return null and log warning if user not found by unique identifier", async () => {
    findStub.resolves([]);
    const result = await UserManager.updateUserByUniqueIdentifier("notfound", {
      name: "No User",
    });
    expect(
      findStub.calledOnceWith(USERS, { uniqueIdentifier: "notfound" })
    ).toBe(true);
    expect(updateUniqueStub.notCalled).toBe(true);
    expect(logWarnStub.called).toBe(true);
    expect(logWarnStub.calledWithMatch(/not found/)).toBe(true);
    expect(result).toBeNull();
  });

  it("should add users to database when all uniqueIdentifiers are valid and new", async () => {
    findStub.resolves([]);
    const users = [fakeUser, fakeUser2];
    addStub.onFirstCall().resolves(fakeUser);
    addStub.onSecondCall().resolves(fakeUser2);
    const result = await UserManager.addUsersToDatabase(users);
    expect(addStub.callCount).toBe(2);
    expect(result[0]).toEqual(fakeUser);
    expect(result[1]).toEqual(fakeUser2);
  });

  it("should throw error if any user uniqueIdentifier already exists", async () => {
    // Arrange
    findStub.resolves([]);
    findStub.onFirstCall().resolves([fakeUser]);
    findStub.onSecondCall().resolves([]);

    const users = [fakeUser, fakeUser2];
    // Act & Assert
    await expect(UserManager.addUsersToDatabase(users)).rejects.toThrow(
      /already exists/
    );
  });

  it("should throw error if users array is empty", async () => {
    await expect(UserManager.addUsersToDatabase([])).rejects.toThrow(
      /No users provided/
    );
  });
});
