import { Log } from '../logger/logger-manager';
import { StepReturnResult, ExecuteStepReturn } from './handler.type';

/**
 * Executes a single step function, logging errors and results.
 *
 * @param step - The current step being executed (e.g., SHOULD_DECIDE, DECIDE, DO_ACTION).
 * @param fn - The function to execute for the step.
 * @returns {Promise<ExecuteStepReturn>} The result of the step execution.
 */
export async function executeStep<T>(
  step: string,
  fn: () => Promise<StepReturnResult<T>>,
): Promise<ExecuteStepReturn<T>> {
  const timestamp = new Date();

  try {
    const result = await fn();

    if (!['success', 'stop', 'error'].includes(result.status)) {
      throw new Error(`Invalid status "${result.status}" in step "${step}".`);
    }

    return { step, result, timestamp };
  } catch (error) {
    Log.error(`Error in step "${step}": ${error}`);
    return { step, result: { status: 'error', error }, timestamp };
  }
}
