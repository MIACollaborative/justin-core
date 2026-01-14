/* eslint-disable no-duplicate-imports */
import { EventEmitter } from 'events';
import * as mongoDB from 'mongodb';
import { Readable } from 'stream';
import sinon, { SinonSandbox, SinonStub } from 'sinon';
import { CollectionChangeType } from '../../data-manager.type';
import * as Helpers from '../../data-manager.helpers';
import * as MongoHelpers from '../mongo.helpers';
import { MongoDBManager, TestingMongoDBManager } from '../mongo-data-manager';
import { loggerSpies, makeFakeMongo } from '../../../__tests__/testkit';
import type { FakeMongo } from '../../../__tests__/testkit';
import { expectLog } from '../../../__tests__/helpers';

describe('MongoDBManager (unit)', () => {
  let sb: SinonSandbox;
  let logs: ReturnType<typeof loggerSpies>;

  let handleDbErrorStub: SinonStub;

  let toObjectIdStub: SinonStub;
  let asIndexKeyStub: SinonStub;
  let normalizeIndexKeyStub: SinonStub;
  let transformIdStub: SinonStub;

  let mongoFakes: FakeMongo;

  beforeEach(() => {
    sb = sinon.createSandbox();
    logs = loggerSpies();

    // handleDbError(message, funcName, error): never
    handleDbErrorStub = sb
      .stub(Helpers, 'handleDbError')
      .callsFake((_msg: string, _fn: string, _err: unknown) => null as never);

    toObjectIdStub = sb.stub(MongoHelpers, 'toObjectId').callsFake(() => new mongoDB.ObjectId());
    transformIdStub = sb.stub(MongoHelpers, 'transformId').callsFake((doc: any) => doc);
    asIndexKeyStub = sb.stub(MongoHelpers, 'asIndexKey').callsFake((k: any) => k);
    normalizeIndexKeyStub = sb.stub(MongoHelpers, 'normalizeIndexKey').callsFake((k: unknown) => {
      if (typeof k === 'string') return `${k}:1`;
      return 'key:1';
    });

    mongoFakes = makeFakeMongo();

    TestingMongoDBManager._setDatabaseInstance(mongoFakes.db as any);
    TestingMongoDBManager._setClient(mongoFakes.client as any);
    TestingMongoDBManager._setIsConnected(true);
  });

  afterEach(() => {
    logs.restore();
    sb.restore();
  });

  describe('ensureInitialized', () => {
    it('throws if not connected', () => {
      TestingMongoDBManager._setIsConnected(false);

      expect(() => MongoDBManager.ensureInitialized()).toThrow(
        'MongoDBManager not initialized. Call init() first.',
      );
    });

    it('does not throw if connected', () => {
      expect(() => MongoDBManager.ensureInitialized()).not.toThrow();
    });
  });

  describe('ensureStore', () => {
    it('creates collection when it does not exist', async () => {
      const hasNext = sb.stub().resolves(false);
      (mongoFakes.db.listCollections as SinonStub).returns({ hasNext } as any);

      await MongoDBManager.ensureStore('users');

      sinon.assert.calledWith(
        mongoFakes.db.listCollections as SinonStub,
        { name: 'users' },
        { nameOnly: true },
      );
      sinon.assert.calledWith(mongoFakes.db.createCollection as SinonStub, 'users');

      expectLog(logs.last(), { severity: 'DEBUG', messageSubstr: 'Created collection users' });
    });

    it('does not create collection when it exists', async () => {
      const hasNext = sb.stub().resolves(true);
      (mongoFakes.db.listCollections as SinonStub).returns({ hasNext } as any);

      await MongoDBManager.ensureStore('users');

      expect((mongoFakes.db.createCollection as SinonStub).called).toBe(false);
    });

    it('applies validator when provided', async () => {
      const hasNext = sb.stub().resolves(true);
      (mongoFakes.db.listCollections as SinonStub).returns({ hasNext } as any);

      await MongoDBManager.ensureStore('users', {
        validator: { $jsonSchema: { bsonType: 'object' } },
      });

      sinon.assert.calledWith(mongoFakes.db.command as SinonStub, {
        collMod: 'users',
        validator: { $jsonSchema: { bsonType: 'object' } },
      });

      expectLog(logs.last(), { severity: 'DEBUG', messageSubstr: 'Applied validator to users' });
    });

    it('logs a warning when collMod fails', async () => {
      const hasNext = sb.stub().resolves(true);
      (mongoFakes.db.listCollections as SinonStub).returns({ hasNext } as any);
      (mongoFakes.db.command as SinonStub).rejects(new Error('nope'));

      await MongoDBManager.ensureStore('users', {
        validator: { x: 1 },
      });

      const warnings = logs.captured.filter((c) => c.entry.severity === 'WARNING');
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('ensureIndexes', () => {
    it('returns early when no indexes provided', async () => {
      await MongoDBManager.ensureIndexes('users', []);
      expect((mongoFakes.db.collection as SinonStub).called).toBe(false);
    });

    it('creates indexes that do not already exist', async () => {
      const toArray = sb.stub().resolves([{ name: 'existing', key: { existing: 1 } }]);
      (mongoFakes.collection.listIndexes as SinonStub).returns({ toArray } as any);

      normalizeIndexKeyStub.callsFake((key: any) => {
        if (typeof key === 'string') return `${key}:1`;
        if (key.existing) return 'existing:1';
        if (key.newField) return 'newField:1';
        return 'key:1';
      });

      await MongoDBManager.ensureIndexes('users', [
        {
          name: 'newIndex',
          key: { newField: 1 },
          unique: true,
        },
        {
          key: { existing: 1 },
        },
      ]);

      sinon.assert.calledWith(mongoFakes.db.collection as SinonStub, 'users');
      sinon.assert.calledOnce(mongoFakes.collection.createIndexes as SinonStub);

      const callArg = (mongoFakes.collection.createIndexes as SinonStub).getCall(0).args[0];
      expect(callArg).toHaveLength(1);
      expect(callArg[0]).toMatchObject({
        key: { newField: 1 },
        name: 'newIndex',
        unique: true,
      });

      expectLog(logs.last(), { severity: 'DEBUG', messageSubstr: 'Created 1 index(es) on users' });
    });
  });

  describe('findItemByIdInCollection', () => {
    it('returns null if toObjectId returns null', async () => {
      toObjectIdStub.onFirstCall().returns(null);

      const result = await MongoDBManager.findItemByIdInCollection('users', 'bad-id');

      expect(result).toBeNull();
      expect((mongoFakes.collection.findOne as SinonStub).called).toBe(false);
    });

    it('returns transformed doc when found', async () => {
      const fakeMongoDoc = { _id: 'a', name: 'test' };
      (mongoFakes.collection.findOne as SinonStub).resolves(fakeMongoDoc);
      transformIdStub.returns({ id: 'a', name: 'test' });

      const result = await MongoDBManager.findItemByIdInCollection('users', 'good-id');

      sinon.assert.calledWith(mongoFakes.collection.findOne as SinonStub, {
        _id: sinon.match.instanceOf(mongoDB.ObjectId),
      });
      expect(transformIdStub.calledWith(fakeMongoDoc)).toBe(true);
      expect(result).toEqual({ id: 'a', name: 'test' });
    });

    it('delegates to handleDbError on failure', async () => {
      (mongoFakes.collection.findOne as SinonStub).rejects(new Error('boom'));

      const result = await MongoDBManager.findItemByIdInCollection('users', 'good-id');

      expect(handleDbErrorStub.called).toBe(true);
      const [msg, fnName, err] = handleDbErrorStub.getCall(0).args;

      expect(msg).toBe('Error finding item with id good-id in users');
      expect(fnName).toBe('findItemByIdInCollection');
      expect(err).toBeInstanceOf(Error);
      expect(result).toBeNull();
    });
  });

  describe('findItemsInCollection', () => {
    it('returns transformed list', async () => {
      const toArray = sb.stub().resolves([{ _id: '1' }, { _id: '2' }]);
      (mongoFakes.collection.find as SinonStub).returns({ toArray } as any);

      transformIdStub.onFirstCall().returns({ id: '1' }).onSecondCall().returns({ id: '2' });

      const result = await MongoDBManager.findItemsInCollection('users', {
        active: true,
      });

      sinon.assert.calledWith(mongoFakes.collection.find as SinonStub, { active: true });
      expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    });

    it('delegates to handleDbError on failure', async () => {
      (mongoFakes.collection.find as SinonStub).throws(new Error('query failed'));

      const result = await MongoDBManager.findItemsInCollection('users', {});

      expect(handleDbErrorStub.called).toBe(true);
      expect(result).toBeNull();
    });
  });

  describe('addItemToCollection', () => {
    it('inserts and returns inserted id', async () => {
      (mongoFakes.collection.insertOne as SinonStub).resolves({ insertedId: 'abc123' } as any);
      transformIdStub.returns({ id: 'abc123', name: 'x' });

      const result = await MongoDBManager.addItemToCollection('users', {
        name: 'x',
      });

      sinon.assert.calledWith(mongoFakes.collection.insertOne as SinonStub, { name: 'x' });
      expect(transformIdStub.called).toBe(false);
      expect(result).toBe('abc123');
    });

    it('delegates to handleDbError on failure', async () => {
      (mongoFakes.collection.insertOne as SinonStub).rejects(new Error('insert bad'));

      const result = await MongoDBManager.addItemToCollection('users', {
        name: 'x',
      });

      expect(handleDbErrorStub.called).toBe(true);

      const [msg, fnName, err] = handleDbErrorStub.getCall(0).args;

      expect(msg).toBe('Error inserting item into users');
      expect(fnName).toBe('addItemToCollection');
      expect(err).toBeInstanceOf(Error);
      expect(result).toBeNull();
    });
  });

  describe('updateItemInCollection', () => {
    it('returns null when toObjectId fails', async () => {
      toObjectIdStub.onFirstCall().returns(null);

      const result = await MongoDBManager.updateItemInCollection('users', 'bad-id', { name: 'x' });

      expect(result).toBeNull();
      expect((mongoFakes.collection.findOneAndUpdate as SinonStub).called).toBe(false);
      expect((mongoFakes.collection.findOne as SinonStub).called).toBe(false);
    });

    it('updates and returns transformed doc', async () => {
      const fakeUpdated = { _id: '1', name: 'updated' };

      toObjectIdStub.returns(new mongoDB.ObjectId('651111111111111111111111'));
      (mongoFakes.collection.updateOne as SinonStub).resolves({
        matchedCount: 1,
        modifiedCount: 1,
      } as any);
      (mongoFakes.collection.findOne as SinonStub).resolves(fakeUpdated);
      transformIdStub.returns({ id: '1', name: 'updated' });

      const result = await MongoDBManager.updateItemInCollection('users', 'good-id', {
        name: 'updated',
      });

      sinon.assert.calledWith(
        mongoFakes.collection.updateOne as SinonStub,
        { _id: sinon.match.instanceOf(mongoDB.ObjectId) },
        { $set: { name: 'updated' } },
      );

      sinon.assert.calledWith(mongoFakes.collection.findOne as SinonStub, {
        _id: sinon.match.instanceOf(mongoDB.ObjectId),
      });

      expect(transformIdStub.calledWith(fakeUpdated)).toBe(true);
      expect(result).toEqual({ id: '1', name: 'updated' });
    });
  });

  describe('getAllInCollection', () => {
    it('returns transformed docs', async () => {
      const toArray = sb.stub().resolves([{ _id: '1' }]);
      (mongoFakes.collection.find as SinonStub).returns({ toArray } as any);

      transformIdStub.returns({ id: '1' });

      const result = await MongoDBManager.getAllInCollection('users');

      expect(result).toEqual([{ id: '1' }]);
    });
  });

  describe('removeItemFromCollection', () => {
    it('returns false when toObjectId fails', async () => {
      toObjectIdStub.onFirstCall().returns(null);

      const result = await MongoDBManager.removeItemFromCollection('users', 'bad-id');

      expect(result).toBe(false);
      expect((mongoFakes.collection.deleteOne as SinonStub).called).toBe(false);
    });

    it('returns true when delete is acknowledged', async () => {
      (mongoFakes.collection.deleteOne as SinonStub).resolves({ acknowledged: true } as any);

      const result = await MongoDBManager.removeItemFromCollection('users', 'good-id');

      expect(result).toBe(true);
    });
  });

  describe('clearCollection', () => {
    it('deletes all and returns acknowledged', async () => {
      (mongoFakes.collection.deleteMany as SinonStub).resolves({ acknowledged: true } as any);

      const result = await MongoDBManager.clearCollection('users');

      sinon.assert.calledWith(mongoFakes.collection.deleteMany as SinonStub, {});
      expect(result).toBe(true);
    });
  });

  describe('isCollectionEmpty', () => {
    it('returns true when count is 0', async () => {
      (mongoFakes.collection.countDocuments as SinonStub).resolves(0);

      const result = await MongoDBManager.isCollectionEmpty('users');

      expect(result).toBe(true);
    });

    it('returns false when count is > 0', async () => {
      (mongoFakes.collection.countDocuments as SinonStub).resolves(1);

      const result = await MongoDBManager.isCollectionEmpty('users');

      expect(result).toBe(false);
    });
  });

  describe('getCollectionChangeReadable', () => {
    it('creates a readable that pushes normalized docs on change (DELETE)', () => {
      const emitter = new EventEmitter();
      (mongoFakes.collection.watch as SinonStub).returns(emitter as any);

      const readable = MongoDBManager.getCollectionChangeReadable('users', CollectionChangeType.DELETE);

      emitter.emit('change', {
        documentKey: { _id: new mongoDB.ObjectId('64b5fcf45a9930c381d2f111') },
      });

      const chunk = (readable as Readable).read() as any;
      expect(chunk).toEqual({
        id: '64b5fcf45a9930c381d2f111',
      });
    });

    it('creates a readable that pushes transformed docs on change (INSERT)', () => {
      const emitter = new EventEmitter();
      (mongoFakes.collection.watch as SinonStub).returns(emitter as any);
      transformIdStub.returns({ id: '123', name: 'foo' });

      const readable = MongoDBManager.getCollectionChangeReadable('users', CollectionChangeType.INSERT);

      emitter.emit('change', {
        fullDocument: { _id: '123', name: 'foo' },
      });

      const chunk = (readable as Readable).read() as any;
      expect(transformIdStub.calledWith({ _id: '123', name: 'foo' })).toBe(true);
      expect(chunk).toEqual({ id: '123', name: 'foo' });
    });

    it('destroys readable on error and logs (handled)', (done) => {
      const emitter = new EventEmitter();
      (mongoFakes.collection.watch as SinonStub).returns(emitter as any);

      const readable = MongoDBManager.getCollectionChangeReadable('users', CollectionChangeType.INSERT);

      readable.on('error', () => {
        expectLog(logs.last(), { severity: 'ERROR', messageSubstr: 'Change stream error' });

        const ctx = logs.last()?.ctx as any;
        expect(ctx).toBeDefined();
        expect(ctx.error).toBeDefined();
        expect(ctx.error.name).toBe('Error');
        expect(ctx.error.message).toBe('stream broke');

        done();
      });

      const err = new Error('stream broke');
      emitter.emit('error', err);
    });
  });

  describe('close', () => {
    it('closes client and resets state', async () => {
      await MongoDBManager.close();

      expect((mongoFakes.client.close as SinonStub).called).toBe(true);
    });
  });
});
