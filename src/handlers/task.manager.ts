import { ExecuteStepReturn, HandlerType, Task, TaskRegistration, TaskStep} from './handler.type';
import { Log } from '../logger/logger-manager';
import { executeStep } from './steps.helpers';
import { JEvent } from '../event/event.type';
import { JUser } from '../user-manager/user.type';
import {handleTaskResult} from "./result-recorder";

const tasks: Map<string, Task> = new Map();

/**
 * Registers a Task by its name, setting its type to `TASK` in the process.
 * @param {TaskRegistration} task - The task to register, with the `type` set to `TASK`.
 */
export const registerTask = (task: TaskRegistration): void => {
  tasks.set(task.name, { ...task, type: HandlerType.TASK });
  Log.info(`Task "${task.name}" registered successfully.`);
};

/**
 * Retrieves a Task by its name.
 * @param {string} name - The name of the Task to retrieve.
 * @returns {Task | undefined} - The Task if found, or undefined otherwise.
 */
export const getTaskByName = (name: string): Task | undefined => {
  return tasks.get(name);
};

/**
 * Executes a Task for a specific user and event.
 *
 * @param task - The Task to execute.
 * @param event - The triggering event.
 * @param user - The user for whom the Task is being executed.
 */
export async function executeTask(
  task: Task,
  event: JEvent,
  user: JUser
): Promise<void> {
  const results: ExecuteStepReturn<any>[] = [];

  try {
    Log.info(
      `Executing task "${task.name}" for user "${user.id}" in event "${event.eventType}".`
    );

    const shouldActivateResult = await executeStep(
      TaskStep.SHOULD_ACTIVATE,
      async () => Promise.resolve(task.shouldActivate(user, event))
    );

    if (shouldActivateResult.result.status === 'success') {
      results.push(shouldActivateResult);
      const actionResult = await executeStep(TaskStep.DO_ACTION, async () =>
        Promise.resolve(task.doAction(user, event, shouldActivateResult.result))
      );
      results.push(actionResult);
    } else {
      Log.dev(`Task "${task.name}" for user "${user.id}" in event "${event.eventType}" did not activate.`);
      return;
    }
  } catch (error) {
    Log.error(
      `Error executing task "${task.name}" for user "${user.id}": ${error}`
    );
    results.push({
      step: 'unknown',
      result: { status: 'error', error },
      timestamp: new Date(),
    });
  } finally {
    if (results.length > 0) {
      await handleTaskResult({
        event,
        name: task.name,
        steps: results,
        user,
      });
    }
    Log.info(
      `Completed execution of task "${task.name}" for user "${user.id}".`
    );
  }
}
