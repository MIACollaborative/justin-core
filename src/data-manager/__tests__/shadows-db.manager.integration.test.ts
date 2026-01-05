import { MongoMemoryReplSet } from 'mongodb-memory-server';
import sinon from "sinon";

import DataManager from "../data-manager";
import { ShadowsDBManager } from "../shadows/shadows-db.manager";
import { DBType, USERS } from "../data-manager.constants";
import { DEFAULT_COLLECTIONS_TO_SHADOW, DEFAULT_SHADOW_COLLECTION_SUFFIX, ShadowItem, ShadowOperation } from "../shadows/shadows-db.manager.type";

describe('testing integration of shadows db with data manager', () => {

  let sb: sinon.SinonSandbox;
  let dm: DataManager;
  let mongoMemoryDB: MongoMemoryReplSet;

  beforeAll(async () => {
    mongoMemoryDB = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });

    const uri = mongoMemoryDB.getUri();
    process.env.MONGO_URI = uri;
    process.env.DB_NAME = 'shadows-db-manager-integration-test';

    sb = sinon.createSandbox();
    dm = DataManager.getInstance();
  });


  afterAll(async () => {
    await mongoMemoryDB.stop();
    sb.restore();
  });

  describe('dm init', () => {
    beforeEach(async () => {
      await dm.init(DBType.MONGO);
    });
  
    afterEach(async () => {
      await dm.close();
    });

    it('should initialize the shadows-db-manager when specified in the data manager options', async () => {
      const enusureStoreSpy = sinon.spy(dm, 'ensureStore');
      
      const dbOptions = {
        enableShadowsDB: true,
      };
      await dm.close();
      await dm.init(DBType.MONGO, dbOptions);

      const shadowsDBManager = ShadowsDBManager.getInstance();
      expect(shadowsDBManager.getInitializationStatus()).toBe(true);
      sinon.assert.calledOnce(enusureStoreSpy);
      sinon.assert.calledWith(enusureStoreSpy, `${USERS}${DEFAULT_SHADOW_COLLECTION_SUFFIX}`);

      const config = shadowsDBManager.getConfig();
      expect(config?.collectionsToShadow).toMatchObject(DEFAULT_COLLECTIONS_TO_SHADOW);
      expect(config?.shadowCollectionSuffix).toBe(DEFAULT_SHADOW_COLLECTION_SUFFIX);
      enusureStoreSpy.restore();
      await shadowsDBManager.close();
    });

    it('should not initialize the shadows-db-manager when not specified in the data manager options', async () => {
      const enusureStoreSpy = sinon.spy(dm, 'ensureStore');
      await dm.close();
      await dm.init(DBType.MONGO);
      const shadowsDBManager = ShadowsDBManager.getInstance();
      expect(shadowsDBManager.getInitializationStatus()).toBe(false);
      sinon.assert.notCalled(enusureStoreSpy);
    });
  });

  describe('shadows db creates shadow items', () => {
    let shadowsDBManager: ShadowsDBManager;
    let addItemToCollectionSpy: sinon.SinonSpy;

    beforeEach(async () => {
      const dbOptions = {
        enableShadowsDB: true,
      };
      await dm.init(DBType.MONGO, dbOptions);
      shadowsDBManager = ShadowsDBManager.getInstance();
      addItemToCollectionSpy = sinon.spy(dm, 'addItemToCollection');
    });

    afterEach(async () => {
      await shadowsDBManager.close();
      await dm.close();
      addItemToCollectionSpy.restore();
    });

    it('should create a shadow item when an item is added to a collection', (done) => {

      const asyncTest = async () => {
        expect(shadowsDBManager.getInitializationStatus()).toBe(true);
        const addedItem = await dm.addItemToCollection(USERS, { name: 'John Doe', email: 'john.doe@example.com' });
        
        setTimeout(async () => {
          const shadowCollection = `${USERS}${DEFAULT_SHADOW_COLLECTION_SUFFIX}`;
          sinon.assert.calledTwice(addItemToCollectionSpy);
          sinon.assert.calledWith(addItemToCollectionSpy, USERS);
          sinon.assert.calledWith(addItemToCollectionSpy, shadowCollection);
          const shadowItems = await dm.getAllInCollection(shadowCollection);
          expect(shadowItems).not.toBeNull();
          expect(shadowItems!.length).toBe(1);
          const shadowItem:ShadowItem = shadowItems![0] as ShadowItem;
          expect(shadowItem.snapshotAfterOperation).toMatchObject(addedItem!);
          expect(shadowItem.operation).toBe(ShadowOperation.ADD);
          expect(shadowItem.timestamp).toBeDefined();
          done();
        }, 500);
      }; 
      asyncTest();
    });
  });
});