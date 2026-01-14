import sinon from 'sinon';
import { ChangeListenerManager } from '../change-listener.manager';
import { CollectionChangeType } from '../../data-manager/data-manager.type';
import { push, resetSingleton } from '../../__tests__/helpers';
import { mockDataManager, loggerSpies } from '../../__tests__/testkit';

describe('ChangeListenerManager (integration)', () => {
  let manager: ChangeListenerManager;

  beforeEach(() => {
    resetSingleton(ChangeListenerManager);
    manager = ChangeListenerManager.getInstance();
  });

  it('emits on matching collection/type and calls the callback', () => {
    const dm = mockDataManager();
    const logs = loggerSpies();

    const userCb = sinon.spy();
    manager.addChangeListener('users', CollectionChangeType.INSERT, userCb);

    const stream = dm.getStream('users', CollectionChangeType.INSERT);
    const payload = { id: 'u1', name: 'Ada' };

    push(stream, payload);

    expect(userCb.calledOnce).toBe(true);
    expect(userCb.calledWith(payload)).toBe(true);

    const lastLog = logs.last();
    expect(lastLog?.entry.severity).toBe('DEBUG');
    expect(lastLog?.ctx).toMatchObject({ testSuite: 'unit' });

    logs.restore();
    dm.restore();
  });

  it('can manage multiple listeners at once', () => {
    const dm = mockDataManager();

    const userCb = sinon.spy();
    const taskCb = sinon.spy();

    manager.addChangeListener('users', CollectionChangeType.INSERT, userCb);
    manager.addChangeListener('tasks', CollectionChangeType.UPDATE, taskCb);

    push(dm.getStream('users', CollectionChangeType.INSERT), { id: 'u2' });
    push(dm.getStream('tasks', CollectionChangeType.UPDATE), { id: 't9' });

    expect(userCb.calledOnce).toBe(true);
    expect(taskCb.calledOnce).toBe(true);

    dm.restore();
  });
});
