import { MongoMemoryReplSet } from 'mongodb-memory-server';
import sinon from 'sinon';
import DataManager from '../data-manager';
import { MongoDBManager } from '../mongo/mongo-data-manager';
import { ChangeListenerManager } from '../change-listener.manager';
import { USERS } from '../data-manager.constants';
import { loggerSpies } from '../../__tests__/testkit';

describe('DataManager (integration)', () => {
  let repl: MongoMemoryReplSet;
  let uri: string;
  let dm: DataManager;
  let logs: ReturnType<typeof loggerSpies>;
  let sb: sinon.SinonSandbox;

  beforeAll(async () => {
    sb = sinon.createSandbox();
    logs = loggerSpies();

    repl = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });
    uri = repl.getUri();

    const realInit = MongoDBManager.init.bind(MongoDBManager);
    sb.stub(MongoDBManager, 'init').callsFake(() => realInit(uri, 'dm-int-test'));

    dm = DataManager.getInstance();
    await dm.init();
  });

  afterAll(async () => {
    await dm.close();
    await repl.stop();

    logs.restore();
    sb.restore();
  });

  it('can ensure a store and insert + read items', async () => {
    await dm.ensureStore(USERS);

    const created = await dm.addItemToCollection(USERS, {
      name: 'Alice',
      role: 'admin',
    });

    const createdAny = created as any;
    const createdId =
      typeof createdAny?.id === 'string' ? createdAny.id : (createdAny?.id as any)?.id;

    expect(createdId).toBeTruthy();
    expect(createdAny).toMatchObject({ name: 'Alice', role: 'admin' });

    const all = await dm.getAllInCollection<typeof createdAny>(USERS);
    expect(all).not.toBeNull();
    expect(all!.length).toBeGreaterThan(0);
  });

  it('can update and delete items by id through the DataManager', async () => {
    const inserted = await dm.addItemToCollection(USERS, {
      name: 'Bob',
      role: 'user',
    });

    const insertedAny = inserted as any;
    const id = typeof insertedAny?.id === 'string' ? insertedAny.id : (insertedAny?.id as any)?.id;

    const updated = await dm.updateItemByIdInCollection(USERS, id, {
      role: 'power-user',
    });
    expect(updated).not.toBeNull();

    const removed = await dm.removeItemFromCollection(USERS, id);
    expect(removed).toBe(true);
  });

  it('can clear a collection and check emptiness', async () => {
    await dm.ensureStore('logs');

    await dm.addItemToCollection('logs', { msg: 'first' });
    const notEmpty = await dm.isCollectionEmpty('logs');
    expect(notEmpty).toBe(false);

    await dm.clearCollection('logs');

    const isEmpty = await dm.isCollectionEmpty('logs');
    expect(isEmpty).toBe(true);
  });

  it('calls change listener manager on close', async () => {
    const clm = ChangeListenerManager.getInstance();
    const clearSpy = sb.spy(clm, 'clearChangeListeners');

    await dm.close();

    expect(clearSpy.called).toBe(true);

    await dm.init();
  });
});
