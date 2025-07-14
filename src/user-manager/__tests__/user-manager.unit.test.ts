import sinon from "sinon";
import { UserManager, TestingUserManager } from "../user-manager";
import { USERS } from "../../data-manager/data-manager.constants";
import DataManager from "../../data-manager/data-manager";
import * as dataManagerHelpers from "../../data-manager/data-manager.helpers";
import { Log } from "../../logger/logger-manager";

const fakeUser = { id: "1", uniqueIdentifier: "abc", name: "Test User" };
const fakeUser2 = { id: "2", uniqueIdentifier: "def", name: "Another User" };

describe("UserManager", () => {
  let logInfoStub: any, logWarnStub: any;
  let findStub: sinon.SinonStub;
  let updateStub: sinon.SinonStub;
  let addStub: sinon.SinonStub;
  let handleDbErrorStub: sinon.SinonStub;
  let sandbox: sinon.SinonSandbox;
  let getInitializationStatusStub: sinon.SinonStub;
  let checkInitializationStub: sinon.SinonStub;
  let remoteItemFromCollectionStub: sinon.SinonStub;
  let getAllInCollectionStub: sinon.SinonStub;
  let initStub: sinon.SinonStub;
  let clearCollectionStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    handleDbErrorStub = sandbox
      .stub(dataManagerHelpers, "handleDbError")
      .throws(new Error("fail"));

    addStub = sandbox
      .stub(DataManager.prototype, "addItemToCollection")
      .resolves(fakeUser);
    findStub = sandbox
      .stub(DataManager.prototype, "findItemsInCollection")
      .resolves([fakeUser]);
    updateStub = sandbox
      .stub(DataManager.prototype, "updateItemByIdInCollection")
      .resolves(fakeUser);
    getInitializationStatusStub = sandbox
      .stub(DataManager.prototype, "getInitializationStatus")
      .returns(true);
    checkInitializationStub = sandbox
      .stub(DataManager.prototype, "checkInitialization")
      .resolves();
    remoteItemFromCollectionStub = sandbox
      .stub(DataManager.prototype, "removeItemFromCollection")
      .resolves();
    getAllInCollectionStub = sandbox
      .stub(DataManager.prototype, "getAllInCollection")
      .resolves([fakeUser, fakeUser2]);
    initStub = sandbox.stub(DataManager.prototype, "init").resolves();
    clearCollectionStub = sandbox
      .stub(DataManager.prototype, "clearCollection")
      .resolves();

    logInfoStub = sandbox.stub(Log, "info");
    logWarnStub = sandbox.stub(Log, "warn");
    // Clear cache before each test tf  g
    TestingUserManager._users.clear();
  });

  afterEach(() => {
    sandbox.restore();
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

    it("returns false when input is an object with unrelated properties", () => {
      const result = UserManager.doesUserUniqueIdentifierExist({
        foo: "bar",
      });
      expect(result.result).toBe(false);
    });

    it("returns false when input is an empty array", () => {
      // @ts-ignore
      const result = UserManager.doesUserUniqueIdentifierExist([]);
      expect(result.result).toBe(false);
    });

    it("returns false when input is a string", () => {
      // @ts-ignore
      const result = UserManager.doesUserUniqueIdentifierExist("abc");
      expect(result.result).toBe(false);
    });

    it("returns false when input is a number", () => {
      // @ts-ignore
      const result = UserManager.doesUserUniqueIdentifierExist(123);
      expect(result.result).toBe(false);
    });

    it("returns false when input is a boolean", () => {
      // @ts-ignore
      const result = UserManager.doesUserUniqueIdentifierExist(true);
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

  describe("modifyUserUniqueIdentifier", () => {
    it("should update the user's unique identifier and return the updated user", async () => {
      updateStub.resolves({ ...fakeUser, uniqueIdentifier: "new-uid" });
      const result = await UserManager.modifyUserUniqueIdentifier(
        "1",
        "new-uid"
      );
      expect(
        updateStub.calledOnceWith(USERS, "1", { uniqueIdentifier: "new-uid" })
      ).toBe(true);
      expect(result).toEqual({ ...fakeUser, uniqueIdentifier: "new-uid" });
    });

    it("should return null if updateItemByIdInCollection returns null", async () => {
      updateStub.resolves(null);
      const result = await UserManager.modifyUserUniqueIdentifier(
        "1",
        "new-uid"
      );
      expect(result).toBeNull();
    });

    it("should throw if updateItemByIdInCollection throws", async () => {
      updateStub.rejects(new Error("fail"));
      await expect(
        UserManager.modifyUserUniqueIdentifier("1", "new-uid")
      ).rejects.toThrow("fail");
    });

    it("should throw if userId is null", async () => {
      // @ts-ignore
      await expect(UserManager.modifyUserUniqueIdentifier(null, "new-uid")
      ).rejects.toThrow();
    });

    it("should throw if userId is undefined", async () => {
      // @ts-ignore
      await expect(UserManager.modifyUserUniqueIdentifier(undefined, "new-uid")
      ).rejects.toThrow();
    });

    it("should throw if newUniqueIdentifier is null", async () => {
      // @ts-ignore
      await expect(UserManager.modifyUserUniqueIdentifier("1", null)
      ).rejects.toThrow();
    });

    it("should throw if newUniqueIdentifier is undefined", async () => {
      // @ts-ignore
      await expect(UserManager.modifyUserUniqueIdentifier("1", undefined)
      ).rejects.toThrow();
    });

    it("should throw if newUniqueIdentifier is empty string", async () => {
      await expect(UserManager.modifyUserUniqueIdentifier("1", "")
      ).rejects.toThrow();
    });
  });

  describe("updateUserByUniqueIdentifier", () => {
    it("should throw if uniqueIdentifier is null", async () => {
      // @ts-ignore
      await expect(UserManager.updateUserByUniqueIdentifier(null, { name: "X" })
      ).rejects.toThrow();
    });

    it("should throw if uniqueIdentifier is undefined", async () => {
      // @ts-ignore
      await expect(UserManager.updateUserByUniqueIdentifier(undefined, { name: "X" })
      ).rejects.toThrow();
    });

    it("should throw if updateData is null", async () => {
      // @ts-ignore
      await expect(UserManager.updateUserByUniqueIdentifier("abc", null)
      ).rejects.toThrow();
    });

    it("should throw if updateData is undefined", async () => {
      // @ts-ignore
      await expect(UserManager.updateUserByUniqueIdentifier("abc", undefined)
      ).rejects.toThrow();
    });

    it("should throw if updateData is empty object", async () => {
      await expect(
        UserManager.updateUserByUniqueIdentifier("abc", {})
      ).rejects.toThrow();
    });
    it("should throw error if attempting to update uniqueIdentifier", async () => {
      expect(
        UserManager.updateUserByUniqueIdentifier("abc", {
          name: "Updated Name",
          uniqueIdentifier: "should-not-update",
        })
      ).rejects.toThrow(
        "Cannot update uniqueIdentifier field using updateUserByUniqueIdentifier. Use modifyUserUniqueIdentifier instead."
      );
    });

    it("should update user by unique identifier when user exists", async () => {
      const updateData = { name: "Updated Name" };
      updateStub.resolves({ ...fakeUser, ...updateData });
      const result = await UserManager.updateUserByUniqueIdentifier(
        fakeUser.id,
        {
          name: "Updated Name",
        }
      );
      expect(updateStub.calledOnceWith(USERS, fakeUser.id, updateData)).toBe(
        true
      );
      expect(result).toEqual({ ...fakeUser, name: "Updated Name" });
    });

    it("should throw error if user not found by unique identifier", async () => {
      findStub.resolves([]);
      await expect(
        UserManager.updateUserByUniqueIdentifier("notfound", {
          name: "No User",
        })
      ).rejects.toThrow("User with uniqueIdentifier: notfound not found.");
    });

    it("should update user with unrelated fields", async () => {
      const updateData = { foo: "bar" };
      updateStub.resolves({ ...fakeUser, ...updateData });
      const result = await UserManager.updateUserByUniqueIdentifier(
        fakeUser.id,
        updateData
      );
      expect(updateStub.calledOnceWith(USERS, fakeUser.id, updateData)).toBe(
        true
      );
      expect(result).toEqual({ ...fakeUser, foo: "bar" });
    });
  });

  describe("addUsersToDatabase", () => {
    it("should throw error if users is not an array", async () => {
      // @ts-ignore
      await expect(UserManager.addUsersToDatabase(null)).rejects.toThrow(/No users provided/);
      // @ts-ignore
      await expect(UserManager.addUsersToDatabase(undefined)).rejects.toThrow(/No users provided/);
      // @ts-ignore
      await expect(UserManager.addUsersToDatabase("not-an-array")).rejects.toThrow(/No users provided/);
      // @ts-ignore
      await expect(UserManager.addUsersToDatabase(123)).rejects.toThrow(/No users provided/);
      // @ts-ignore
      await expect(UserManager.addUsersToDatabase({})).rejects.toThrow(/No users provided/);
    });


    it("should add users to database when all uniqueIdentifiers are valid and new", async () => {
      findStub.resolves([]);
      addStub.onFirstCall().resolves(fakeUser);
      addStub.onSecondCall().resolves(fakeUser2);
      const users = [fakeUser, fakeUser2];
      const result = await UserManager.addUsersToDatabase(users);
      expect(addStub.callCount).toBe(2);
      expect(result[0]).toEqual(fakeUser);
      expect(result[1]).toEqual(fakeUser2);
    });

    it("should skip users that are null or not objects and log warning", async () => {
      findStub.resolves([]);
      addStub.resolves(fakeUser2);
      const users = [null, undefined, 123, "string", fakeUser2];
      const result = await UserManager.addUsersToDatabase(users as any);
      expect(logWarnStub.callCount).toBeGreaterThanOrEqual(1);
      expect(addStub.callCount).toBe(1);
      expect(result).toEqual([fakeUser2]);
    });

    it("should add only users with new uniqueIdentifiers", async () => {
      findStub.onFirstCall().resolves([fakeUser]); // already exists
      findStub.onSecondCall().resolves([]); // new
      addStub.onFirstCall().resolves(fakeUser2);
      const users = [fakeUser, fakeUser2];
      const result = await UserManager.addUsersToDatabase(users);
      expect(result).toEqual([fakeUser2]);
      expect(addStub.callCount).toBe(1);
    });

    it("should log warning and skip adding a user if that user's uniqueIdentifier already exists", async () => {
      findStub.onFirstCall().resolves([fakeUser]);
      findStub.onSecondCall().resolves([]);
      addStub.onFirstCall().resolves(fakeUser2);
      const users = [fakeUser, fakeUser2];
      await expect(UserManager.addUsersToDatabase(users)).resolves.toEqual([
        fakeUser2,
      ]);
      expect(logWarnStub.called).toBe(true);
      expect(logWarnStub.calledWithMatch(/already exists/)).toBe(true);
      expect(addStub.callCount).toBe(1);
      expect(addStub.firstCall.args[0]).toEqual("users");
      expect(addStub.firstCall.args[1]).toEqual(fakeUser2);
    });

    it("should skip users without uniqueIdentifier and log warning", async () => {
      findStub.resolves([]);
      const userWithoutUid = { id: "3", name: "No UID" };
      addStub.resolves(fakeUser2);
      const users = [userWithoutUid, fakeUser2];
      const result = await UserManager.addUsersToDatabase(users);
      expect(logWarnStub.called).toBe(true);
      expect(logWarnStub.calledWithMatch(/UniqueIdentifier is missing/)).toBe(
        true
      );
      expect(addStub.callCount).toBe(1);
      expect(result).toEqual([fakeUser2]);
    });

    it("should skip users with empty uniqueIdentifier and log warning", async () => {
      findStub.resolves([]);
      const userWithEmptyUid = {
        id: "4",
        uniqueIdentifier: "",
        name: "Empty UID",
      };
      addStub.resolves(fakeUser2);
      const users = [userWithEmptyUid, fakeUser2];
      const result = await UserManager.addUsersToDatabase(users);
      expect(logWarnStub.called).toBe(true);
      expect(logWarnStub.calledWithMatch(/UniqueIdentifier is missing/)).toBe(
        true
      );
      expect(addStub.callCount).toBe(1);
      expect(result).toEqual([fakeUser2]);
    });

    it("should throw error if users array is empty", async () => {
      await expect(UserManager.addUsersToDatabase([])).rejects.toThrow(
        /No users provided/
      );
    });

    it("should throw error if addItemToCollection throws for any user", async () => {
      findStub.resolves([]);
      addStub.onFirstCall().resolves(fakeUser);
      addStub.onSecondCall().rejects(new Error("fail"));
      const users = [fakeUser, fakeUser2];
      await expect(UserManager.addUsersToDatabase(users)).rejects.toThrow(
        "fail"
      );
      expect(addStub.callCount).toBe(2);
    });

    it("should handle mix of valid, duplicate, and invalid users", async () => {
      // To Do: leave brief comment after some lines to improve readability. Can removed if not needed.
      findStub.onFirstCall().resolves([fakeUser]); // duplicate
      findStub.onSecondCall().resolves([]); // valid
      findStub.onThirdCall().resolves([]); // valid
      addStub.onFirstCall().resolves(fakeUser2);
      const fakeUser3 = { id: "3", uniqueIdentifier: "ghi", name: "Third User" };
      addStub
        .onSecondCall()
        .resolves(fakeUser3);
      const users = [
        fakeUser, // duplicate
        fakeUser2, // valid
        fakeUser3, // valid
        {}, // invalid
        null, // invalid
      ];
      const result = await UserManager.addUsersToDatabase(users as any);
      expect(result.length).toBe(2);
      expect(addStub.callCount).toBe(2);
      expect(logWarnStub.callCount).toBeGreaterThanOrEqual(2);
    });
  });
});
