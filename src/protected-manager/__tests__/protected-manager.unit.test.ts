import sinon from 'sinon';
import DataManager from '../../data-manager/data-manager';
import * as HelpersModule from '../../data-manager/data-manager.helpers';
import { PROTECTED } from '../../data-manager/data-manager.constants';
import { ProtectedManager, TestingProtectedManager } from '../protected-manager';

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

    const result = await ProtectedManager.getProtectedAttributes('user1', 'ns1', [
      'attr1',
      'attr3',
    ]);

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
    // set attributes of an existing record
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

    const update = {
      attr1: 'newValue1',
      attr3: 'value3',
    };

    const result = await ProtectedManager.setProtectedAttributes('user1', 'ns1', update);

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
    const newData = {
      uniqueIdentifier: `userX`,
      namespace: `nsX`,
      attributes: { ...update },
    };
    (dm.findItemsInCollection as sinon.SinonStub).resolves([]);
    (dm.addItemToCollection as sinon.SinonStub).resolves(newData);
    const resultNewAttributes = await ProtectedManager.setProtectedAttributes(
      newData.uniqueIdentifier,
      newData.namespace,
      update,
    );
    expect(resultNewAttributes).toEqual(update);
    sinon.assert.calledWith(dm.addItemToCollection as sinon.SinonStub, PROTECTED, newData);
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
    //  - message is "Failed to set protected attributes:"
    //  - an Error instance is passed somewhere after it
    sinon.assert.calledWithMatch(
      handleDbErrorStub,
      'Failed to set protected attributes:',
      sinon.match.any,
      sinon.match.instanceOf(Error),
    );
  });

  it('deleteProtectedAttributes: delete attributes, return true if no item found, return true if deleted, false otherwise.', async () => {
    // delete attributes of an existing record
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

    const result = await ProtectedManager.deleteProtectedAttributes('user1', 'ns1', [
      'attr1',
      'attr3',
    ]);

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
    // database error on delete (update)
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

    await expect(
      ProtectedManager.deleteProtectedAttributes('user1', 'ns1', ['attr1', 'attr3']),
    ).rejects.toThrow('fail-delete');

    // Support both 2-arg and 3-arg styles; we only care that:
    //  - message is "Failed to delete protected attributes:"
    //  - an Error instance is passed somewhere after it
    sinon.assert.calledWithMatch(
      handleDbErrorStub,
      'Failed to delete protected attributes:',
      sinon.match.any,
      sinon.match.instanceOf(Error),
    );
  });

  // Testing other methods
  it('createProtectedAttributes: create a new record, return the provided attributes the same as the parameter.', async () => {
    // create a new record
    const newData = {
      uniqueIdentifier: 'user1',
      namespace: 'ns1',
      attributes: {
        attr1: 'value1',
        attr2: 'value2',
      },
    };
    (dm.addItemToCollection as sinon.SinonStub).resolves(newData);

    const result = await ProtectedManager.createProtectedAttributes(
      newData.uniqueIdentifier,
      newData.namespace,
      newData.attributes,
    );

    expect(result).toEqual(newData.attributes);
    sinon.assert.calledWith(dm.addItemToCollection as sinon.SinonStub, PROTECTED, { ...newData });
  });

  it('createProtectedAttributes: on DM error calls handleDbError (throws)', async () => {
    // database error on create
    const newData = {
      uniqueIdentifier: 'user1',
      namespace: 'ns1',
      attributes: {
        attr1: 'value1',
        attr2: 'value2',
      },
    };
    (dm.addItemToCollection as sinon.SinonStub).rejects(new Error('fail-create'));

    await expect(
      ProtectedManager.createProtectedAttributes(
        newData.uniqueIdentifier,
        newData.namespace,
        newData.attributes,
      ),
    ).rejects.toThrow('fail-create');

    // Support both 2-arg and 3-arg styles; we only care that:
    //  - message is "Failed to create protected attributes:"
    //  - an Error instance is passed somewhere after it
    sinon.assert.calledWithMatch(
      handleDbErrorStub,
      'Failed to create protected attributes:',
      sinon.match.any,
      sinon.match.instanceOf(Error),
    );
  });

  it('overrideProtectedAttributes: update a new record, return the provided attributes the same as the parameter.', async () => {
    // override a record
    const protectedDoc = {
      id: 'pa1',
      uniqueIdentifier: 'user1',
      namespace: 'ns1',
      attributes: {
        attr1: 'value1',
        attr2: 'value2',
      },
    };

    const attributesToUpdate = {
      attr2: 'newValue2',
      attr3: 'value3',
    };

    const updatedDoc = {
      ...protectedDoc,
      attributes: {
        ...protectedDoc.attributes,
        ...attributesToUpdate,
      },
    };

    (dm.updateItemByIdInCollection as sinon.SinonStub).resolves(updatedDoc);

    const result = await ProtectedManager.overrideProtectedAttributes(
      protectedDoc.id,
      updatedDoc.attributes
    );

    expect(result).toEqual(updatedDoc.attributes);
    sinon.assert.calledWith(
      dm.updateItemByIdInCollection as sinon.SinonStub,
      PROTECTED,
      protectedDoc.id,
      {
        attributes: { ...updatedDoc.attributes },
      },
    );
  });

  it('overrideProtectedAttributes: on DM error calls handleDbError (throws)', async () => {
    // datatbase error on update
    const newData = {
      uniqueIdentifier: 'user1',
      namespace: 'ns1',
      attributes: {
        attr1: 'value1',
        attr2: 'value2',
      },
    };
    (dm.updateItemByIdInCollection as sinon.SinonStub).rejects(new Error('fail-update'));

    await expect(
      ProtectedManager.overrideProtectedAttributes(
        newData.uniqueIdentifier,
        newData.attributes,
      ),
    ).rejects.toThrow('fail-update');

    // Support both 2-arg and 3-arg styles; we only care that:
    //  - message is "Failed to update protected attributes:"
    //  - an Error instance is passed somewhere after it
    sinon.assert.calledWithMatch(
      handleDbErrorStub,
      'Failed to update protected attributes:',
      sinon.match.any,
      sinon.match.instanceOf(Error),
    );
  });

  it('_getProtectedAttributesObject: query an item, return null if no item found, return the protected attributes object (_id to id).', async () => {
    // query an item
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

    const {_id, ...rest} = dbDoc;
    const transformObject = {id: dbDoc._id, ...rest};
    (dm.findItemsInCollection as sinon.SinonStub).resolves([dbDoc]);

    const result = await TestingProtectedManager._getProtectedAttributesObject('user1', 'ns1');

    expect(result).toEqual(transformObject);

    sinon.assert.calledWith(dm.findItemsInCollection as sinon.SinonStub, PROTECTED, {
      uniqueIdentifier: 'user1',
      namespace: 'ns1',
    });

    // if item not found, return null
    (dm.findItemsInCollection as sinon.SinonStub).resolves([]);
    const resultNotFound = await TestingProtectedManager._getProtectedAttributesObject('userX', 'nsX');
    expect(resultNotFound).toBeNull();
  });

  it('_getProtectedAttributesObject: on DM error calls handleDbError (throws)', async () => {
    // database error on read
    (dm.findItemsInCollection as sinon.SinonStub).rejects(new Error('fail-read'));

    await expect(
      TestingProtectedManager._getProtectedAttributesObject('userX', 'nsX'),
    ).rejects.toThrow('fail-read');

    // Support both 2-arg and 3-arg styles; we only care that:
    //  - message is "Failed to get protected attributes object:"
    //  - an Error instance is passed somewhere after it
    sinon.assert.calledWithMatch(
      handleDbErrorStub,
      'Failed to get protected attributes object:',
      sinon.match.any,
      sinon.match.instanceOf(Error),
    );
  });
});
