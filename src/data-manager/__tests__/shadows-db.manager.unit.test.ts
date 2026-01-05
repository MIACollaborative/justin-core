import sinon from "sinon";
import { ShadowsDBManager } from "../shadows/shadows-db.manager";
import DataManager from "../data-manager";
import { USERS } from "../data-manager.constants";
import { DEFAULT_COLLECTIONS_TO_SHADOW, DEFAULT_SHADOW_COLLECTION_SUFFIX } from "../shadows/shadows-db.manager.type";

describe('shadows-db.manager.ts tests', () => {

  let sb: sinon.SinonSandbox;
  let dm: DataManager;

  beforeEach(() => {
    sb = sinon.createSandbox();

    dm = DataManager.getInstance();

    sb.stub(dm, 'init').resolves();
    sb.stub(dm, 'ensureStore').resolves();
    sb.stub(dm, 'getInitializationStatus').returns(true);

    sb.stub(dm, 'addItemToCollection').resolves(null as any);
    sb.stub(dm, 'on').resolves();
  });

  afterEach(() => {
    ShadowsDBManager.killInstance();
    sb.restore();
  });

  describe('init', () => {
    it('should initialize the shadows-db-manager without options', async () => {
      const shadowsDBManager = ShadowsDBManager.getInstance();
      await expect(shadowsDBManager.init()).resolves.toBeUndefined();
      expect(shadowsDBManager.getInitializationStatus()).toBe(true);
      sinon.assert.calledThrice(dm.on as sinon.SinonStub);

      const config = shadowsDBManager.getConfig();
      expect(config?.collectionsToShadow).toMatchObject(DEFAULT_COLLECTIONS_TO_SHADOW);
      expect(config?.shadowCollectionSuffix).toBe(DEFAULT_SHADOW_COLLECTION_SUFFIX);
      sinon.assert.calledWith(dm.ensureStore as sinon.SinonStub, `${USERS}${DEFAULT_SHADOW_COLLECTION_SUFFIX}`);
      sinon.assert.calledThrice(dm.on as sinon.SinonStub);
    });

    it('should initialize the shadows-db-manager with options', async () => {
      const shadowsDBManager = ShadowsDBManager.getInstance();

      const testConfig = { collectionsToShadow: ['TEST_COLLECTION', 'TEST_COLLECTION_2'], shadowCollectionSuffix: '_testSuffix' };

      await expect(shadowsDBManager.init(testConfig)).resolves.toBeUndefined();
      expect(shadowsDBManager.getInitializationStatus()).toBe(true);
      const config = shadowsDBManager.getConfig();
      
      expect(config?.collectionsToShadow).toMatchObject(testConfig.collectionsToShadow);
      expect(config?.shadowCollectionSuffix).toBe(testConfig.shadowCollectionSuffix);
      
      sinon.assert.calledTwice(dm.ensureStore as sinon.SinonStub);
      sinon.assert.calledWith(
        dm.ensureStore as sinon.SinonStub, 
        `${testConfig.collectionsToShadow[0]}${testConfig.shadowCollectionSuffix}`
      );
      sinon.assert.calledWith(
        dm.ensureStore as sinon.SinonStub, 
        `${testConfig.collectionsToShadow[1]}${testConfig.shadowCollectionSuffix}`
      );
      sinon.assert.callCount(dm.on as sinon.SinonStub, 6);

    });
  });
});