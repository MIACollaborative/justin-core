import { UserManager, TestingUserManager } from '../user-manager';
import DataManager from '../../data-manager/data-manager';
import sinon from 'sinon';

describe('UserManager', () => {
  let dmStub: sinon.SinonStubbedInstance<typeof DataManager.prototype>;
  let dmInstance: any;
  let initStub: sinon.SinonStub;
  let getInitializationStatusStub: sinon.SinonStub;
  let getAllInCollectionStub: sinon.SinonStub;
  let addItemToCollectionStub: sinon.SinonStub;
  let updateItemInCollectionByIdStub: sinon.SinonStub;
  let removeItemFromCollectionStub: sinon.SinonStub;
  let clearCollectionStub: sinon.SinonStub;
  let findItemsInCollectionByCriteriaStub: sinon.SinonStub;

  beforeEach(() => {
    dmInstance = DataManager.getInstance();
    initStub = sinon.stub(dmInstance, 'init').resolves();
    getInitializationStatusStub = sinon.stub(dmInstance, 'getInitializationStatus').returns(true);
    getAllInCollectionStub = sinon.stub(dmInstance, 'getAllInCollection').resolves([]);
    addItemToCollectionStub = sinon.stub(dmInstance, 'addItemToCollection').resolves({ id: '1', name: 'Test User' });
    updateItemInCollectionByIdStub = sinon.stub(dmInstance, 'updateItemInCollectionById').resolves({ id: '1', name: 'Updated User' });
    removeItemFromCollectionStub = sinon.stub(dmInstance, 'removeItemFromCollection').resolves();
    clearCollectionStub = sinon.stub(dmInstance, 'clearCollection').resolves();
    findItemsInCollectionByCriteriaStub = sinon.stub(dmInstance, 'findItemsInCollectionByCriteria').resolves([]);
  });

  afterEach(() => {
    sinon.restore();
    TestingUserManager._users.clear();
  });

  describe('init', () => {
    it('should initialize DataManager and load users', async () => {
      const loadUsersSpy = sinon.spy(UserManager, 'loadUsers');
      await UserManager.init();
      expect(initStub.calledOnce).toBe(true);
      expect(loadUsersSpy.calledOnce).toBe(true);
      loadUsersSpy.restore();
    });
  });

  describe('createUser', () => {
    it('should create a user and add to cache', async () => {
      const user = await TestingUserManager.createUser({ name: 'Test User' });
      expect(user).toHaveProperty('id', '1');
      expect(TestingUserManager._users.has('1')).toBe(true);
    });
  });

  describe('getAllUsers', () => {
    it('should return all cached users', async () => {
      TestingUserManager._users.set('1', { participantId: '1', name: 'User1' });
      TestingUserManager._users.set('2', { participantId: '2', name: 'User2' });
      const users = TestingUserManager.getAllUsers();
      expect(users.length).toBe(2);
    });
  });

  describe('getUser', () => {
    it('should return user by id', () => {
      TestingUserManager._users.set('1', { participantId: '1', name: 'User1' });
      const user = TestingUserManager.getUser('1');
      expect(user).toEqual({ participantId: '1', name: 'User1' });
    });
    it('should return null if user not found', () => {
      const user = TestingUserManager.getUser('not-exist');
      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user in db and cache', async () => {
      TestingUserManager._users.set('1', { participantId: '1', name: 'User1' });
      const updated = await TestingUserManager.updateUser('1', { name: 'Updated User' });
      expect(updated).toHaveProperty('name', 'Updated User');
      expect(TestingUserManager._users.get('1')).toHaveProperty('name', 'Updated User');
    });
  });

  describe('deleteUser', () => {
    it('should remove user from db and cache', async () => {
      TestingUserManager._users.set('1', { participantId: '1', name: 'User1' });
      await TestingUserManager.deleteUser('1');
      expect(TestingUserManager._users.has('1')).toBe(false);
      expect(removeItemFromCollectionStub.calledOnce).toBe(true);
    });
  });

  describe('deleteAllUsers', () => {
    it('should clear all users from db and cache', async () => {
      TestingUserManager._users.set('1', { participantId: '1', name: 'User1' });
      await TestingUserManager.deleteAllUsers();
      expect(TestingUserManager._users.size).toBe(0);
      expect(clearCollectionStub.calledOnce).toBe(true);
    });
  });

  describe('addUsersToDatabase', () => {
    it('should add multiple users', async () => {
      // Patch doesUserReadableIdExist and isUserReadableIdNew to always pass
      sinon.stub(UserManager, 'doesUserReadableIdExist').returns({ result: true, message: '' });
      sinon.stub(UserManager, 'isUserReadableIdNew').resolves({ result: true, message: '' });
      addItemToCollectionStub.resolves({ id: '1', participantId: 'p1' });
      const users = [{ participantId: 'p1' }];
      const result = await UserManager.addUsersToDatabase(users);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('id', '1');
      (UserManager.doesUserReadableIdExist as any).restore();
      (UserManager.isUserReadableIdNew as any).restore();
    });
    it('should throw if users array is empty', async () => {
      await expect(UserManager.addUsersToDatabase([])).rejects.toThrow('No users provided for insertion.');
    });
  });

  describe('updateUserReadableIdById', () => {
    it('should update user readable id by id', async () => {
      updateItemInCollectionByIdStub.resolves({ id: '1', participantId: 'p2' });
      const result = await UserManager.updateUserReadableIdById('1', 'participantId', 'p2');
      expect(result).toHaveProperty('participantId', 'p2');
    });
  });

  describe('updateUserByReadableId', () => {
    it('should update user by readable id', async () => {
      findItemsInCollectionByCriteriaStub.resolves([{ id: '1', participantId: 'p1' }]);
      updateItemInCollectionByIdStub.resolves({ id: '1', name: 'Updated' });
      const result = await UserManager.updateUserByReadableId('participantId', 'p1', { name: 'Updated' });
      expect(result).toHaveProperty('name', 'Updated');
    });
    it('should return null if user not found', async () => {
      findItemsInCollectionByCriteriaStub.resolves([]);
      const result = await UserManager.updateUserByReadableId('participantId', 'notfound', { name: 'Updated' });
      expect(result).toBeNull();
    });
  });

  describe('doesUserReadableIdExist', () => {
    it('should return false if readable id missing', () => {
      const result = UserManager.doesUserReadableIdExist({}, 'participantId');
      expect(result.result).toBe(false);
    });
    it('should return true if readable id exists', () => {
      const result = UserManager.doesUserReadableIdExist({ participantId: 'p1' }, 'participantId');
      expect(result.result).toBe(true);
    });
  });

  describe('isUserReadableIdNew', () => {
    it('should return false if user exists', async () => {
      findItemsInCollectionByCriteriaStub.resolves([{ id: '1', participantId: 'p1' }]);
      const result = await UserManager.isUserReadableIdNew('participantId', 'p1');
      expect(result.result).toBe(false);
    });
    it('should return true if user does not exist', async () => {
      findItemsInCollectionByCriteriaStub.resolves([]);
      const result = await UserManager.isUserReadableIdNew('participantId', 'p2');
      expect(result.result).toBe(true);
    });
  });

  describe('loadUsers', () => {
    it('should load users into cache', async () => {
      getAllInCollectionStub.resolves([{ _id: '1', name: 'User1' }]);
      await UserManager.loadUsers();
      expect(TestingUserManager._users.has('1')).toBe(true);
    });
  });
});
