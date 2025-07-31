import {RecordResult, RecordResultFunction} from './handler.type'
import {Log} from "../logger/logger-manager";
import DataManager from "../data-manager/data-manager";
import { DECISION_RULE_RESULTS, TASK_RESULTS } from "../data-manager/data-manager.constants";


const dataManager = DataManager.getInstance();

let recordDecisionRuleResultFn: RecordResultFunction | null = null;
let recordTaskResultFn: RecordResultFunction | null = null;

/**
 * Registers the function to handle results from decision rules.
 *
 * @param fn - Callback function
 */
export function setDecisionRuleResultRecorder(fn: RecordResultFunction): void {
  recordDecisionRuleResultFn = fn;
}

/**
 * Registers the function to handle results from tasks.
 *
 * @param fn - Callback function
 */
export function setTaskResultRecorder(fn: RecordResultFunction): void {
  recordTaskResultFn = fn;
}

/**
* Handles a decision rule result (or task fallback).
*
* @param record - The result of executing the handler
*/
export async function handleDecisionRuleResult(record: RecordResult): Promise<void> {
  if (!hasResultRecord(record)) {
    Log.warn('No steps found.', JSON.stringify(record));
    return;
  }

  if (recordDecisionRuleResultFn) {
    await recordDecisionRuleResultFn(record);
  } else {
    // Default fallback: persist via DataManager
    await dataManager.addItemToCollection(
      DECISION_RULE_RESULTS,
      record
    );
  }
}

/**
 * Handles a task result (delegates to decision rule handler if none set).
 *
 * @param record - The result of executing the handler
 */
export async function handleTaskResult(record: RecordResult): Promise<void> {
  if (!hasResultRecord(record)) {
    Log.warn('No steps found.', JSON.stringify(record));
    return;
  }

  if (recordTaskResultFn) {
    await recordTaskResultFn(record);
  } else if (recordDecisionRuleResultFn) {
    await recordDecisionRuleResultFn(record);
  } else {
    // Default fallback: persist via DataManager
    await dataManager.addItemToCollection(
      TASK_RESULTS,
      record
    );
  }
}

/*
 * Will determine if there are steps in the result object
 *
 * @param record - The result of executing the handler
 * @returns boolean - false if no steps are found true if there are
 */
export function hasResultRecord(record: RecordResult): boolean {
  return record.steps.length > 0;
}
