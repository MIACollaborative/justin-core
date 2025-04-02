import { Log } from '../logger/logger-manager';
import { JUser } from '../user-manager/user.type';
import { JEvent } from './event.type';
/**
 * Records the results of task or decision rule processing, logging each result.
 * @param {object} resultData - Data about the result to be recorded.
 * @param {JEvent} resultData.event - The event type.
 * @param {string} resultData.name - The name of the task or decision rule.
 * @param {Array} resultData.steps - Steps executed in the task or decision rule.
 * @param {JUser} resultData.user - The user for whom the result is recorded.
 */
export const recordResult = (resultData: {
  event: JEvent;
  name: string;
  steps: any[];
  user: JUser;
}): void => {
  Log.handlerResult(resultData);
}
