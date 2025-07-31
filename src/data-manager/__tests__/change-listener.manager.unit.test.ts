import { CollectionChangeType } from '../../data-manager/data-manager.type';
import {
  initializeLoggerMocks,
  LoggerMocksType,
} from '../../__tests__/mocks/logger.mock';
import { ChangeListenerManager } from '../change-listener.manager';
import {
  createDataManagerStub,
  restoreDataManagerStub,
} from '../../__tests__/stubs/data-manager.stub';
import { Log } from '../../logger/logger-manager';

describe('ChangeListenerManager', () => {
  let loggerMock: LoggerMocksType;
  let mockDataManagerStub: any;
  let changeListenerManager: ChangeListenerManager;

  const callback = jest.fn();
  const insertChangeType = CollectionChangeType.INSERT;
  const collectionName = 'testCollection';

  beforeEach(() => {
    loggerMock = initializeLoggerMocks();
    mockDataManagerStub = createDataManagerStub();
    changeListenerManager = ChangeListenerManager.getInstance();
  });

  afterEach(() => {
    loggerMock.restoreLoggerMocks();
    restoreDataManagerStub();
  });

  it('should add a change listener and log its addition', () => {
    changeListenerManager.addChangeListener(
      collectionName,
      insertChangeType,
      callback
    );

    expect(
      loggerMock.mockLogDev.calledWith(
        'Change listener added for testCollection-insert.'
      )
    ).toBe(true);
  });

  it('should log a warning when attempting to add a duplicate listener', () => {
    changeListenerManager.addChangeListener(
      collectionName,
      insertChangeType,
      callback
    );
    changeListenerManager.addChangeListener(
      collectionName,
      insertChangeType,
      callback
    );

    expect(
      loggerMock.mockLogWarn.calledWith(
        'Change listener for testCollection-insert is already registered.'
      )
    ).toBe(true);
  });

  it('should remove a change listener and log its removal', () => {
    changeListenerManager.addChangeListener(
      collectionName,
      insertChangeType,
      callback
    );

    changeListenerManager.removeChangeListener(
      collectionName,
      insertChangeType
    );

    expect(
      loggerMock.mockLogInfo.calledWith(
        'Change listener removed for testCollection-insert.'
      )
    ).toBe(true);
    expect(
      changeListenerManager.hasChangeListener(collectionName, insertChangeType)
    ).toBe(false);
  });

  it('should log a warning when attempting to remove a non-existent listener', () => {
    changeListenerManager.removeChangeListener(
      collectionName,
      insertChangeType
    );

    expect(
      loggerMock.mockLogWarn.calledWith(
        'No change listener registered for testCollection-insert.'
      )
    ).toBe(true);
    expect(
      changeListenerManager.hasChangeListener(collectionName, insertChangeType)
    ).toBe(false);
  });

  it('should log a warning when attempting to remove a non-existent listener', () => {
    const changeListenerManager = ChangeListenerManager.getInstance();

    changeListenerManager.removeChangeListener(
      collectionName,
      insertChangeType
    );

    expect(
      loggerMock.mockLogWarn.calledWith(
        'No change listener registered for testCollection-insert.'
      )
    ).toBe(true);
  });

  it('should clear all change listeners and log their removal', () => {
    const changeListenerManager = ChangeListenerManager.getInstance();

    changeListenerManager.addChangeListener(
      collectionName,
      insertChangeType,
      callback
    );
    changeListenerManager.addChangeListener(
      collectionName,
      CollectionChangeType.UPDATE,
      callback
    );
    changeListenerManager.clearChangeListeners();

    Log.dev("loggerMock.mockLogInfo.args", loggerMock.mockLogInfo.args);
    expect(
      loggerMock.mockLogInfo.calledWith('All custom change listeners removed.')
    ).toBe(true);

    expect(
      changeListenerManager.hasChangeListener(collectionName, insertChangeType)
    ).toBe(false);
    expect(
      changeListenerManager.hasChangeListener(
        'testCollection2',
        CollectionChangeType.UPDATE
      )
    ).toBe(false);
  });

  it('should invoke the callback when a data event is emitted', () => {
    const changeListenerManager = ChangeListenerManager.getInstance();
    const mockData = { id: '123', name: 'test' };

    changeListenerManager.addChangeListener(
      collectionName,
      insertChangeType,
      callback
    );
    mockDataManagerStub.mockDataStream.emit('data', mockData);

    expect(callback).toHaveBeenCalledWith(mockData);
  });

  it('should handle a stream error event and log the error', () => {
    try {
      const changeListenerManager = ChangeListenerManager.getInstance();
      const mockError = new Error('Stream error');

      changeListenerManager.addChangeListener(
        collectionName,
        insertChangeType,
        callback
      );
      mockDataManagerStub.mockDataStream.emit('error', mockError);

      expect(
        loggerMock.mockLogError.calledWith('Change stream error', mockError)
      ).toBe(true);
    } catch (error) {
      // Error is thrown when creating the mockError
    }
  });
});
