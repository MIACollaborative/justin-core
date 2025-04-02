import { JUser } from '../user-manager/user.type';
import { JEvent } from '../event/event.type';

export type StepReturnResult<T = any> = {
  status: 'success' | 'stop' | 'error';
  result?: T;
  error?: any;
};

export enum HandlerType {
  DECISION_RULE = 'DECISION_RULE',
  TASK = 'TASK',
}

export enum DecisionRuleStep {
  SHOULD_ACTIVATE = 'shouldActivate',
  SELECT_ACTION = 'selectAction',
  DO_ACTION = 'doAction',
}

export enum TaskStep {
  SHOULD_ACTIVATE = 'shouldActivate',
  DO_ACTION = 'doAction',
}

/**
 * Base type for shared properties between DecisionRule and Task.
 */
export type BaseHandler = {
  name: string;
  type: HandlerType;
  beforeExecution?: (event: JEvent) => Promise<void> | void;
  shouldActivate: (user: JUser, event: JEvent) => Promise<StepReturnResult> | StepReturnResult;
  doAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) => Promise<StepReturnResult> | StepReturnResult;
  afterExecution?: (event: JEvent) => Promise<void> | void;
};

export type DecisionRule = BaseHandler & {
  selectAction: (
    user: JUser,
    event: JEvent,
    previousResult: StepReturnResult
  ) => Promise<StepReturnResult> | StepReturnResult;
};

export type Task = BaseHandler;

export type TaskRegistration = Omit<Task, 'type'>;
export type DecisionRuleRegistration = Omit<DecisionRule, 'type'>;

export type ExecuteStepReturn<T = any> = {
  step: string;
  result: StepReturnResult<T>;
  timestamp: Date;
};

export type RecordResult = {
  event: JEvent
  name: string,
  steps: ExecuteStepReturn[],
  user: JUser,
}
