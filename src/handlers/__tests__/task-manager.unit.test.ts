import sinon from 'sinon';
import { LoggerMocksType } from '../../__tests__/mocks/logger.mock';
import { Task, TaskStep, HandlerType, TaskRegistration } from '../../handlers/handler.type';
import { JEvent } from '../../event/event.type';
import { JUser } from '../../user-manager/user.type';
import { initializeLoggerMocks } from '../../__tests__/mocks/logger.mock';
import { registerTask, getTaskByName } from '../../handlers/task.manager';
import { executeStep } from '../../handlers/steps.helpers';
import { executeTask } from '../../handlers/task.manager';
import { recordResult } from '../../event/record-result';

jest.mock('../steps.helpers', () => ({
  executeStep: jest.fn(),
}));
jest.mock('../../event/record-result', () => ({
  recordResult: jest.fn(),
}));

describe('Task Manager', () => {
  let loggerMocks: LoggerMocksType;

  const mockTask: Task = {
    name: 'mockTask',
    type: HandlerType.TASK,
    shouldActivate: jest.fn(),
    doAction: jest.fn(),
  };

  const mockEvent: JEvent = {
    id: 'event123',
    eventType: 'MOCK_EVENT',
    generatedTimestamp: new Date(),
  };

  const mockUser: JUser = {
    id: 'user123',
    uniqueIdentifier: 'user123',
    attributes: { 
      preferredName: 'Test User' 
    }
  };

  beforeEach(() => {
    loggerMocks = initializeLoggerMocks();
  });

  afterEach(() => {
    loggerMocks.resetLoggerMocks();
    loggerMocks.restoreLoggerMocks();
    (executeStep as jest.Mock).mockClear();
    (recordResult as jest.Mock).mockClear();
  });

  it('should register a task successfully and log info', () => {
    const task: TaskRegistration = {
      name: 'testTask',
      shouldActivate: jest.fn(),
      doAction: jest.fn(),
    };

    registerTask(task);

    const registeredTask = getTaskByName(task.name);

    expect(registeredTask).toBeDefined();
    expect(registeredTask?.name).toBe(task.name);
    expect(registeredTask?.type).toBe(HandlerType.TASK);

    sinon.assert.calledOnceWithExactly(
      loggerMocks.mockLogInfo,
      'Task "testTask" registered successfully.'
    );
  });

  it('should return the registered task if it exists', () => {
    const taskName = 'mockTask';
    registerTask({
      name: taskName,
      shouldActivate: jest.fn(),
      doAction: jest.fn(),
    });

    const task = getTaskByName(taskName);

    expect(task).toBeDefined();
    expect(task?.name).toBe(taskName);
  });

  it('should return undefined for an unregistered task', () => {
    const task = getTaskByName('nonExistentTask');
    expect(task).toBeUndefined();
  });

  describe('executeTask', () => {
    it('should execute a task successfully when all steps succeed and log info', async () => {
      (executeStep as jest.Mock).mockResolvedValueOnce({
        step: TaskStep.SHOULD_ACTIVATE,
        result: { status: 'success' },
      });
      (executeStep as jest.Mock).mockResolvedValueOnce({
        step: TaskStep.DO_ACTION,
        result: { status: 'success' },
      });

      await executeTask(mockTask, mockEvent, mockUser);

      sinon.assert.calledWithExactly(
        loggerMocks.mockLogInfo,
        `Executing task "mockTask" for user "user123" in event "MOCK_EVENT".`
      );

      sinon.assert.calledWithExactly(
        loggerMocks.mockLogInfo,
        `Completed execution of task "mockTask" for user "user123".`
      );

      expect(recordResult).toHaveBeenCalledWith({
        event: mockEvent,
        name: mockTask.name,
        steps: [
          { step: TaskStep.SHOULD_ACTIVATE, result: { status: 'success' } },
          { step: TaskStep.DO_ACTION, result: { status: 'success' } },
        ],
        user: mockUser,
      });
    });

    it('should log an error if an exception occurs during execution', async () => {
      (executeStep as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      await executeTask(mockTask, mockEvent, mockUser);

      sinon.assert.calledWithExactly(
        loggerMocks.mockLogError,
        `Error executing task "mockTask" for user "user123": Error: Test error`
      );

      expect(recordResult).toHaveBeenCalledTimes(1);
    });
  });
});
