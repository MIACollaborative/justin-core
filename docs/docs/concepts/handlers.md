---
id: handlers
title: Decision Rules and Tasks
sidebar_position: 2
---

# Event Handlers: Decision Rules and Tasks

There are two types of Event Handlers in JustIn: **Decision Rules**, which are capable of executing multiple actions and contain logic for deciding among those actions, and **Tasks**, which always execute the same action(s) when activated.

## Decision Rules

Decision Rules are primarily intended to support intervention logic, including randomization and contextual tailoring. The inclusion of a `selectAction` step between `shouldActivate` and `doAction` provides the developer a place to execute and log decisions related to intervention delivery.

Examples of decision rules include
- every morning at 8am randomize with 50/50 probability whether to send the user a stress-reduction message or to receive no message (e.g., for an MRT)
- when the user arrives home after 4pm, send a suggestion for an after-dinner walk ONLY if they have not met their activity goal for the day

There three required functions that must be provided for each Decision Rule. These functions will be invoked in order, `shouldActivate` => `selectAction` => `doAction`, with the result from each step determining whether to function the subsequent step or halt execution:

- `shouldActivate`: determines whether or not this Decision Rule should activate at this time. If `shouldActivate` returns a `stop` or `error` result, JustIn will not execute the remaining functions in this rule for this user.
- `selectAction`: chooses the action(s) to execute and returns an object with information about its decision.
- `doAction`: carries out the action(s) selected by `selectAction`.

Let's take a closer look at those functions:
```ts
shouldActivate: (user: JUser, event: JEvent) 
  => Promise<StepReturnResult> | StepReturnResult;
selectAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) 
  => Promise<StepReturnResult> | StepReturnResult;
doAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) 
  => Promise<StepReturnResult> | StepReturnResult;
```

Notes:
- all functions receive the `JUser` and `JEvent` for which the rule is being activated. This allows the functions to use contextual information (e.g., time, user state) to make decisions.
- all functions return a `StepReturnResult`, and the latter two functions receive the `StepReturnResult` from the previous function. This pattern allows each function to communicate its result to both JustIn (via the `status` field) for the purpose of contining or stopping execution, and to subsequent functions (via the `result` field), for the purpose of specifying execution parameters. The StepReturnResult also allows Decision Rules to provide rich execution logs to support system monitoring and data analysis.

## Tasks

Tasks can be thought of as simplified Decision Rules, where only the logic for activation and action are specified. Tasks are generally used for background functionality that is needed to support the application, but may not be directly related to the research goals. From a technical perspective, the only difference between Decision Rules and Tasks is that the latter omits the `selectAction` step. As such Tasks can be used for a variety of purposes. Examples of tasks might include:

- every morning at 10am check fitbit data to determine if the user has been wearing the device for at least 8 hours the previous 2 days. Send a reminder if they have not.
- every Monday at midnight, move all participants who have been in the baseline phase for more than 7 days into the active phase

The two required functions for Tasks are:
```ts
shouldActivate: (user: JUser, event: JEvent) 
  => Promise<StepReturnResult> | StepReturnResult;
doAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) 
  => Promise<StepReturnResult> | StepReturnResult;
```

## Before and After Execution

Both Decision Rules and Tasks support two optional functions: `beforeExecution` and `afterExecution`. These functions, if provided, will be run by JustIn exactly once per matching event (rather than once per event *per user*, as is the case for the previously discussed functions). These functions can be useful for Tasks or Decision Rules that require set up, tear down, or wish to use batching for actions. Batching can be useful, for example, when the action(s) can be performed more efficiently in batch or to limit external API calls to reduce costs. 

Here are the function signatures:
```ts
beforeExecution: (event: JEvent) => Promise<void> | void;
afterExecution: (event: JEvent) => Promise<void> | void;
```

## Registering Decision Rules and Tasks

For JustIn to execute your Decision Rules and Tasks, you first need to register them with JustIn and then register them as EventHandlers for one or more event type. Each Decision Rule and Task must provide a unique `name` that JustIn can use to identify it. JustIn provides methods for registering Decision Rules and Tasks, as well as a method for registering an event with its associated handlers. 

```ts
registerTask(task: TaskRegistration): void; 
registerDecisionRule(decisionRule: DecisionRuleRegistration): void;
async registerEventHandlers(eventType: string,handlers: string[]): Promise<void>; 
```

The `TaskRegistration` and `DecisionRuleRegistration` types specify the required and optional functions described above, as well as the `name` for each:

```ts
type DecisionRuleRegistration = {
  name: string;
  beforeExecution?: (event: JEvent) 
    => Promise<void> | void;
  shouldActivate: (user: JUser, event: JEvent) 
    => Promise<StepReturnResult> | StepReturnResult;
  selectAction: (user: JUser, event: JEvent, previousResult: StepReturnResult
  ) => Promise<StepReturnResult> | StepReturnResult;
  doAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) 
    => Promise<StepReturnResult> | StepReturnResult;
  afterExecution?: (event: JEvent) => Promise<void> | void;
};

type TaskRegistration = {
  name: string;
  beforeExecution?: (event: JEvent) 
    => Promise<void> | void;
  shouldActivate: (user: JUser, event: JEvent) 
    => Promise<StepReturnResult> | StepReturnResult;
  doAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) 
    => Promise<StepReturnResult> | StepReturnResult;
  afterExecution?: (event: JEvent) => Promise<void> | void;
};

```

## Example

Here is an example of some code that registers a Decision Rule and a Task:

First, we write the handlers:
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

And now register these handlers and associate them with the event that will trigger them.
```ts
import JustIn from '@just-in/core';

const justIn = JustIn();
justIn.registerTask(simpleTask);
justIn.registerDecisionRule(simpleRule);
justIn.registerEventHandlers(
  'someEventType', 
  [simpleTask.name, simpleRule.name]
);
```


Next, we will cover how **Events** work and you can use JustIn to generate events that will trigger your Decision Rules and Tasks.