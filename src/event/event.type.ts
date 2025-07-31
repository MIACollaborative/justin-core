export type JEvent = {
  id?: string;
  eventType: string;
  generatedTimestamp: Date;
  publishedTimestamp?: Date;
  eventDetails?: Record<string, any>;
};

export type RegisterJEvent = Omit<JEvent, 'id'>;

export type IntervalTimerEventGeneratorOptions = {
  simulatedStartDate?: Date;
  simulatedTickDurationInMs?: number;
  simulatedTickCountMax?: number;
};

