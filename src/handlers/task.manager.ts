import { HandlerType, Task, TaskRegistration, TaskStep } from './handler.type';
import { Log } from '../logger/logger-manager';
import { executeStep } from './steps.helpers';
import { recordResult } from '../event/record-result';
import { JEvent } from '../event/event.type';
import { JUser } from '../user-manager/user.type';

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
  user: JUser,
): Promise<void> {
  const results = [];

  try {
    Log.info(`Executing task "${task.name}" for user "${user.id}" in event "${event.eventType}".`);

    const shouldDecideResult = await executeStep(TaskStep.SHOULD_DECIDE, () =>
      task.shouldDecide(user, event),
    );
    results.push(shouldDecideResult);

    if (shouldDecideResult.result.status === 'success') {
      const actionResult = await executeStep(TaskStep.DO_ACTION, () =>
        task.doAction(user, event, shouldDecideResult.result),
      );
      results.push(actionResult);
    }
  } catch (error) {
    Log.error(`Error executing task "${task.name}" for user "${user.id}": ${error}`);
  } finally {
    recordResult({
      event: event.eventType,
      eventName: event.name,
      name: task.name,
      steps: results,
      userId: user.id,
    });
    Log.info(`Completed execution of task "${task.name}" for user "${user.id}".`);
  }
}
