---
id: handlers
title: Decision Rules and Tasks
sidebar_position: 2
---

# Event Handlers: Decision Rules and Tasks

There are two types of Event Handlers in JustIn: **Decision Rules**, which are capable of executing multiple actions and contain logic for deciding among those actions, and **Tasks**, which always execute the same action(s) when activated.

## Decision Rules

There three required functions that must be provided for each Decision Rule:

- `shouldActivate`: determines whether or not this Decision Rule should activate at this time. If `shouldActivate` returns a `stop` or `error` result, JustIn will not execute the remaining functions in this rule for this user.
- `selectAction`: chooses the action(s) to execute and returns an object with information about its decision.
- `doAction`: carries out the action(s) selected by `selectAction`.

The `DecisionRuleRegistration` type defines the detailed structure of a DecisionRule and its functions, and is the structure that you must provide to the JustIn `registerDecisionRule()` function in your app inialization.

```ts
type DecisionRule = {
  name: string;
  beforeExecution?: (event: JEvent) 
    => Promise<void> | void;
  shouldActivate: (user: JUser, event: JEvent) 
    => Promise<StepReturnResult> | StepReturnResult;
  selectAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) 
    => Promise<StepReturnResult> | StepReturnResult;
  doAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) 
    => Promise<StepReturnResult> | StepReturnResult;
  afterExecution?: (event: JEvent) 
    => Promise<void> | void;
}
```
