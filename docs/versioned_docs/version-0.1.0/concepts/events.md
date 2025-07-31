---
id: events
title: JEvents
sidebar_position: 3
---

# JEvents (JustIn Events)

In JustIn, Decision Rules and Tasks are triggered by **`JEvents`**. You can create and "publish" `JEvents` from within your Decision Rules or Tasks, or you can configure JustIn to generate `JEvents` for you by creating an `IntervalTimerEventGenerator` (covered below). 

All `JEvents` that are published in JustIn are added to the `EventQueue`, which processes events in the order they were received. For each `JEvent` that is processed, JustIn executes any and all Decision Rules and Tasks that have been registered as Event Handlers (via `registerEventHandlers()`). 

The JustIn event handling process for a single JEvent looks like this:

![event process img](/img/ProcessEvent.png)

## The JEvent Datatype

```ts
type JEvent = {
  id?: string;
  eventType: string;
  generatedTimestamp: Date;
  publishedTimestamp?: Date;
  eventDetails?: Record<string, any>;
};
```

When JEvents are created, or *generated*, the Event creator is responsible for providing a timestamp, which is added to the JEvent as the `generatedTimestamp`. The JustIn Event Queue provides a second timestamp, which is added as the `publishedTimestamp`. This pattern allows an event generator to have greater control over the logical timing of events, which supports simulation (i.e., testing a JustIn app running at times other than the current real time) and normalization (e.g., forcing all timestamps to be spaced exactly one minute apart).

The `eventType` of a `JEvent` is a label that is used within the app to identify the type of the event. This label is also used to retrieve the handlers that were registered to the event type via `registerEventHandlers()`. 

`eventDetails` can contain any additional information that the event generator wishes to include and that might be useful to Decision Rules and Tasks.

## IntervalTimerEventGenerator

JustIn 0.1 includes one event generator--the `IntervalTimerEventGenerator` that generates events at a regular interval. The interval is specified when the generator is created. This generator will satisfy a wide range of use cases for Decision Rules and Tasks, specifically any Rules and Tasks that are expected to run at particular times. It can also be used for Rules and Tasks that need to poll periodically for particular conditions to be true for activation.

Example scenarios where the `IntervalTimerEventGenerator` can be used include:
- a Task that runs every Monday at midnight in the user's time zone to determine whether to move the user from the baseline to active phase of a study
- a Decision Rule that runs one hour after the user's "wake up time" (stored as an attribute of the user) and randomizes between sending a motivational message or no message
- a Decision Rule that runs every minute and looks at the user's fitbit data to see if they have been sedentary for the past 60 minutes and sends a walking suggestion if so (and if the user has not received such a message in the past 4 hours)

To create and start an `IntervalTimerEventGenerator`, use the JustIn functions `createIntervalTimerEventGenerator()` and `startEngine()`, like so:

```ts
import JustIn from 'just-in/core';

const justIn = JustIn();
justIn.createIntervalTimerEventGenerator('myEventType', 1000 * 60); // one minute in ms
justIn.startEngine();
```

You can create multiple `IntervalTimerEventGenerator`s if you would like, as long as you specify different `eventType`s for each. The call to `startEngine()` will start all `IntervalTimerEventGenerator`s that have been created prior to that call.

## Example
Here we expand on our previous example to include creating and starting an `IntervalTimerEventGenerator`:
```ts
const simpleTask: TaskRegistration = {
  name: "Simple Task",
  shouldActivate: async (user: JUser, event: JEvent): Promise<StepReturnResult> => {
    return {status: 'success', result: {}}; // always activate
  },
  doAction: async (user:JUser, event: JEvent, previousResult: StepReturnResult): Promise<StepReturnResult> => {
    // do something
    console.log('simpleTask is doing an action!');
    return {status: 'success', result: {actionPerformed: 'simpleTask action'}};
  }
}

const simpleRule: DecisionRuleRegistration = {
  name: "Simple Rule",
  shouldActivate: async (user: JUser, event: JEvent): Promise<StepReturnResult> => {
    if (event.getGeneratedTimestamp().getMinutes() % 30 === 0) { // every 1/2 hour
          return {status: 'success', result: {}};
    } else {
      return {status: 'stop', result: {}};
    }
  },
  selectAction: async (
    user: JUser, 
    event: JEvent,
    previousResult: StepReturnResult
  ): Promise<StepReturnResult> => {
    const randResult = Math.random();
    if (randResult < 0.5) {
      return {
        status: 'success',
        result: {
          action: 'send message'
        }
      }
    } else {
      return {
        status: 'success',
        result: {
          action: 'no action'
        }
      }
    }
  }
  doAction: async (
    user:JUser, 
    event: JEvent, 
    previousResult: StepReturnResult
  ): Promise<StepReturnResult> => {
    const actionToPerform = previousResult.result.action;
    if (actionToPerform === 'send message') {
      console.log('simpleRule will send a message.');
      // send the message
    } else {
      console.log('simpleRule will NOT send a message.');
      // do nothing
    }
    return {status: 'success', result: {actionPerformed: actionToPerform}};
  }
}
```

And now we register these handlers, associate them with the event that will trigger them, and start an `IntervalTimerEventGenerator`:
```ts
import JustIn from 'just-in/core';

const justIn = JustIn();
justIn.registerTask(simpleTask);
justIn.registerDecisionRule(simpleRule);
justIn.registerEventHandlers(
  'simpleEventType', 
  [simpleTask.name, simpleRule.name]
);

justIn.createIntervalTimerEventGenerator('simpleEventType', 1000 * 60);
justIn.startEngine();
```

Next, we'll look at how to work with JustIn users, aka `JUser`s.

