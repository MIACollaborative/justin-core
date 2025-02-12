import { Log } from '../logger/logger-manager';

/**
 * Records the results of task or decision rule processing, logging each result.
 * @param {object} resultData - Data about the result to be recorded.
 * @param {string} resultData.event - The event type.
 * @param {string} resultData.eventName - The event name.
 * @param {string} resultData.name - The name of the task or decision rule.
 * @param {Array} resultData.steps - Steps executed in the task or decision rule.
 * @param {string} resultData.userId - The ID of the user for whom the result is recorded.
 */
export const recordResult = (resultData: {
  event: string;
  eventName: string;
  name: string;
  steps: any[];
  userId: string;
}): void => {
  Log.handlerResult(resultData);
}
