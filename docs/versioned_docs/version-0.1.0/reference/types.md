---

id: types
title: Exported Types
sidebar\_position: 4
---

# Exported Types

This reference page explains the key types exported from `@just-in/core`. These are useful for writing custom handlers, extending the framework, or understanding how execution works.

---

## ✅ `StepReturnResult`

Used as the return type for all handler steps:

```ts
type StepReturnResult<T = any> = {
  status: 'success' | 'stop' | 'error';
  result?: T;
  error?: any;
};
```

* `success`: Step ran successfully
* `stop`: Skip this handler’s logic (or skip a step)
* `error`: Indicates failure; caught and logged by the runtime

Used in:

* `shouldActivate`
* `doAction`
* `selectAction`

---

## 🧠 `DecisionRule`

Decision rules define adaptive logic. They evaluate whether an intervention should occur, what it should be, and how to deliver it.

```ts
type DecisionRule = {
  name: string;
  type: HandlerType.DECISION_RULE;

  shouldActivate: (user: JUser, event: JEvent) => Promise<StepReturnResult>;
  // Determines whether this rule should be run for this user in response to this event. Return `stop` to skip processing the rest of the rule.

  selectAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) => Promise<StepReturnResult>;
  // Decides what action (if any) to take and stores the decision result in the StepReturnResult to be passed to doAction()

  doAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) => Promise<StepReturnResult>;
  // Carry out the action(s) chosen by selectAction(), which are specifiedf in the StepReturnResult.result field

  beforeExecution?: (event: JEvent) => Promise<void>;
  // Optional: run once before any user-level execution. Useful for bulk fetches.

  afterExecution?: (event: JEvent) => Promise<void>;
  // Optional: run once after all users are processed. Useful for bulk actions that affect many users.
};
```

---

## 🔧 `Task`

Tasks are utility handlers that perform side effects like fetching data, writing logs, etc. They do not require an action to be selected.

```ts
type Task = {
  name: string;
  type: HandlerType.TASK;

  shouldActivate?: (user: JUser, event: JEvent) => Promise<StepReturnResult>;
  // Determines whether this task should be run for this user in response to this event. Return `stop` to skip processing the rest of the task.

  doAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) => Promise<StepReturnResult>;
  // Execute the core behavior of the task (e.g. API call, DB write, transformation).

  beforeExecution?: (event: JEvent) => Promise<void>;
  // Optional: fetch or prepare shared data once before all users are processed.

  afterExecution?: (event: JEvent) => Promise<void>;
  // Optional: send batch logs, trigger admin alerts, or clean up shared resources.
};
```

> 💡 Tasks do not use `selectAction` because they are not responsible for choosing or delivering interventions — they simply perform operations needed by the application.

---

## 🧩 Supporting Types

### `JUser`

Represents a participant. Includes:

* `uniqueIdentifier`: Unique identifier
* `attributes`: In-memory store for transient state between handlers (e.g. step count)

### `JEvent`

Represents an event within JustIn.

```ts
type JEvent = {
  id?: string;
  eventType: string; // a string that identifies the type of event
  generatedTimestamp: Date; // timestamp provided by the event generator
  publishedTimestamp?: Date; // timestamp provided by the JustIn EventQueue
  eventDetails?: Record<string, any>; // optional additional information about the event
};
```
---

This page will grow over time as new extension points are exposed.
