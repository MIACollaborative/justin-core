import * as mongoDB from 'mongodb';
import sinon from 'sinon';
import { MongoDBManager } from '../mongo-data-manager';
import * as helpers from '../mongo.helpers';
import * as logger from '../../../logger/logger-manager';
import * as dataManagerHelpers from '../../data-manager.helpers';

describe('MongoDBManager.updateItemInCollectionByUniqueProperty', () => {
  let collectionStub: sinon.SinonStub;
  let ensureInitializedStub: sinon.SinonStub;
  let handleDbErrorStub: sinon.SinonStub;
  let logWarnStub: sinon.SinonStub;
  let findStub: sinon.SinonStub;
  let updateOneStub: sinon.SinonStub;
  let findOneStub: sinon.SinonStub;
  let toArrayStub: sinon.SinonStub;
  let transformIdStub: sinon.SinonStub;

  const fakeCollection = {
    find: () => fakeCollection,
    updateOne: () => {},
    findOne: () => {},
    toArray: () => [],
  };

  beforeEach(() => {
    ensureInitializedStub = sinon.stub(MongoDBManager as any, 'ensureInitialized').callsFake(() => {});
    collectionStub = sinon.stub((mongoDB as any).Db.prototype, 'collection').returns(fakeCollection); 
    handleDbErrorStub = sinon.stub(dataManagerHelpers, 'handleDbError').throws(new Error('fail'));
    logWarnStub = sinon.stub(logger.Log, 'warn');
    findStub = sinon.stub(fakeCollection, 'find').returns(fakeCollection);
    updateOneStub = sinon.stub(fakeCollection, 'updateOne');
    findOneStub = sinon.stub(fakeCollection, 'findOne');
    toArrayStub = sinon.stub(fakeCollection, 'toArray');
    transformIdStub = sinon.stub(helpers, 'toObjectId').callsFake((doc: any) => ({ id: doc._id, ...doc }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return null and log warning if multiple items found', async () => {
    toArrayStub.resolves([{}, {}]);
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty('users', 'email', 'a@b.com', { name: 'A' });
    expect(result).toBeNull();
    expect(logWarnStub.called).toBe(true);
  });

  it('should update and return transformed item if one item found', async () => {
    toArrayStub.resolves([ { email: 'a@b.com' } ]);
    updateOneStub.resolves({ matchedCount: 1, modifiedCount: 1 });
    const updatedDoc = { email: 'a@b.com', name: 'A' };
    findOneStub.resolves(updatedDoc);
    transformIdStub.returns(updatedDoc);
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty('users', 'email', 'a@b.com', { name: 'A' });
    expect(result).toEqual(updatedDoc);
  });

  it('should handle error and call handleDbError', async () => {
    toArrayStub.rejects(new Error('fail'));
    const result = await MongoDBManager.updateItemInCollectionByUniqueProperty('users', 'email', 'fail@b.com', { name: 'Fail' });
    expect(handleDbErrorStub.called).toBe(true);
    expect(result).toBeNull();
  });
});
