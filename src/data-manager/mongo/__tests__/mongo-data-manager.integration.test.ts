import { MongoMemoryReplSet } from 'mongodb-memory-server';
import * as mongoDB from 'mongodb';
import { MongoDBManager } from '../mongo-data-manager';
import { loggerSpies } from '../../../__tests__/testkit';

describe('MongoDBManager (integration)', () => {
  let repl: MongoMemoryReplSet;
  let uri: string;
  let logs: ReturnType<typeof loggerSpies>;

  beforeAll(async () => {
    logs = loggerSpies();

    repl = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });
    uri = repl.getUri();

    await MongoDBManager.init(uri, 'test-db');
  });

  afterAll(async () => {
    await MongoDBManager.close();
    await repl.stop();
    logs.restore();
  });

  it('creates a collection via ensureStore', async () => {
    await MongoDBManager.ensureStore('users');

    const client = new mongoDB.MongoClient(uri);
    await client.connect();
    const db = client.db('test-db');

    const found = await db.listCollections({ name: 'users' }, { nameOnly: true }).hasNext();

    await client.close();

    expect(found).toBe(true);
  });

  it('can insert, fetch by id, update, and delete', async () => {
    const insertedId = await MongoDBManager.addItemToCollection('users', {
      name: 'Alice',
      role: 'admin',
    });

    expect(typeof insertedId).toBe('string');

    const found = await MongoDBManager.findItemByIdInCollection('users', insertedId);
    expect(found).not.toBeNull();
    expect(found).toMatchObject({ name: 'Alice', role: 'admin' });

    const updated = await MongoDBManager.updateItemInCollection('users', insertedId, {
      role: 'user',
    });
    expect(updated).not.toBeNull();
    expect(updated).toMatchObject({ id: insertedId, name: 'Alice', role: 'user' });

    const all = await MongoDBManager.getAllInCollection('users');
    expect(all.length).toBeGreaterThan(0);
    expect(all).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: insertedId, name: 'Alice', role: 'user' }),
      ]),
    );

    const removed = await MongoDBManager.removeItemFromCollection('users', insertedId);
    expect(removed).toBe(true);

    const cleared = await MongoDBManager.clearCollection('users');
    expect(cleared).toBe(true);
  });

  it('can create indexes that show up in listIndexes', async () => {
    await MongoDBManager.ensureStore('indexed');

    await MongoDBManager.ensureIndexes('indexed', [
      {
        name: 'by_name',
        key: { name: 1 },
        unique: false,
      },
    ]);

    const client = new mongoDB.MongoClient(uri);
    await client.connect();
    const db = client.db('test-db');
    const coll = db.collection('indexed');

    const indexes = await coll.listIndexes().toArray();

    await client.close();

    const names = indexes.map((i) => i.name);
    expect(names).toContain('by_name');
  });
});
