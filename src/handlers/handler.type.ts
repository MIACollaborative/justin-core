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
  SHOULD_DECIDE = 'shouldDecide',
  DECIDE = 'decide',
  DO_ACTION = 'doAction',
}

export enum TaskStep {
  SHOULD_DECIDE = 'shouldDecide',
  DO_ACTION = 'doAction',
}

export type DecisionRule = {
  name: string;
  type: HandlerType;
  shouldDecide: ( user: JUser, event: JEvent, ) => Promise<StepReturnResult>;
  decide: (
    user: JUser,
    event: JEvent,
    previousResult: StepReturnResult,
  ) => Promise<StepReturnResult>;
  doAction: (
    user: JUser,
    event: JEvent,
    previousResult: StepReturnResult,
  ) => Promise<StepReturnResult>;
};

export type Task = {
  name: string;
  type: HandlerType;
  shouldDecide: (user: JUser, event: JEvent) => Promise<StepReturnResult>;
  doAction: (
    user: JUser,
    event: JEvent,
    previousResult: StepReturnResult,
  ) => Promise<StepReturnResult>;
};

export type TaskRegistration = Omit<Task, 'type'>;
export type DecisionRuleRegistration = Omit<DecisionRule, 'type'>;

export type ExecuteStepReturn<T = any> = {
  step: string;
  result: StepReturnResult<T>;
  timestamp: Date;
};

export type RecordResult = {
  event: string,
  eventName: string,
  name: string,
  steps: ExecuteStepReturn[],
  userId: string,
}
