import sinon from 'sinon';
import { IntervalTimerEventGenerator } from '../interval-timer-event-generator';
import * as EventQueue from '../event-queue';
import { IntervalTimerEventGeneratorOptions } from '../event.type';

// Create stubs for dependencies
const publishEventStub = sinon.stub(EventQueue, 'publishEvent');

describe('IntervalTimerEventGenerator', () => {
  let clock: sinon.SinonFakeTimers;
  let generator: IntervalTimerEventGenerator;

  beforeEach(() => {
    // Setup fake timers
    clock = sinon.useFakeTimers();
    
    // Reset stubs
    publishEventStub.reset();
  });

  afterEach(() => {
    // Restore timers
    clock.restore();
    
    // Stop generator if it's running
    if (generator) {
      generator.stop();
    }
  });

  afterAll(() => {
    // Restore stubs
    publishEventStub.restore();
  });

  describe('constructor', () => {
    it('should create instance with basic configuration', () => {
      generator = new IntervalTimerEventGenerator(1000, 'TEST_EVENT');

      expect(generator).toBeInstanceOf(IntervalTimerEventGenerator);
    });

    it('should create instance with simulated options', () => {
      const options: IntervalTimerEventGeneratorOptions = {
        simulatedStartDate: new Date('2023-01-01T00:00:00Z'),
        simulatedTickDurationInMs: 50,
        simulatedTickCountMax: 5
      };

      generator = new IntervalTimerEventGenerator(1000, 'TEST_EVENT', options);

      expect(generator).toBeInstanceOf(IntervalTimerEventGenerator);
    });

    it('should use default simulated options when not provided', () => {
      const options: IntervalTimerEventGeneratorOptions = {
        simulatedStartDate: new Date('2023-01-01T00:00:00Z')
      };

      generator = new IntervalTimerEventGenerator(1000, 'TEST_EVENT', options);

      expect(generator).toBeInstanceOf(IntervalTimerEventGenerator);
    });

    it('should throw error when interval is zero', () => {
      expect(() => {
        new IntervalTimerEventGenerator(0, 'TEST_EVENT');
      }).toThrow('Interval must be greater than 0');
    });

    it('should throw error when interval is negative', () => {
      expect(() => {
        new IntervalTimerEventGenerator(-100, 'TEST_EVENT');
      }).toThrow('Interval must be greater than 0');
    });

    it('should throw error when event type name is empty string', () => {
      expect(() => {
        new IntervalTimerEventGenerator(1000, '');
      }).toThrow('Event type name is required');
    });

    it('should throw error when event type name is whitespace only', () => {
      expect(() => {
        new IntervalTimerEventGenerator(1000, '   ');
      }).toThrow('Event type name is required');
    });

    it('should throw error when event type name is null', () => {
      expect(() => {
        new IntervalTimerEventGenerator(1000, null as any);
      }).toThrow('Event type name is required');
    });

    it('should throw error when event type name is undefined', () => {
      expect(() => {
        new IntervalTimerEventGenerator(1000, undefined as any);
      }).toThrow('Event type name is required');
    });

    it('should accept valid event type name with leading/trailing whitespace', () => {
      generator = new IntervalTimerEventGenerator(1000, '  TEST_EVENT  ');

      expect(generator).toBeInstanceOf(IntervalTimerEventGenerator);
    });
  });

  describe('start', () => {
    it('should start timer and publish events at regular intervals', () => {
      generator = new IntervalTimerEventGenerator(1000, 'TEST_EVENT');
      
      generator.start();

      // Advance time by 1 second
      clock.tick(1000);
      expect(publishEventStub.calledOnce).toBe(true);
      expect(publishEventStub.firstCall.args[0]).toBe('TEST_EVENT');
      expect(publishEventStub.firstCall.args[1]).toBeInstanceOf(Date);

      // Advance time by another second
      clock.tick(1000);
      expect(publishEventStub.calledTwice).toBe(true);
      expect(publishEventStub.secondCall.args[0]).toBe('TEST_EVENT');
      expect(publishEventStub.secondCall.args[1]).toBeInstanceOf(Date);
    });

    it('should use current timestamp for real-time events', () => {
      const startTime = new Date('2023-01-01T12:00:00Z');
      clock.setSystemTime(startTime);
      
      generator = new IntervalTimerEventGenerator(1000, 'TEST_EVENT');
      generator.start();

      clock.tick(1000);

      expect(publishEventStub.calledOnce).toBe(true);
      const publishedTimestamp = publishEventStub.firstCall.args[1] as Date;
      expect(publishedTimestamp.getTime()).toBe(startTime.getTime() + 1000);
    });

    it('should handle simulated time progression correctly', () => {
      const startDate = new Date('2023-01-01T00:00:00Z');
      const options: IntervalTimerEventGeneratorOptions = {
        simulatedStartDate: startDate,
        simulatedTickDurationInMs: 100,
        simulatedTickCountMax: 3
      };

      generator = new IntervalTimerEventGenerator(1000, 'TEST_EVENT', options);
      generator.start();

      // First tick
      clock.tick(100);
      expect(publishEventStub.calledOnce).toBe(true);
      let publishedTimestamp = publishEventStub.firstCall.args[1] as Date;
      expect(publishedTimestamp.getTime()).toBe(startDate.getTime());

      // Second tick
      clock.tick(100);
      expect(publishEventStub.calledTwice).toBe(true);
      publishedTimestamp = publishEventStub.secondCall.args[1] as Date;
      expect(publishedTimestamp.getTime()).toBe(startDate.getTime() + 1000);

      // Third tick
      clock.tick(100);
      expect(publishEventStub.calledThrice).toBe(true);
      publishedTimestamp = publishEventStub.thirdCall.args[1] as Date;
      expect(publishedTimestamp.getTime()).toBe(startDate.getTime() + 2000);
    });

    it('should stop automatically after reaching simulated tick count max', () => {
      const options: IntervalTimerEventGeneratorOptions = {
        simulatedStartDate: new Date('2023-01-01T00:00:00Z'),
        simulatedTickDurationInMs: 100,
        simulatedTickCountMax: 2
      };

      generator = new IntervalTimerEventGenerator(1000, 'TEST_EVENT', options);
      generator.start();

      // First tick
      clock.tick(100);
      expect(publishEventStub.calledOnce).toBe(true);

      // Second tick
      clock.tick(100);
      expect(publishEventStub.calledTwice).toBe(true);

      // Third tick should not trigger (should have stopped)
      clock.tick(100);
      expect(publishEventStub.calledTwice).toBe(true); // Still only called twice
    });

    it('should use default simulated tick count max when not specified', () => {
      const options: IntervalTimerEventGeneratorOptions = {
        simulatedStartDate: new Date('2023-01-01T00:00:00Z'),
        simulatedTickDurationInMs: 100
      };

      generator = new IntervalTimerEventGenerator(1000, 'TEST_EVENT', options);
      generator.start();

      // Should stop after 10 ticks (default max)
      for (let i = 0; i < 10; i++) {
        clock.tick(100);
      }

      expect(publishEventStub.callCount).toBe(10);

      // 11th tick should not trigger
      clock.tick(100);
      expect(publishEventStub.callCount).toBe(10);
    });

    it('should stop automatically at default simulated tick count max when simulated tick count max is not set', () => {
      const options: IntervalTimerEventGeneratorOptions = {
        simulatedStartDate: new Date('2023-01-01T00:00:00Z'),
        simulatedTickDurationInMs: 100,
        simulatedTickCountMax: undefined
      };

      generator = new IntervalTimerEventGenerator(1000, 'TEST_EVENT', options);
      generator.start();

      // Should continue indefinitely
      for (let i = 0; i < 15; i++) {
        clock.tick(100);
      }

      expect(publishEventStub.callCount).toBe(10);
    });
  });

  describe('stop', () => {
    it('should stop the timer and prevent further events', () => {
      generator = new IntervalTimerEventGenerator(1000, 'TEST_EVENT');
      generator.start();

      // First event
      clock.tick(1000);
      expect(publishEventStub.calledOnce).toBe(true);

      // Stop the generator
      generator.stop();

      // Advance time - should not trigger more events
      clock.tick(1000);
      expect(publishEventStub.calledOnce).toBe(true); // Still only called once
    });

    it('should handle stopping when not started', () => {
      generator = new IntervalTimerEventGenerator(1000, 'TEST_EVENT');
      
      // Should not throw error
      expect(() => generator.stop()).not.toThrow();
    });

    it('should handle stopping multiple times', () => {
      generator = new IntervalTimerEventGenerator(1000, 'TEST_EVENT');
      generator.start();

      generator.stop();
      expect(() => generator.stop()).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid start/stop cycles', () => {
      generator = new IntervalTimerEventGenerator(1000, 'TEST_EVENT');
      
      generator.start();
      clock.tick(500); // Half way to first event
      generator.stop();
      
      generator.start();
      clock.tick(1000); // Should trigger event
      expect(publishEventStub.calledOnce).toBe(true);
      
      generator.stop();
    });

    it('should handle different interval durations', () => {
      generator = new IntervalTimerEventGenerator(500, 'FAST_EVENT');
      generator.start();

      // Should trigger every 500ms
      clock.tick(500);
      expect(publishEventStub.calledOnce).toBe(true);
      
      clock.tick(500);
      expect(publishEventStub.calledTwice).toBe(true);
      
      generator.stop();
    });

    it('should handle simulated time with different intervals', () => {
      const options: IntervalTimerEventGeneratorOptions = {
        simulatedStartDate: new Date('2023-01-01T00:00:00Z'),
        simulatedTickDurationInMs: 200,
        simulatedTickCountMax: 3
      };

      generator = new IntervalTimerEventGenerator(3000, 'SLOW_EVENT', options);
      generator.start();

      // Should trigger every 200ms but with timestamps 3 seconds apart
      clock.tick(200);
      expect(publishEventStub.calledOnce).toBe(true);
      let timestamp = publishEventStub.firstCall.args[1] as Date;
      expect(timestamp.getTime()).toBe(new Date('2023-01-01T00:00:00Z').getTime());

      clock.tick(200);
      expect(publishEventStub.calledTwice).toBe(true);
      timestamp = publishEventStub.secondCall.args[1] as Date;
      expect(timestamp.getTime()).toBe(new Date('2023-01-01T00:00:00Z').getTime() + 3000);

      clock.tick(200);
      expect(publishEventStub.calledThrice).toBe(true);
      timestamp = publishEventStub.thirdCall.args[1] as Date;
      expect(timestamp.getTime()).toBe(new Date('2023-01-01T00:00:00Z').getTime() + 6000);
    });
  });

  describe('edge cases', () => {

    it('should handle very large interval duration', () => {
      generator = new IntervalTimerEventGenerator(86400000, 'DAILY_EVENT'); // 24 hours
      generator.start();

      // Should not trigger immediately
      expect(publishEventStub.called).toBe(false);
      
      // Should trigger after 24 hours
      clock.tick(86400000);
      expect(publishEventStub.calledOnce).toBe(true);
      
      generator.stop();
    });

    it('should handle simulated start date in the past', () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const options: IntervalTimerEventGeneratorOptions = {
        simulatedStartDate: pastDate,
        simulatedTickDurationInMs: 100,
        simulatedTickCountMax: 2
      };

      generator = new IntervalTimerEventGenerator(1000, 'PAST_EVENT', options);
      generator.start();

      clock.tick(100);
      expect(publishEventStub.calledOnce).toBe(true);
      const timestamp = publishEventStub.firstCall.args[1] as Date;
      expect(timestamp.getTime()).toBe(pastDate.getTime());
      
      generator.stop();
    });

    it('should handle simulated start date in the future', () => {
      const futureDate = new Date('2030-01-01T00:00:00Z');
      const options: IntervalTimerEventGeneratorOptions = {
        simulatedStartDate: futureDate,
        simulatedTickDurationInMs: 100,
        simulatedTickCountMax: 2
      };

      generator = new IntervalTimerEventGenerator(1000, 'FUTURE_EVENT', options);
      generator.start();

      clock.tick(100);
      expect(publishEventStub.calledOnce).toBe(true);
      const timestamp = publishEventStub.firstCall.args[1] as Date;
      expect(timestamp.getTime()).toBe(futureDate.getTime());
      
      generator.stop();
    });
  });
}); 