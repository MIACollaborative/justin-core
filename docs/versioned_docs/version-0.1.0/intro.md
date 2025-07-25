---
id: intro
title: Intro
sidebar_position: 1
---

# Justin Core

The `justin-core` package is a lightweight, **event-driven** framework for building **Just-In-Time Adaptive Interventions (JITAIs)**. It helps research app developers define, schedule, and deliver adaptive interventions using events, decision rules, and tasks.

Designed for flexibility and modularity, `justin-core` supports both cloud-function and long-running server modes, making it ideal for study applications that deliver timely, context-aware messages or interventions based on user data.

---

## ✨ Features

- **Tasks**: Define custom actions to perform (e.g. log data, send a message, fetch an API).
- **Decision Rules**: Logic blocks that decide if and how to intervene.
- **Events**: Clock- or externally-triggered bundles of logic to run.
- **Logging Support**: Console and pluggable custom logging.
- **Cloud or Server Mode**: Works in stateless (cloud) or persistent (server) environments.

---

## 📦 Installation

```bash
yarn add justin-core
```

---

## 🚦 Usage

### 1. Import and Set Up

```ts
import JustIn from 'justin-core';

JustIn.setLoggingLevels({ info: false, warn: true, error: true, debug: true });
JustIn.setLogger(MyCustomLogger);

await JustIn.initializeDB(DBType.MONGO);
```

### 2. Register Handlers

```ts
JustIn.registerTask({
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
});

JustIn.registerDecisionRule({
  name: "lowStepsMotivationRule",
  shouldActivate: async (user, event) => {
    const steps = user.customFields.stepsYesterday || 0;
    return { status: steps < 3000 ? 'success' : 'stop' };
  },
  selectAction: async (user, event) => ({
    status: 'success',
    result: {
      action: {
        type: "sendMessage",
        message: "New day, new steps! Let’s beat yesterday 🚶‍♂️💪",
      },
    },
  }),
  doAction: async (user, event, previousResult) => {
    await sendPushNotification(user, previousResult.result.action.message);
    return { status: 'success' };
  },
});
```

### 3. Add an Event

```ts
const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24
JustIn.addClockEvent("morningStepCheck", ONE_DAY_IN_MS, [
  "getPreviousDaySteps",
  "lowStepsMotivationRule",
]);
```

### 4. Start the Engine

```ts
JustIn.startEngine();
```
