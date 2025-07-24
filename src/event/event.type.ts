import {
  StepReturnResult,
  DecisionRule,
  DecisionRuleStep,
  Task,
  TaskStep,
} from '../handlers/handler.type';

export type JEvent = {
  id?: string;
  eventType: string;
  generatedTimestamp: Date;
  publishedTimestamp?: Date;
  eventDetails?: Record<string, any>;
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

export type IntervalTimerEventGeneratorOptions = {
  simulatedStartDate?: Date;
  simulatedTickDurationInMs?: number;
  simulatedTickCountMax?: number;
};

