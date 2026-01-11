/**
 * System / sanity tests for @just-in/core
 *
 * Goals:
 * - Exercise the same public APIs a third-party app would use.
 * - Use real infrastructure pieces (MongoMemoryReplSet + MongoDBManager + DataManager + UserManager).
 * - Stub ONLY the logger plumbing (via loggerSpies) so we can assert log behavior.
 *
 * This file is intentionally focused on "happy path" workflows rather than every edge case.
 */

import { MongoMemoryReplSet } from 'mongodb-memory-server';
import sinon from 'sinon';

import DataManager from '../../data-manager/data-manager';
import { MongoDBManager } from '../../data-manager/mongo/mongo-data-manager';
import { UserManager, TestingUserManager } from '../../user-manager/user-manager';
import { DBType, USERS } from '../../data-manager/data-manager.constants';
import { loggerSpies } from '../mocks';

describe('@just-in/core system / sanity tests', () => {
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
    sb.stub(MongoDBManager, 'init').callsFake((conn?: string, dbName?: string) => {
      return realInit(uri, 'core-system-test');
    });

    dm = DataManager.getInstance();
    await dm.init(DBType.MONGO);
    await dm.ensureStore(USERS);
    await UserManager.init();
  });

  afterAll(async () => {
    // Try to shut down in roughly the order a real app would
    try {
      UserManager.shutdown();
      await dm.close();
      await repl.stop();
    } catch {
    }

    logs.restore();
    sb.restore();
  });

  it('performs a basic user lifecycle end-to-end via public APIs', async () => {
    const created = await UserManager.addUser({
      uniqueIdentifier: 'system-u1',
      initialAttributes: { mood: 'ok', count: 1 },
    });

    expect(created).not.toBeNull();
    expect(created).toMatchObject({
      uniqueIdentifier: 'system-u1',
      attributes: { mood: 'ok', count: 1 },
    });

    const createdId = created!.id as string;
    expect(typeof createdId).toBe('string');

    // Cache should now contain this user (we look via TestingUserManager just for introspection)
    const cachedAfterCreate = TestingUserManager._users.get(createdId);
    expect(cachedAfterCreate).toEqual(created);

    // --- Read ------------------------------------------------------------------
    const allUsers = TestingUserManager.getAllUsers();
    expect(allUsers).toEqual(
      expect.arrayContaining([expect.objectContaining({ uniqueIdentifier: 'system-u1' })]),
    );

    const byIdentifier = TestingUserManager.getUserByUniqueIdentifier('system-u1');
    expect(byIdentifier).not.toBeNull();
    expect(byIdentifier).toMatchObject({
      id: createdId,
      uniqueIdentifier: 'system-u1',
    });

    // --- Update ----------------------------------------------------------------
    const updated = await TestingUserManager.updateUserById(createdId, {
      count: 2,
    });

    expect(updated).not.toBeNull();
    expect(updated).toMatchObject({
      id: createdId,
      uniqueIdentifier: 'system-u1',
      attributes: { mood: 'ok', count: 2 },
    });

    const cachedAfterUpdate = TestingUserManager._users.get(createdId);
    expect(cachedAfterUpdate).toEqual(updated);

    // Optionally verify the same record exists in Mongo through DataManager
    const allFromDb = await dm.getAllInCollection<typeof updated>(USERS);
    expect(allFromDb).not.toBeNull();
    expect(allFromDb).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdId,
          uniqueIdentifier: 'system-u1',
        }),
      ]),
    );

    // --- Delete ----------------------------------------------------------------
    const deletedOk = await TestingUserManager.deleteUserById(createdId);
    expect(deletedOk).toBe(true);
    expect(TestingUserManager._users.has(createdId)).toBe(false);

    const allAfterDelete = await dm.getAllInCollection<typeof updated>(USERS);
    const stillThere = (allAfterDelete ?? []).find((u) => u.id === createdId);
    expect(stillThere).toBeUndefined();

    // --- Logging sanity check --------------------------------------------------
    // We don't assert every log, just that at least one INFO log fired.
    const infoLogs = logs.captured.filter((c) => c.entry.severity === 'INFO');
    expect(infoLogs.length).toBeGreaterThan(0);
  });

  it('supports bulk user creation via addUsers and reflects it in cache + DB', async () => {
    // Given no users
    TestingUserManager._users.clear();
    await dm.clearCollection(USERS);

    const added = await UserManager.addUsers([
      { uniqueIdentifier: 'system-bulk-1', initialAttributes: { foo: 1 } },
      { uniqueIdentifier: 'system-bulk-2', initialAttributes: { bar: 2 } },
    ]);

    expect(added).toHaveLength(2);
    expect(added).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ uniqueIdentifier: 'system-bulk-1' }),
        expect.objectContaining({ uniqueIdentifier: 'system-bulk-2' }),
      ]),
    );

    // Cache should reflect both users
    const allCached = TestingUserManager.getAllUsers();
    expect(allCached).toHaveLength(2);

    // DB should also have both records
    const allFromDb = await dm.getAllInCollection<(typeof added)[0]>(USERS);
    expect(allFromDb).not.toBeNull();
    expect(allFromDb!.length).toBe(2);

    // And logger should have recorded a summary info
    const summaryLog = logs.captured.find(
      (c) =>
        c.entry.severity === 'INFO' &&
        typeof c.entry.message === 'string' &&
        c.entry.message.includes('user(s) added'),
    );
    expect(summaryLog).toBeDefined();
  });
});
