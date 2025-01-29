import {
  StepReturnResult,
  DecisionRule,
  DecisionRuleStep,
  Task,
  TaskStep,
} from '../handlers/handler.type';

export type JEvent = {
  id: string;
  eventType: string;
  name: string;
  procedures: Array<DecisionRule['name'] | Task['name']>;
  timestamp?: Date;
  eventDetails?: Record<string, any>;
  interval?: number;
};

export type RegisterJEvent = Omit<JEvent, 'id'>;

type StepRecord = {
  step: DecisionRuleStep | TaskStep;
  result: any;
  timestamp: Date;
};

export type RecordResultData = {
  event: string;
  name: string;
  steps: StepRecord[];
};

