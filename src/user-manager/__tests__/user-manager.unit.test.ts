import sinon from "sinon";
import { UserManager, TestingUserManager } from "../user-manager";
import { USERS } from "../../data-manager/data-manager.constants";
import DataManager from "../../data-manager/data-manager";
import * as dataManagerHelpers from "../../data-manager/data-manager.helpers";
import { Log } from "../../logger/logger-manager";
import { NewUserRecord } from "../user.type";
import { ChangeListenerManager } from "../../data-manager/change-listener.manager";

const initialUserRecord1 = { uniqueIdentifier: "abc", initialAttributes: { name: "Test User" } };
const initialUserRecord2 = { uniqueIdentifier: "def", initialAttributes: { name: "Another User" } };

const jUser1 = {id: initialUserRecord1.uniqueIdentifier, uniqueIdentifier: initialUserRecord1.uniqueIdentifier, attributes: initialUserRecord1.initialAttributes};
const jUser2 = {id: initialUserRecord2.uniqueIdentifier, uniqueIdentifier: initialUserRecord2.uniqueIdentifier, attributes: initialUserRecord2.initialAttributes};

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
  let addChangeListenerStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    handleDbErrorStub = sandbox
      .stub(dataManagerHelpers, "handleDbError")
      .throws(new Error("fail"));

    addStub = sandbox
      .stub(DataManager.prototype, "addItemToCollection")
      .resolves(initialUserRecord1);
    findStub = sandbox
      .stub(DataManager.prototype, "findItemsInCollection")
      .resolves([initialUserRecord1]);
    updateStub = sandbox
      .stub(DataManager.prototype, "updateItemByIdInCollection")
      .resolves(initialUserRecord1);
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
      .resolves([initialUserRecord1, initialUserRecord2]);
    initStub = sandbox.stub(DataManager.prototype, "init").resolves();

    clearCollectionStub = sandbox
      .stub(DataManager.prototype, "clearCollection")
      .resolves();

    // Stubs for ChangeListeners
    addChangeListenerStub = sandbox.stub(ChangeListenerManager.prototype, "addChangeListener").resolves();


    logInfoStub = sandbox.stub(Log, "info");
    logWarnStub = sandbox.stub(Log, "warn");
    // Clear cache before each test tf  g
    TestingUserManager._users.clear();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("init", () => {
    it("should call DataManager.init and populate _users cache", async () => {
      getAllInCollectionStub.resolves([jUser1, jUser2]);
      await TestingUserManager.init();
      expect(initStub.calledOnce).toBe(true);
      expect(getAllInCollectionStub.calledOnceWith(USERS)).toBe(true);
      expect(TestingUserManager._users.size).toBe(2);
      expect(TestingUserManager._users.get(jUser1.id)).toBeDefined();
      expect(TestingUserManager._users.get(jUser2.id)).toBeDefined();
    });
    
    it("should clear _users cache before populating", async () => {
      TestingUserManager._users.set(jUser1.id, jUser1);
      getAllInCollectionStub.resolves([jUser2]);
      await TestingUserManager.init();
      expect(TestingUserManager._users.size).toBe(1);
      expect(TestingUserManager._users.get(jUser2.id)).toBeDefined();
      expect(TestingUserManager._users.get(jUser1.id)).toBeUndefined();
    });
    
    it("should throw if DataManager.init throws", async () => {
      initStub.rejects(new Error("init failed"));
      await expect(TestingUserManager.init()).rejects.toThrow("init failed");
    });

    it("should throw if getAllInCollection throws", async () => {
      getAllInCollectionStub.rejects(new Error("db error"));
      await expect(TestingUserManager.init()).rejects.toThrow("db error");
    });

    it("should call setupChangeListeners", async() => {
      const setupChangeListenerStub = sandbox.stub(TestingUserManager, "setupChangeListeners").resolves();
      const refreshCacheStub = sandbox.stub(TestingUserManager, "refreshCache").resolves();
      await TestingUserManager.init();

      expect(initStub.called).toBe(true); // this pass
      expect(refreshCacheStub.called).toBe(true); // this doesn't pass, why?
      expect(setupChangeListenerStub.called).toBe(true); // this doesn't pass, why?
    });
  });




  describe("isIdentifierUnique", () => {
    it("returns false and message if identifier already exists", async () => {
      findStub.resolves([initialUserRecord1]);
      TestingUserManager._users.set(jUser1.id, jUser1);
      const result = await TestingUserManager.isIdentifierUnique("abc");
      expect(result).toBe(false);
    });
    it("returns true and message if identifier is new", async () => {
      findStub.resolves([]);
      const result = await TestingUserManager.isIdentifierUnique("new-uid");
      expect(result).toBe(true);
    });
    it("throw an error if identifier is null", async () => {
      // @ts-ignore
      await expect(() => TestingUserManager.isIdentifierUnique(null)).rejects.toThrow();
    });
    it("throw an error if identifier is undefined", async () => {
      // @ts-ignore
      await expect(() => TestingUserManager.isIdentifierUnique(undefined)).rejects.toThrow();
    });
    it("throw an error if identifier is empty string", async () => {
      await expect(() => TestingUserManager.isIdentifierUnique("")).rejects.toThrow();
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
      TestingUserManager._users.set(jUser1.id, jUser1);
      const updateData = { name: "Updated Name" };
      updateStub.resolves({ ...jUser1, attributes: { ...jUser1.attributes, ...updateData } });
      const result = await UserManager.updateUserByUniqueIdentifier(
        initialUserRecord1.uniqueIdentifier,
        {
          name: "Updated Name",
        }
      );
      expect(updateStub.calledOnceWith(USERS, initialUserRecord1.uniqueIdentifier, updateData)).toBe(
        true
      );
      expect(result).toEqual({ ...jUser1, attributes: { ...jUser1.attributes, ...updateData } });
    });

    it("should throw error if user not found by unique identifier", async () => {
      //TestingUserManager._users.set(jUser1.id, jUser1);
      await expect(
        UserManager.updateUserByUniqueIdentifier("notfound", {
          name: "No User",
        })
      ).rejects.toThrow("User with uniqueIdentifier (notfound) not found.");
    });

    it("should update user with unrelated fields", async () => {
      TestingUserManager._users.set(jUser1.id, jUser1);
      const updateData = { foo: "bar" };
      updateStub.resolves({ ...jUser1, attributes: { ...jUser1.attributes, ...updateData } });
      const result = await UserManager.updateUserByUniqueIdentifier(
        jUser1.uniqueIdentifier,
        updateData
      );
      expect(updateStub.calledOnceWith(USERS, jUser1.uniqueIdentifier, updateData)).toBe(
        true
      );
      expect(result).toEqual({ ...jUser1, attributes: { ...jUser1.attributes, ...updateData } });
    });
  });

  describe("addUsers", () => {
    it("should throw error if users is not an array", async () => {
      // @ts-ignore
      await expect(UserManager.addUsers(null)).rejects.toThrow(/No users provided/);
      // @ts-ignore
      await expect(UserManager.addUsers(undefined)).rejects.toThrow(/No users provided/);
      // @ts-ignore
      await expect(UserManager.addUsers("not-an-array")).rejects.toThrow(/No users provided/);
      // @ts-ignore
      await expect(UserManager.addUsers(123)).rejects.toThrow(/No users provided/);
      // @ts-ignore
      await expect(UserManager.addUsers({})).rejects.toThrow(/No users provided/);
    });


    it("should add users to database when all uniqueIdentifiers are valid and new", async () => {
      findStub.resolves([]);
      addStub.onFirstCall().resolves(jUser1);
      addStub.onSecondCall().resolves(jUser2);
      const userRecordList: NewUserRecord[] = [initialUserRecord1, initialUserRecord2];
      const result = await UserManager.addUsers(userRecordList);
      expect(addStub.callCount).toBe(2);
      expect(result[0]).toEqual(jUser1);
      expect(result[1]).toEqual(jUser2);
    });

    it("should skip users that are null or not objects and log warning", async () => {
      findStub.resolves([]);
      addStub.resolves(jUser2);
      const userRecordList: any[] = [null, undefined, 123, "string", initialUserRecord2];
      const result = await UserManager.addUsers(userRecordList as any);
      expect(logWarnStub.callCount).toBeGreaterThanOrEqual(1);
      expect(addStub.callCount).toBe(1);
      expect(result).toEqual([jUser2]);
    });

    it("should add only users with new uniqueIdentifiers", async () => {
      findStub.onFirstCall().resolves([jUser1]); // already exists
      findStub.onSecondCall().resolves([]); // new
      addStub.onFirstCall().resolves(jUser2);
      const userRecordList: NewUserRecord[] = [initialUserRecord1, initialUserRecord2];
      const result = await UserManager.addUsers(userRecordList);
      expect(result).toEqual([jUser2]);
      expect(addStub.callCount).toBe(1);
    });

    it("should log warning and skip adding a user if that user's uniqueIdentifier already exists", async () => {
      TestingUserManager._users.set(jUser1.id, jUser1);
      //findStub.onFirstCall().resolves([jUser1]);
      //findStub.onSecondCall().resolves([]);
      addStub.onFirstCall().resolves(jUser2);
      const userRecordList: NewUserRecord[] = [initialUserRecord1, initialUserRecord2];
      await expect(UserManager.addUsers(userRecordList)).resolves.toEqual([
        jUser2,
      ]);
      expect(logWarnStub.called).toBe(true);
      expect(logWarnStub.calledWithMatch(/already exists/)).toBe(true);
      expect(addStub.callCount).toBe(1);
      expect(addStub.firstCall.args[0]).toEqual("users");
      const { id, ...jUser2WithoutId } = jUser2;
      expect(addStub.firstCall.args[1]).toEqual(jUser2WithoutId);
    });

    it("should skip users without uniqueIdentifier and log warning", async () => {
      findStub.resolves([]);
      const userWithoutUid = { id: "3", name: "No UID" };
      addStub.resolves(jUser2);
      const userRecordList: NewUserRecord[] = [userWithoutUid as any, initialUserRecord2];
      const result = await UserManager.addUsers(userRecordList);
      expect(logWarnStub.called).toBe(true);
      expect(logWarnStub.calledWithMatch(/UniqueIdentifier is missing/)).toBe(
        true
      );
      expect(addStub.callCount).toBe(1);
      expect(result).toEqual([jUser2]);
    });

    it("should skip users with empty uniqueIdentifier and log warning", async () => {
      findStub.resolves([]);
      const userWithEmptyUid = {
        id: "4",
        uniqueIdentifier: "",
        name: "Empty UID",
      };
      addStub.resolves(jUser2);
      const userRecordList: NewUserRecord[] = [userWithEmptyUid as any, initialUserRecord2];
      const result = await UserManager.addUsers(userRecordList);
      expect(logWarnStub.called).toBe(true);
      expect(logWarnStub.calledWithMatch(/UniqueIdentifier is missing/)).toBe(
        true
      );
      expect(addStub.callCount).toBe(1);
      expect(result).toEqual([jUser2]);
    });

    it("should throw error if users array is empty", async () => {
      await expect(UserManager.addUsers([])).rejects.toThrow(
        /No users provided/
      );
    });

    it("should throw error if addItemToCollection throws for any user", async () => {
      findStub.resolves([]);
      addStub.onFirstCall().resolves(jUser1);
      addStub.onSecondCall().rejects(new Error("fail"));
      const userRecordList: NewUserRecord[] = [initialUserRecord1, initialUserRecord2];
      await expect(UserManager.addUsers(userRecordList)).rejects.toThrow(
        "fail"
      );
      expect(addStub.callCount).toBe(2);
    });

    it("should handle mix of valid, duplicate, and invalid users", async () => {
      // To Do: leave brief comment after some lines to improve readability. Can removed if not needed.
      findStub.onFirstCall().resolves([jUser1]); // duplicate 
      findStub.onSecondCall().resolves([]); // valid
      findStub.onThirdCall().resolves([]); // valid
      addStub.onFirstCall().resolves(jUser2);
      const initialUserRecord3 = { uniqueIdentifier: "ghi", initialAttributes: { name: "Third User" } };
      const jUser3 = {id: initialUserRecord3.uniqueIdentifier, uniqueIdentifier: initialUserRecord3.uniqueIdentifier, attributes: initialUserRecord3.initialAttributes};
      addStub
        .onSecondCall()
        .resolves(jUser3);
      const userRecordList: NewUserRecord[] = [
        initialUserRecord1, // duplicate
        initialUserRecord2, // valid
        initialUserRecord3, // valid
        {} as any, // invalid
        null as any, // invalid
      ];
      const result = await UserManager.addUsers(userRecordList);
      expect(result.length).toBe(2);
      expect(addStub.callCount).toBe(2);
      expect(logWarnStub.callCount).toBeGreaterThanOrEqual(2);
    });
  });
});
