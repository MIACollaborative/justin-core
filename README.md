# Justin Core

The `justin-core` package is intended as a **Just-In-Time Adaptive Intervention (JITAI)** framework. It enables research developers to define and manage interventions using events, decision rules, and tasks.

This framework is designed for building study applications that deliver tailored interventions based on user data and environmental contexts.

---

## Features

- **Define Tasks**: Create custom actions to be performed during an event such as getting fitbit data for a user and determine if the task should be taken for a given user.
- **Define Decision Rules**: Define custom logical constructs that determine if, how, and when an intervention should occur.
- **Create Events to something**: Define custom event somethings that can be triggered and set the tasks and decision rules to run when processed.
- **Logging Utilities**: Flexible logging interface supporting console-based and custom implementations.

---

## Installation

```
yarn add justin-core
```

---

## Usage

### 1. Import the Framework

```
import JustIn from 'justin-core';
```

### 2. Set up configurations

```
JustIn.setLoggingLevels({
  info: false,
  warn: true,
  error: true,
  debug: true,
});

JustIn.setLogger(CustomLogger)

await JustIn.initializeDB(DBType.MONGO);
```

### 3. Register Tasks and Decision Rules

```
JustIn.registerTask(GetWeatherTask);
JustIn.registerDecisionRule(SimpleTestDecisionRule);
```

### 4. Register Events

```
JustIn.addClockEvent('DemoClockEvent', 1000, [
  SimpleTestDecisionRule.name
]);
```

### 5. Start the engine

```
JustIn.startEngine();
```
---
