import sinon from 'sinon';
import DataManager from '../../data-manager/data-manager';
import * as HelpersModule from '../../data-manager/data-manager.helpers';
import { PROTECTED } from '../../data-manager/data-manager.constants';
import { ProtectedManager } from '../protected-manager';

describe('ProtectedManager (unit)', () => {
  let sb: sinon.SinonSandbox;
  let dm: ReturnType<typeof DataManager.getInstance>;
  let handleDbErrorStub: sinon.SinonStub;

  beforeEach(() => {
    sb = sinon.createSandbox();

    dm = DataManager.getInstance();

    // DataManager stubs
    sb.stub(dm, 'init').resolves();
    sb.stub(dm, 'ensureStore').resolves();
    sb.stub(dm, 'ensureIndexes').resolves();
    sb.stub(dm, 'getInitializationStatus').returns(true);
    sb.stub(dm, 'getAllInCollection').resolves([]);
    sb.stub(dm, 'addItemToCollection').resolves(null as any);
    sb.stub(dm, 'updateItemByIdInCollection').resolves(null as any);
    sb.stub(dm, 'removeItemFromCollection').resolves(false);
    sb.stub(dm, 'clearCollection').resolves();
    sb.stub(dm, 'findItemsInCollection').resolves();

    /**
     * handleDbError stub
     *
     * We support both call styles:
     *   handleDbError(message, error)
     *   handleDbError(message, methodName, error)
     *
     * and always rethrow the underlying Error (if present), or a new Error(message).
     */
    handleDbErrorStub = sb
      .stub(HelpersModule, 'handleDbError')
      .callsFake((...args: unknown[]): never => {
        const [message, maybeMethod, maybeError] = args;
        const msg = String(message);
        const error = maybeError ?? maybeMethod;

        const err = error instanceof Error ? error : new Error(String(error ?? msg));

        (err as any).dbMessage = msg;
        throw err;
      });
  });

  afterEach(() => {
    sb.restore();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init: initializes DM, ensures store/indexes', async () => {
    // arrange a couple of docs for refreshCache
    (dm.getAllInCollection as sinon.SinonStub).resolves([
      { _id: 'u1', uniqueIdentifier: 'a', attributes: { x: 1 } },
    ]);

    await expect(ProtectedManager.init()).resolves.toBeUndefined();
    sinon.assert.calledOnce(dm.init as sinon.SinonStub);
    sinon.assert.calledWith(dm.ensureStore as sinon.SinonStub, PROTECTED);
    sinon.assert.calledWith(dm.ensureIndexes as sinon.SinonStub, PROTECTED, [
      {
        name: 'uniq_user_identifier_namespace',
        key: { uniqueIdentifier: 1, namespace: 1 },
        unique: true,
      },
    ]);
  });

  it('getProtectedAttributes: query items, return null if no item found, return the requested subset of attributes (undefined if an attribute not found).', async () => {
    // query items
    // arrange
    const dbDoc = {
      _id: 'pa1',
      uniqueIdentifier: 'user1',
      namespace: 'ns1',
      attributes: {
        attr1: 'value1',
        attr2: 'value2',
        attr3: 'value3',
      },
    };
    (dm.findItemsInCollection as sinon.SinonStub).resolves([dbDoc]);

    // act
    const result = await ProtectedManager.getProtectedAttributes('user1', 'ns1', [
      'attr1',
      'attr3',
    ]);

    // assert
    expect(result).toEqual({
      attr1: 'value1',
      attr3: 'value3',
    });
    sinon.assert.calledWith(dm.findItemsInCollection as sinon.SinonStub, PROTECTED, {
      uniqueIdentifier: 'user1',
      namespace: 'ns1',
    });

    // if item not found, return null
    (dm.findItemsInCollection as sinon.SinonStub).resolves([]);
    const resultNotFound = await ProtectedManager.getProtectedAttributes('userX', 'nsX', [
      'attr1',
      'attr3',
    ]);
    expect(resultNotFound).toBeNull();

    // if attribute not found, return undefined for that attribute
    (dm.findItemsInCollection as sinon.SinonStub).resolves([dbDoc]);
    const resultAttrNotFound = await ProtectedManager.getProtectedAttributes('user1', 'ns1', [
      'attr1',
      'attrX',
    ]);
    expect(resultAttrNotFound).toEqual({
      attr1: 'value1',
      attrX: undefined,
    });
  });

  it('getProtectedAttributes: on DM error calls handleDbError (throws)', async () => {
    (dm.findItemsInCollection as sinon.SinonStub).rejects(new Error('fail-read'));

    await expect(
      ProtectedManager.getProtectedAttributes('userX', 'nsX', ['attr1', 'attr3']),
    ).rejects.toThrow('fail-read');

    // Support both 2-arg and 3-arg styles; we only care that:
    //  - message is "Failed to get protected attributes:"
    //  - an Error instance is passed somewhere after it
    sinon.assert.calledWithMatch(
      handleDbErrorStub,
      'Failed to get protected attributes:',
      sinon.match.any,
      sinon.match.instanceOf(Error),
    );
  });

  it('setProtectedAttributes: set attributes, create a new record if not found, return the requested update the same as the parameter.', async () => {
    // arrange
    const dbDoc = {
      _id: 'pa1',
      uniqueIdentifier: 'user1',
      namespace: 'ns1',
      attributes: {
        attr1: 'value1',
        attr2: 'value2',
      },
    };
    (dm.findItemsInCollection as sinon.SinonStub).resolves([dbDoc]);
    (dm.updateItemByIdInCollection as sinon.SinonStub).resolves({
      ...dbDoc,
      attributes: {
        attr1: 'newValue1',
        attr2: 'value2',
        attr3: 'value3',
      },
    });

    // act
    const update = {
      attr1: 'newValue1',
      attr3: 'value3',
    };
    const result = await ProtectedManager.setProtectedAttributes('user1', 'ns1', update);

    // assert
    expect(result).toEqual(update);

    sinon.assert.calledWith(dm.findItemsInCollection as sinon.SinonStub, PROTECTED, {
      uniqueIdentifier: 'user1',
      namespace: 'ns1',
    });
    sinon.assert.calledWith(dm.updateItemByIdInCollection as sinon.SinonStub, PROTECTED, 'pa1', {
      attributes: {
        attr1: 'newValue1',
        attr2: 'value2',
        attr3: 'value3',
      },
    });

    // if item not found, create the document and return the same attributes
    const newRecord = {
      uniqueIdentifier: `userX`,
      namespace: `nsX`,
      attributes: { ...update },
    };
    (dm.findItemsInCollection as sinon.SinonStub).resolves([]);
    (dm.addItemToCollection as sinon.SinonStub).resolves(newRecord);
    const resultNewAttributes = await ProtectedManager.setProtectedAttributes(
      newRecord.uniqueIdentifier,
      newRecord.namespace,
      update,
    );
    expect(resultNewAttributes).toEqual(update);
  });

  it('setProtectedAttributes: on DM error calls handleDbError (throws)', async () => {
    const dbDoc = {
      _id: 'pa1',
      uniqueIdentifier: 'user1',
      namespace: 'ns1',
      attributes: {
        attr1: 'value1',
        attr2: 'value2',
        attr3: 'value3',
      },
    };

    (dm.findItemsInCollection as sinon.SinonStub).resolves([dbDoc]);
    (dm.updateItemByIdInCollection as sinon.SinonStub).rejects(new Error('fail-update'));

    const update = {
      attr1: 'newValue1',
      attr3: 'value3',
    };
    await expect(ProtectedManager.setProtectedAttributes('userX', 'nsX', update)).rejects.toThrow(
      'fail-update',
    );

    // Support both 2-arg and 3-arg styles; we only care that:
    //  - message is "Failed to get protected attributes:"
    //  - an Error instance is passed somewhere after it
    sinon.assert.calledWithMatch(
      handleDbErrorStub,
      'Failed to set protected attributes:',
      sinon.match.any,
      sinon.match.instanceOf(Error),
    );
  });

  it('deleteProtectedAttributes: delete attributes, return true if no item found, return true if deleted, false otherwise.', async () => {
    // arrange
    const dbDoc = {
      _id: 'pa1',
      uniqueIdentifier: 'user1',
      namespace: 'ns1',
      attributes: {
        attr1: 'value1',
        attr2: 'value2',
        attr3: 'value3',
      },
    };
    (dm.findItemsInCollection as sinon.SinonStub).resolves([dbDoc]);
    (dm.updateItemByIdInCollection as sinon.SinonStub).resolves({
      ...dbDoc,
      attributes: {
        attr2: 'value2',
      },
    });

    // act
    const result = await ProtectedManager.deleteProtectedAttributes('user1', 'ns1', [
      'attr1',
      'attr3',
    ]);

    // assert
    expect(result).toBe(true);

    sinon.assert.calledWith(dm.findItemsInCollection as sinon.SinonStub, PROTECTED, {
      uniqueIdentifier: 'user1',
      namespace: 'ns1',
    });
    sinon.assert.calledWith(dm.updateItemByIdInCollection as sinon.SinonStub, PROTECTED, 'pa1', {
      attributes: {
        attr2: 'value2',
      },
    });

    // if item not found, return false
    (dm.findItemsInCollection as sinon.SinonStub).resolves([]);
    const resultNotFound = await ProtectedManager.deleteProtectedAttributes('userX', 'nsX', [
      'attr1',
      'attr3',
    ]);
    expect(resultNotFound).toBe(false);
  });

  it('deleteProtectedAttributes: on DM error calls handleDbError (throws)', async () => {
    // arrange
    const dbDoc = {
      _id: 'pa1',
      uniqueIdentifier: 'user1',
      namespace: 'ns1',
      attributes: {
        attr1: 'value1',
        attr2: 'value2',
        attr3: 'value3',
      },
    };
    (dm.findItemsInCollection as sinon.SinonStub).resolves([dbDoc]);
    (dm.updateItemByIdInCollection as sinon.SinonStub).rejects(new Error('fail-delete'));

    // act & assert
    await expect(
      ProtectedManager.deleteProtectedAttributes('user1', 'ns1', ['attr1', 'attr3']),
    ).rejects.toThrow('fail-delete');

    // Support both 2-arg and 3-arg styles; we only care that:
    //  - message is "Failed to get protected attributes:"
    //  - an Error instance is passed somewhere after it
    sinon.assert.calledWithMatch(
      handleDbErrorStub,
      'Failed to delete protected attributes:',
      sinon.match.any,
      sinon.match.instanceOf(Error),
    );
  });
});
