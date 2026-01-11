import { Readable } from 'stream';
import sinon, { SinonSandbox } from 'sinon';
import DataManager from '../data-manager';
import { DBType, USERS } from '../data-manager.constants';
import { CollectionChangeType } from '../data-manager.type';
import { resetSingleton } from '../../__tests__/helpers';
import { makeDataManagerSandbox } from '../../__tests__/testkit';

describe('DataManager (unit)', () => {
  let sb: SinonSandbox;
  let dmSandbox: ReturnType<typeof makeDataManagerSandbox>;

  beforeEach(() => {
    sb = sinon.createSandbox();

    // reset singleton first, then build a fresh sandbox (which will stub singleton deps)
    resetSingleton(DataManager);

    dmSandbox = makeDataManagerSandbox();
  });

  afterEach(() => {
    dmSandbox.restore();
    sb.restore();
  });

  it('returns a singleton instance', () => {
    const a = DataManager.getInstance();
    const b = DataManager.getInstance();
    expect(a).toBe(b);
  });

  it('initializes once and becomes ready', async () => {
    const dm = DataManager.getInstance();

    await expect(dm.init(DBType.MONGO)).resolves.toBeUndefined();
    expect(dmSandbox.mongo.init.calledOnce).toBe(true);
    expect(dm.getInitializationStatus()).toBe(true);

    // calling again should no-op (still only one adapter init call)
    await expect(dm.init(DBType.MONGO)).resolves.toBeUndefined();
    expect(dmSandbox.mongo.init.calledOnce).toBe(true);
  });

  it('errors via handleDbError on unsupported DB type', async () => {
    const dm = DataManager.getInstance();

    await expect(dm.init('POSTGRES' as unknown as DBType)).rejects.toBeInstanceOf(Error);

    expect(dmSandbox.handleDbErrorSpy.calledOnce).toBe(true);

    const [msg, fnName, err] = dmSandbox.handleDbErrorSpy.getCall(0).args;
    expect(msg).toBe('Failed to initialize DataManager');
    expect(fnName).toBe('init');
    expect(err).toBeInstanceOf(Error);

    expect(dmSandbox.mongo.init.notCalled).toBe(true);
  });

  it('requires init before ensureStore/ensureIndexes', async () => {
    const dm = DataManager.getInstance();

    await expect(dm.ensureStore('things')).rejects.toThrow('DataManager has not been initialized');
    await expect(dm.ensureIndexes('things', [])).rejects.toThrow('DataManager has not been initialized');
  });

  it('ensures store and indexes after init', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    await expect(dm.ensureStore('things', { validator: { ok: true } })).resolves.toBeUndefined();
    expect(dmSandbox.mongo.ensureStore.calledWith('things', { validator: { ok: true } })).toBe(true);

    const indexes = [{ name: 'i1', key: { a: 1 }, unique: true }];
    await expect(dm.ensureIndexes('things', indexes)).resolves.toBeUndefined();
    expect(dmSandbox.mongo.ensureIndexes.calledWith('things', indexes)).toBe(true);
  });

  it('close clears change listeners and resets init status', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    await expect(dm.close()).resolves.toBeUndefined();

    sinon.assert.calledOnce(dmSandbox.clm.clearChangeListeners);
    expect(dmSandbox.mongo.close.calledOnce).toBe(true);
    expect(dm.getInitializationStatus()).toBe(false);
  });

  it('close without init throws', async () => {
    const dm = DataManager.getInstance();
    await expect(dm.close()).rejects.toThrow('DataManager has not been initialized');
  });

  it('addItemToCollection returns enriched item and emits userAdded for USERS', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    const onUserAdded = sb.stub();
    dm.on('userAdded', onUserAdded);

    dmSandbox.mongo.addItemToCollection.resolves('new-id-1');

    const res = await dm.addItemToCollection(USERS, { name: 'Ada' });

    expect(res).toEqual({ id: 'new-id-1', name: 'Ada' });
    expect(dmSandbox.mongo.addItemToCollection.calledWith(USERS, { name: 'Ada' })).toBe(true);

    sinon.assert.calledOnce(onUserAdded);
    sinon.assert.calledWith(onUserAdded, { id: 'new-id-1', name: 'Ada' });
  });

  it('addItemToCollection bubbles errors via handleDbError', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    const boom = new Error('fail-add');
    dmSandbox.mongo.addItemToCollection.rejects(boom);

    await expect(dm.addItemToCollection('things', { x: 1 })).rejects.toBe(boom);

    expect(dmSandbox.handleDbErrorSpy.calledOnce).toBe(true);

    const [msg, fnName, err] = dmSandbox.handleDbErrorSpy.getCall(0).args;
    expect(msg).toBe('Failed to add item to collection: things');
    expect(fnName).toBe('addItemToCollection');
    expect(err).toBe(boom);
  });

  it('updateItemByIdInCollection returns item and emits userUpdated for USERS', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    dmSandbox.mongo.updateItemInCollection.resolves({
      id: 'u1',
      name: 'Ada Lovelace',
    });

    const onUserUpdated = sb.stub();
    dm.on('userUpdated', onUserUpdated);

    const out = await dm.updateItemByIdInCollection(USERS, 'u1', {
      name: 'Ada Lovelace',
    });

    expect(out).toEqual({ id: 'u1', name: 'Ada Lovelace' });
    expect(
      dmSandbox.mongo.updateItemInCollection.calledWith(USERS, 'u1', {
        name: 'Ada Lovelace',
      }),
    ).toBe(true);

    sinon.assert.calledOnce(onUserUpdated);
    sinon.assert.calledWith(onUserUpdated, { id: 'u1', name: 'Ada Lovelace' });
  });

  it('updateItemByIdInCollection bubbles errors via handleDbError', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    const boom = new Error('fail-update');
    dmSandbox.mongo.updateItemInCollection.rejects(boom);

    await expect(dm.updateItemByIdInCollection('things', 't1', { x: 2 })).rejects.toBe(boom);

    expect(dmSandbox.handleDbErrorSpy.calledOnce).toBe(true);

    const [msg, fnName, err] = dmSandbox.handleDbErrorSpy.getCall(0).args;
    expect(msg).toBe('Failed to update item in collection: things');
    expect(fnName).toBe('updateItemByIdInCollection');
    expect(err).toBe(boom);
  });

  it('removeItemFromCollection emits userDeleted for USERS when success=true', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    dmSandbox.mongo.removeItemFromCollection.resolves(true);

    const onDeleted = sb.stub();
    dm.on('userDeleted', onDeleted);

    const ok = await dm.removeItemFromCollection(USERS, 'u9');

    expect(ok).toBe(true);
    expect(dmSandbox.mongo.removeItemFromCollection.calledWith(USERS, 'u9')).toBe(true);

    sinon.assert.calledOnce(onDeleted);
    sinon.assert.calledWith(onDeleted, 'u9');
  });

  it('removeItemFromCollection does not emit when success=false', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    dmSandbox.mongo.removeItemFromCollection.resolves(false);

    const onDeleted = sb.stub();
    dm.on('userDeleted', onDeleted);

    const ok = await dm.removeItemFromCollection(USERS, 'u9');

    expect(ok).toBe(false);
    sinon.assert.notCalled(onDeleted);
  });

  it('removeItemFromCollection bubbles errors via handleDbError', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    const boom = new Error('fail-remove');
    dmSandbox.mongo.removeItemFromCollection.rejects(boom);

    await expect(dm.removeItemFromCollection('things', 't1')).rejects.toBe(boom);

    expect(dmSandbox.handleDbErrorSpy.calledOnce).toBe(true);

    const [msg, fnName, err] = dmSandbox.handleDbErrorSpy.getCall(0).args;
    expect(msg).toBe('Failed to remove item from collection: things');
    expect(fnName).toBe('removeItemFromCollection');
    expect(err).toBe(boom);
  });

  it('getAllInCollection returns items and bubbles errors when thrown', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    dmSandbox.mongo.getAllInCollection.resolves([{ id: 'a' }, { id: 'b' }]);
    const all = await dm.getAllInCollection<{ id: string }>('things');
    expect(all).toEqual([{ id: 'a' }, { id: 'b' }]);

    const boom = new Error('fail-all');
    dmSandbox.mongo.getAllInCollection.rejects(boom);

    await expect(dm.getAllInCollection('things')).rejects.toBe(boom);

    expect(dmSandbox.handleDbErrorSpy.calledOnce).toBe(true);

    const [msg, fnName, err] = dmSandbox.handleDbErrorSpy.getCall(0).args;
    expect(msg).toBe('Failed to retrieve items from collection: things');
    expect(fnName).toBe('getAllInCollection');
    expect(err).toBe(boom);
  });

  it('clearCollection calls adapter and bubbles errors', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    await expect(dm.clearCollection('things')).resolves.toBeUndefined();
    expect(dmSandbox.mongo.clearCollection.calledWith('things')).toBe(true);

    const boom = new Error('fail-clear');
    dmSandbox.mongo.clearCollection.rejects(boom);

    await expect(dm.clearCollection('things')).rejects.toBe(boom);

    expect(dmSandbox.handleDbErrorSpy.calledOnce).toBe(true);

    const [msg, fnName, err] = dmSandbox.handleDbErrorSpy.getCall(0).args;
    expect(msg).toBe('Failed to clear collection: things');
    expect(fnName).toBe('clearCollection');
    expect(err).toBe(boom);
  });

  it('isCollectionEmpty returns boolean and bubbles errors', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    dmSandbox.mongo.isCollectionEmpty.resolves(true);
    await expect(dm.isCollectionEmpty('things')).resolves.toBe(true);

    const boom = new Error('fail-empty');
    dmSandbox.mongo.isCollectionEmpty.rejects(boom);

    await expect(dm.isCollectionEmpty('things')).rejects.toBe(boom);

    expect(dmSandbox.handleDbErrorSpy.calledOnce).toBe(true);

    const [msg, fnName, err] = dmSandbox.handleDbErrorSpy.getCall(0).args;
    expect(msg).toBe('Failed to check if collection is empty: things');
    expect(fnName).toBe('isCollectionEmpty');
    expect(err).toBe(boom);
  });

  it('findItemByIdInCollection returns item and bubbles errors', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    dmSandbox.mongo.findItemByIdInCollection.resolves({ id: 't1', v: 1 });
    await expect(dm.findItemByIdInCollection<{ id: string; v: number }>('things', 't1')).resolves.toEqual({
      id: 't1',
      v: 1,
    });

    const boom = new Error('fail-findById');
    dmSandbox.mongo.findItemByIdInCollection.rejects(boom);

    await expect(dm.findItemByIdInCollection('things', 't1')).rejects.toBe(boom);

    expect(dmSandbox.handleDbErrorSpy.calledOnce).toBe(true);

    const [msg, fnName, err] = dmSandbox.handleDbErrorSpy.getCall(0).args;
    expect(msg).toBe('Failed to find item by ID in collection: things');
    expect(fnName).toBe('findItemByIdInCollection');
    expect(err).toBe(boom);
  });

  it('findItemsInCollection returns null for falsy input, list for happy path, and bubbles errors', async () => {
    const dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);

    // @ts-expect-error intentional bad input
    await expect(dm.findItemsInCollection('things', null)).resolves.toBeNull();
    await expect(dm.findItemsInCollection('', { a: 1 })).resolves.toBeNull();

    const result = [{ id: 'x' }, { id: 'y' }];
    dmSandbox.mongo.findItemsInCollection.resolves(result);

    await expect(dm.findItemsInCollection('things', { active: true })).resolves.toEqual(result);

    const boom = new Error('fail-findItems');
    dmSandbox.mongo.findItemsInCollection.rejects(boom);

    await expect(dm.findItemsInCollection('things', { a: 1 })).rejects.toBe(boom);

    expect(dmSandbox.handleDbErrorSpy.calledOnce).toBe(true);

    const [msg, fnName, err] = dmSandbox.handleDbErrorSpy.getCall(0).args;
    expect(msg).toBe('Failed to find items by criteria: [object Object] in collection: things');
    expect(fnName).toBe('findItemsInCollection');
    expect(err).toBe(boom);
  });

  it('getChangeStream requires init and delegates to adapter', async () => {
    const dm = DataManager.getInstance();

    expect(() => dm.getChangeStream('things', CollectionChangeType.INSERT)).toThrow(
      'DataManager has not been initialized',
    );

    await dm.init(DBType.MONGO);

    const fakeStream = new Readable({ read() {} }) as unknown as Readable;
    dmSandbox.mongo.getCollectionChangeReadable.returns(fakeStream);

    const out = dm.getChangeStream('things', CollectionChangeType.INSERT);

    expect(out).toBe(fakeStream);
    expect(
      dmSandbox.mongo.getCollectionChangeReadable.calledWith('things', CollectionChangeType.INSERT),
    ).toBe(true);
  });
});
