import sinon from 'sinon';
import { UserManager, TestingUserManager } from '../user-manager';
import DataManager from '../../data-manager/data-manager';
import { ChangeListenerManager } from '../../data-manager/change-listener.manager';
import { Log } from '../../logger/logger-manager';
import { USERS } from '../../data-manager/data-manager.constants';
import { CollectionChangeType } from '../../data-manager/data-manager.type';

const fakeUser = { id: '1', uniqueIdentifier: 'abc', name: 'Test User' };
const fakeUser2 = { id: '2', uniqueIdentifier: 'def', name: 'Another User' };

describe('UserManager', () => {
  let dmStub: any, clmStub: any, logStub: any;

  beforeEach(() => {
    dmStub = sinon.stub(DataManager, 'getInstance').returns({
      getInitializationStatus: sinon.stub().returns(true),
      init: sinon.stub().resolves(),
      addItemToCollection: sinon.stub().resolves(fakeUser),
      removeItemFromCollection: sinon.stub().resolves(),
      getAllInCollection: sinon.stub().resolves([fakeUser, fakeUser2]),
      updateItemInCollectionById: sinon.stub().resolves(fakeUser),
      clearCollection: sinon.stub().resolves(),
      findItemsInCollectionByCriteria: sinon.stub().resolves([fakeUser]),
      updateItemInCollectionByUniquePropertyValue: sinon.stub().resolves(fakeUser),
    } as any);
    clmStub = sinon.stub(ChangeListenerManager, 'getInstance').returns({
      addChangeListener: sinon.stub(),
      removeChangeListener: sinon.stub(),
    } as any);
    logStub = sinon.stub(Log, 'info');
    sinon.stub(Log, 'warn');
    sinon.stub(Log, 'error');
    // Clear cache before each test
    TestingUserManager._users.clear();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should check for unique identifier existence', () => {
    const result = UserManager.doesUserUniqueIdentifierExist({ uniqueIdentifier: 'abc' });
    expect(result.result).toBe(true);
    const result2 = UserManager.doesUserUniqueIdentifierExist({});
    expect(result2.result).toBe(false);
  });

  it('should check for unique identifier duplication', async () => {
    const result = await UserManager.isUserUniqueIdentifierNew('abc');
    expect(result.result).toBe(false);
    expect(result.message).toMatch(/already exists/);
  });

  it('should add users to database', async () => {
    const addStub = sinon.stub().resolves(fakeUser);
    dmStub.restore();
    sinon.stub(DataManager, 'getInstance').returns({
      ...DataManager.getInstance(),
      addItemToCollection: addStub,
      findItemsInCollectionByCriteria: sinon.stub().resolves([]),
      getInitializationStatus: sinon.stub().returns(true),
    } as any);
    const users = [ { uniqueIdentifier: 'u1' } ];
    const result = await UserManager.addUsersToDatabase(users);
    expect(result[0]).toEqual(fakeUser);
  });

});
