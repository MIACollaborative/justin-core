import {
  DecisionRule,
  HandlerType,
  DecisionRuleRegistration,
  ExecuteStepReturn,
  DecisionRuleStep,
} from './handler.type';
import { Log } from '../logger/logger-manager';
import { JEvent } from '../event/event.type';
import { JUser } from '../user-manager/user.type';
import { executeStep } from './steps.helpers';
import {handleDecisionRuleResult} from "./result-recorder";

const decisionRules: Map<string, DecisionRule> = new Map();

/**
 * Registers a DecisionRule by adding it to the `decisionRules` map.
 * Sets the `type` property to `DECISION_RULE`.
 *
 * @param {DecisionRuleRegistration} rule - The decision rule to register.
 * @returns {void}
 *
 * @example
 * registerDecisionRule({ name: "checkWeather", shouldDecide: ..., decide: ..., doAction: ... });
 * // Logs: "Decision rule 'checkWeather' registered successfully."
 */
export const registerDecisionRule = (rule: DecisionRuleRegistration): void => {
  decisionRules.set(rule.name, { ...rule, type: HandlerType.DECISION_RULE });
  Log.info(`Decision rule "${rule.name}" registered successfully.`);
};

/**
 * Retrieves a DecisionRule by its name from the internal `decisionRules` map.
 *
 * @param {string} name - The name of the DecisionRule to retrieve.
 * @returns {DecisionRule | undefined} - The DecisionRule object if found, otherwise `undefined`.
 */
export const getDecisionRuleByName = (
  name: string
): DecisionRule | undefined => {
  return decisionRules.get(name);
};

/**
 * Executes a full DecisionRule workflow, including `shouldDecide`, `decide`, and `doAction` steps.
 * This ensures a complete decision-making process and records results for each step.
 *
 * @param {DecisionRule} rule - The decision rule to execute.
 * @param {JEvent} event - The event triggering the decision rule.
 * @param {JUser} user - The user for whom the decision rule is processed.
 * @returns {Promise<void>} - Resolves when all steps are complete.
 *
 * @example
 * const rule = getDecisionRuleByName("checkWeather");
 * if (rule) await executeDecisionRule(rule, event, user);
 */
export async function executeDecisionRule(
  rule: DecisionRule,
  event: JEvent,
  user: JUser
): Promise<void> {
  const results: ExecuteStepReturn[] = [];
  let decisionRuleExecutionStatus: "not activated" | "activated" | "error" | "finished" = "not activated";

  try {
    Log.dev(
      `Starting decision rule "${rule.name}" for user "${user.id}" in event "${event.eventType}" with ID: ${event.id}.`
    );

    const shouldActivateResult = await executeStep(
      DecisionRuleStep.SHOULD_ACTIVATE,
      async () => Promise.resolve(rule.shouldActivate(user, event))
    );

    if (shouldActivateResult.result.status === 'success') {
      decisionRuleExecutionStatus = "activated";
      results.push(shouldActivateResult);
      const selectionActionResult = await executeStep(
        DecisionRuleStep.SELECT_ACTION,
        async () =>
          Promise.resolve(rule.selectAction(user, event, shouldActivateResult.result))
      );
      results.push(selectionActionResult);

      if (selectionActionResult.result.status === 'success') {
        const actionResult = await executeStep(
          DecisionRuleStep.DO_ACTION,
          async () =>
            Promise.resolve(rule.doAction(user, event, selectionActionResult.result))
        );
        results.push(actionResult);
      }
      decisionRuleExecutionStatus = "finished";
    } else {
      Log.dev(`Decision rule "${rule.name}" for user "${user.id}" in event "${event.eventType}" did not activate.`);
    }
    
  } catch (error) {
    decisionRuleExecutionStatus = "error";
    Log.error(
      `Error processing decision rule "${rule.name}" for user "${user.id}" in event "${event.eventType}": ${error}`
    );
    results.push({
      step: 'unknown',
      result: { status: 'error', error },
      timestamp: new Date(),
    });
  } finally {
    handleDecisionRuleResult({
        event,
        name: rule.name,
        steps: results,
        user,
      });
    Log.info(
      `Decision rule "${rule.name}" completed for user "${user.uniqueIdentifier}" in event "${event.eventType}": ${decisionRuleExecutionStatus}.`
    );
  }
}
