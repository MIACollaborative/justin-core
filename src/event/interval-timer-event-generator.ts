import { IntervalTimerEventGeneratorOptions, JEvent } from "./event.type";
import { publishEvent } from "./event-queue";

export class IntervalTimerEventGenerator {

  private intervalId: NodeJS.Timeout | null = null;
  private simulatedStartDate: Date | null = null;
  private useSimulatedStartDate: boolean = false;
  private simulatedTickDurationInMs: number = 10;
  private simulatedTickCountMax: number = 10;
  private simulatedTickCount: number = 0;

  constructor(
    private readonly intervalInMs: number, 
    private readonly eventTypeName: string,
    private readonly options: IntervalTimerEventGeneratorOptions = {}
  ) {
    if (intervalInMs <= 0) {
      throw new Error('Interval must be greater than 0');
    }
    if (!eventTypeName || eventTypeName.trim() === '') {
      throw new Error('Event type name is required');
    }
    this.intervalInMs = intervalInMs;
    this.eventTypeName = eventTypeName;
    if (options.simulatedStartDate) {
      this.simulatedStartDate = new Date(options.simulatedStartDate);
      this.useSimulatedStartDate = true;
      this.simulatedTickDurationInMs = options.simulatedTickDurationInMs || intervalInMs;
      this.simulatedTickCountMax = options.simulatedTickCountMax || 10;
    }
  }

  public start(): void {
    const startDate = new Date();
    const timerInterval = 
      this.useSimulatedStartDate ? this.simulatedTickDurationInMs : this.intervalInMs;
    this.intervalId = setInterval(() => {
      let eventTimestamp: Date;
      if (this.useSimulatedStartDate) {
        eventTimestamp = new Date(
          this.simulatedStartDate!.getTime() 
          + this.simulatedTickCount 
          * this.intervalInMs);
        this.simulatedTickCount++;
        if (this.simulatedTickCountMax && this.simulatedTickCount >= this.simulatedTickCountMax) {
          this.stop();
        }
      } else {
        eventTimestamp = new Date();
      }
      publishEvent(this.eventTypeName, eventTimestamp);
    }, timerInterval);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

