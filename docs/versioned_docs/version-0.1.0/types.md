---

id: types
title: Exported Types
sidebar\_position: 4
--------------------

# Exported Types

This reference page explains the key types exported from `justin-core`. These are useful for writing custom handlers, extending the framework, or understanding how execution works.

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
  // Determine whether this rule should be run for the user. Return `stop` to skip.

  selectAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) => Promise<StepReturnResult>;
  // Decide what action to take. Typically returns a message, reminder, or trigger object.

  doAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) => Promise<StepReturnResult>;
  // Actually deliver the action. Send the push notification, log the result, etc.

  beforeExecution?: (event: JEvent) => Promise<void>;
  // Optional: run once before any user-level execution. Useful for bulk fetches.

  afterExecution?: (event: JEvent) => Promise<void>;
  // Optional: run once after all users are processed. Useful for bulk summaries or notifications.
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
  // Determine if the task should be run for this user.

  doAction: (user: JUser, event: JEvent, previousResult: StepReturnResult) => Promise<StepReturnResult>;
  // Execute the core behavior of the task (e.g. API call, DB write, transformation).

  beforeExecution?: (event: JEvent) => Promise<void>;
  // Optional: fetch or prepare shared data once before all users are processed.

  afterExecution?: (event: JEvent) => Promise<void>;
  // Optional: send batch logs, trigger admin alerts, or clean up shared resources.
};
```

> 💡 Tasks do not use `selectAction` because they are not responsible for choosing or delivering interventions — they simply perform operations needed by the rule or study infrastructure.

---

## 🧩 Supporting Types

### `JUser`

Represents a participant. Includes:

* `participantId`: Unique identifier
* `customFields`: In-memory store for transient state between handlers (e.g. step count)

### `JEvent`

Represents a triggered event. Includes:

* `name`: The event name (e.g. "dailyReminder")
* `timestamp`: When the event was published or run

---

## 📚 Enums

### `HandlerType`

```ts
enum HandlerType {
  DECISION_RULE = 'DECISION_RULE',
  TASK = 'TASK',
}
```

### `DecisionRuleStep`

```ts
enum DecisionRuleStep {
  SHOULD_ACTIVATE = 'shouldActivate',
  SELECT_ACTION = 'selectAction',
  DO_ACTION = 'doAction',
}
```

### `TaskStep`

```ts
enum TaskStep {
  SHOULD_ACTIVATE = 'shouldActivate',
  DO_ACTION = 'doAction',
}
```

---

This page will grow over time as new extension points are exposed.
