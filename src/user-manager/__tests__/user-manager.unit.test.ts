import sinon from "sinon";
import { UserManager, TestingUserManager } from "../user-manager";
import { USERS } from "../../data-manager/data-manager.constants";
import DataManager from "../../data-manager/data-manager";
import * as dataManagerHelpers from "../../data-manager/data-manager.helpers";
import { Log } from "../../logger/logger-manager";
import { NewUserRecord } from "../user.type";
import { ChangeListenerManager } from "../../data-manager/change-listener.manager";
import { CollectionChangeType } from "../../data-manager/data-manager.type";
import * as UserManagerModule from "../user-manager";


const initialUserRecord1 = { uniqueIdentifier: "abc", initialAttributes: { name: "Test User" } };
const initialUserRecord2 = { uniqueIdentifier: "def", initialAttributes: { name: "Another User" } };

const jUser1 = { id: initialUserRecord1.uniqueIdentifier, uniqueIdentifier: initialUserRecord1.uniqueIdentifier, attributes: initialUserRecord1.initialAttributes };
const jUser2 = { id: initialUserRecord2.uniqueIdentifier, uniqueIdentifier: initialUserRecord2.uniqueIdentifier, attributes: initialUserRecord2.initialAttributes };

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
  let removeChangeListenerStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    handleDbErrorStub = sandbox
      .stub(dataManagerHelpers, "handleDbError")
      .throws(new Error("fail"));

    addStub = sandbox
      .stub(DataManager.prototype, "addItemToCollection")
      .resolves(jUser1);
    findStub = sandbox
      .stub(DataManager.prototype, "findItemsInCollection")
      .resolves([jUser1]);
    updateStub = sandbox
      .stub(DataManager.prototype, "updateItemByIdInCollection")
      .resolves(jUser1);
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
      .resolves([jUser1, jUser2]);
    initStub = sandbox.stub(DataManager.prototype, "init").resolves();

    clearCollectionStub = sandbox
      .stub(DataManager.prototype, "clearCollection")
      .resolves();

    // Stubs for ChangeListeners
    addChangeListenerStub = sandbox.stub(ChangeListenerManager.prototype, "addChangeListener").resolves();
    removeChangeListenerStub = sandbox.stub(ChangeListenerManager.prototype, "removeChangeListener").resolves();


    logInfoStub = sandbox.stub(Log, "info");
    logWarnStub = sandbox.stub(Log, "warn");
    // Clear cache before each test tf  g
    TestingUserManager._users.clear();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("init", () => {
    it("should call DataManager.init", async () => {
      await TestingUserManager.init();
      expect(initStub.calledOnce).toBe(true);
    });

    it("should clear _users cache before populating", async () => {
      TestingUserManager._users.set(jUser1.id, jUser1);
      getAllInCollectionStub.resolves([jUser2]);
      await TestingUserManager.init();
      expect(TestingUserManager._users.size).toBe(1);
      expect(TestingUserManager._users.get(jUser2.id)).toBeDefined();
      expect(TestingUserManager._users.get(jUser1.id)).toBeUndefined();
    });

    it("should call getAllInCollection and addChangeListener", async () => {
      await TestingUserManager.init();
      expect(initStub.called).toBe(true);
      expect(getAllInCollectionStub.called).toBe(true);
      expect(addChangeListenerStub.called).toBe(true);
    });

    it("should throw if DataManager.init throws", async () => {
      initStub.rejects(new Error("init failed"));
      await expect(TestingUserManager.init()).rejects.toThrow("init failed");
    });

    it("should throw if getAllInCollection throws", async () => {
      getAllInCollectionStub.rejects(new Error("db error"));
      await expect(TestingUserManager.init()).rejects.toThrow("db error");
    });

    it("should throw if addChangeListener throws", async () => {
      addChangeListenerStub.throws(new Error("change listener error"));
      await expect(TestingUserManager.init()).rejects.toThrow("change listener error");
    });
  });

  describe("shutdown", () => {
    it("should call removeChangeListener", async () => {
      await TestingUserManager.shutdown();
      expect(removeChangeListenerStub.called).toBe(true);
      // call three times
      expect(removeChangeListenerStub.callCount).toBe(3);
      expect(removeChangeListenerStub.getCall(0).args).toEqual([USERS, CollectionChangeType.INSERT]);
      expect(removeChangeListenerStub.getCall(1).args).toEqual([USERS, CollectionChangeType.UPDATE]);
      expect(removeChangeListenerStub.getCall(2).args).toEqual([USERS, CollectionChangeType.DELETE]);
    });

    it("should throw if removeChangeListener throws", () => {
      removeChangeListenerStub.throws(new Error("change listener error"));
      expect(() => TestingUserManager.shutdown()).toThrow("change listener error");
    });
  });

  describe("refreshCache", () => {
    it("should call getInitializationStatus", async () => {
      await TestingUserManager.refreshCache();
      expect(getInitializationStatusStub.called).toBe(true);
    });

    it("should reload _users cache", async () => {
      TestingUserManager._users.set(jUser1.id, jUser1);
      getAllInCollectionStub.resolves([jUser1, jUser2]);
      await TestingUserManager.init();
      expect(getAllInCollectionStub.calledOnceWith(USERS)).toBe(true);
      expect(TestingUserManager._users.size).toBe(2);
      expect(TestingUserManager._users.get(jUser1.id)).toBeDefined();
      expect(TestingUserManager._users.get(jUser2.id)).toBeDefined();
    });
  });

  describe("transformUserDocument", () => {
    it("should convert _id to id", async () => {
      const jUser3Document = { _id: "3", uniqueIdentifier: "ghi", attributes: { name: "Third User" } };
      const result = TestingUserManager.transformUserDocument(jUser3Document);
      const { _id, ...jUser3WithoutId } = jUser3Document;
      expect(result).toMatchObject({ ...jUser3WithoutId, id: jUser3Document._id });
    });
  });


  describe("setupChangeListeners", () => {
    it("should call addChangeListener three times", async () => {
      await TestingUserManager.setupChangeListeners();
      expect(addChangeListenerStub.callCount).toBe(3);
      expect(addChangeListenerStub.getCall(0).args).toEqual([USERS, CollectionChangeType.INSERT, expect.any(Function)]);
      expect(addChangeListenerStub.getCall(1).args).toEqual([USERS, CollectionChangeType.UPDATE, expect.any(Function)]);
      expect(addChangeListenerStub.getCall(2).args).toEqual([USERS, CollectionChangeType.DELETE, expect.any(Function)]);
    });
  });

  describe("_checkInitialization", () => {
    it("should call getInitializationStatus", async () => {
      await TestingUserManager._checkInitialization();
      expect(getInitializationStatusStub.called).toBe(true);
    });
  });

  describe("addUser", () => {
    it("should throw if not initialized", async () => {
      getInitializationStatusStub.returns(false);
      await expect(UserManager.addUser(initialUserRecord1)).rejects.toThrow("UserManager has not been initialized");
    });

    it("should log warning and return null if user is invalid", async () => {
      getInitializationStatusStub.returns(true);
      // @ts-ignore
      const result = await UserManager.addUser(null);
      expect(logWarnStub.called).toBe(true);
      expect(result).toBeNull();
    });

    it("should log warning and return null if uniqueIdentifier is missing", async () => {
      getInitializationStatusStub.returns(true);
      // @ts-ignore
      const result = await UserManager.addUser({ initialAttributes: { name: "No UID" } });
      expect(logWarnStub.calledWithMatch(/UniqueIdentifier is missing/)).toBe(true);
      expect(result).toBeNull();
    });

    it("should log warning and return null if identifier is not unique", async () => {
      getInitializationStatusStub.returns(true);
      TestingUserManager._users.set(jUser1.id, jUser1);
      const result = await TestingUserManager.addUser(initialUserRecord1);
      expect(result).toBeNull();
      expect(logWarnStub.calledWithMatch(/not unique/)).toBe(true);
      expect(addStub.called).toBe(false);
    });

    it("should add user and return added user if valid and unique", async () => {
      getInitializationStatusStub.returns(true);
      sandbox.stub(TestingUserManager, "isIdentifierUnique").resolves(true);
      addStub.resolves(jUser1);
      const result = await UserManager.addUser(initialUserRecord1);
      expect(addStub.calledOnceWith(USERS, { uniqueIdentifier: initialUserRecord1.uniqueIdentifier, attributes: initialUserRecord1.initialAttributes })).toBe(true);
      expect(result).toEqual(jUser1);
      expect(TestingUserManager._users.get(jUser1.id)).toEqual(jUser1);
    });

    it("should handle error from addItemToCollection", async () => {
      getInitializationStatusStub.returns(true);
      addStub.rejects(new Error("db error"));
      await expect(UserManager.addUser(initialUserRecord1)).rejects.toThrow(/fail/);
    });
  });

  describe("addUsers", () => {

    it("should add users to database", async () => {
      findStub.resolves([]);
      addStub.onFirstCall().resolves(jUser1);
      addStub.onSecondCall().resolves(jUser2);
      
      const userRecordList: NewUserRecord[] = [initialUserRecord1, initialUserRecord2];
      const result = await UserManager.addUsers(userRecordList);

      expect(addStub.callCount).toBe(2);
      expect(result[0]).toEqual(jUser1);
      expect(result[1]).toEqual(jUser2);
    });

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

    it("should throw error if users is an empty arrary", async () => {
      // @ts-ignore
      await expect(UserManager.addUsers([])).rejects.toThrow(/No users provided/);
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


});
