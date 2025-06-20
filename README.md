# justin-core

**justin-core** is the core package for the **Just-In-Time Adaptive Intervention (JITAI)** framework. It enables research developers to define and manage interventions using events, decision rules, and tasks. This framework is designed to build study applications that deliver tailored interventions based on user data and environmental context.

---

## 🚀 Features

- **Define Tasks**: Create custom actions triggered by events (e.g. fetch Fitbit data for a user and determine eligibility).
- **Decision Rules**: Define logical rules to determine *if*, *how*, and *when* an intervention should occur.
- **Custom Events**: Define and trigger events that process associated tasks and decision rules.
- **Logging Utilities**: Built-in support for custom and console-based logging.

---

## 📦 Installation

```bash
yarn add justin-core
```

---

## 🔧 Usage

### 1. Import the Framework

```ts
import JustIn from 'justin-core';
```

### 2. Configure Logging and DB

```ts
JustIn.setLoggingLevels({
  info: false,
  warn: true,
  error: true,
  debug: true,
});

JustIn.setLogger(CustomLogger);

await JustIn.initializeDB(DBType.MONGO);
```

### 3. Register Tasks and Decision Rules

```ts
JustIn.registerTask(GetWeatherTask);
JustIn.registerDecisionRule(SimpleTestDecisionRule);
```

### 4. Register Events

```ts
JustIn.addClockEvent('DemoClockEvent', 1000, [
  SimpleTestDecisionRule.name
]);
```

### 5. Start the Engine

```ts
JustIn.startEngine();
```

---

## 🐳 Running with Docker

### 1. Build the Docker Image

```bash
docker build -t justin-core .
```

### 2. Run the Container

```bash
docker run justin-core
```

> If your app is a service that exposes a port, add the appropriate `-p` flag:
```bash
docker run -p 3000:3000 justin-core
```

---

## 📄 License

MIT — see [LICENSE](./LICENSE)

---

## 🙋‍♂️ Contributing

Coming soon — or open a PR or issue if you have suggestions!
