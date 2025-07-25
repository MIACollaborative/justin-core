---
id: handlers
title: Writing Custom Handlers
sidebar_position: 3
---

# Writing Custom Handlers

In `justin-core`, handlers are the building blocks that define what happens during an event. There are two main types:

- **Tasks**: Perform study-side effects (e.g. fetch data)
- **Decision Rules**: Determine if, when, and how an intervention occurs

This guide shows how to write your own.

---

## 🧩 Task Structure

A task is an object with a `name`, `doAction()`, and optionally a `shouldActivate()` check. Each function must return a `StepReturnResult`.

```ts
const getPreviousDaySteps = {
  name: "getPreviousDaySteps",

  shouldActivate: async (user, event) => {
    const hour = new Date(event.timestamp).getHours();
    return { status: hour === 1 ? 'success' : 'stop' };
  },

  doAction: async (user, event) => {
    const steps = await fetchFitbitSteps(user, { dayOffset: 1 });
    user.customFields.stepsYesterday = steps;
    return { status: 'success' };
  },
};
```

Then register it:

```ts
JustIn.registerTask(getPreviousDaySteps);
```

---

## 🧠 Decision Rule Structure

A decision rule evaluates participant state and determines whether to act, what to do, and how to do it. All steps return `StepReturnResult`.

```ts
const lowStepsReminderRule = {
  name: "lowStepsReminderRule",

  shouldActivate: async (user, event) => {
    const steps = user.customFields.stepsYesterday || 0;
    return { status: steps < 3000 ? 'success' : 'stop' };
  },

  selectAction: async (user, event) => ({
    status: 'success',
    result: {
      action: {
        type: "sendMessage",
        message: "Let's beat yesterday’s steps today!",
      },
    },
  }),

  doAction: async (user, event, previousResult) => {
    await sendPushNotification(user, previousResult.result.action.message);
    return { status: 'success' };
  },
};
```

Then register it:

```ts
JustIn.registerDecisionRule(lowStepsReminderRule);
```

---

## 🔁 What is `StepReturnResult`?

All task and decision rule steps return a `StepReturnResult`, which standardizes the flow of information between lifecycle steps.

```ts
type StepReturnResult<T = any> = {
  status: 'success' | 'stop' | 'error';
  result?: T;
  error?: any;
};
```

- `success`: Step ran and completed normally
- `stop`: Skip remaining logic for this handler
- `error`: Something failed; may trigger logging or halt execution

Use `result` to pass information from `selectAction` to `doAction`, or between handlers.

---

## 💡 Best Practices

- **Name your handlers clearly** so they’re easy to reference in event arrays
- **Use `shouldActivate` guards** to prevent unnecessary execution
- **Always return `StepReturnResult`** (`success`, `stop`, or `error`)
- **Use `user.customFields`** to stash intermediate data between handlers
- **Keep `doAction` short** — offload long processes elsewhere
- **Test each handler independently** before combining them into events

---

Handlers are at the heart of adaptive intervention logic. They should be easy to read, easy to test, and focused on one clear responsibility.

Let us know if you'd like a test harness or examples from production studies!
