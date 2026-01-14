# Testing Practices for @just-in/core

This document extends the **Justin Testing Philosophy** with
**package‑specific guidance for `@just-in/core`**.

---

## What Makes Core Tests Different

`@just-in/core` contains:

- global singletons
- infrastructure boundaries
- logging and error contracts
- database abstractions

Tests here must be **especially explicit** about side effects and contracts.

---

## Core Expectations

### Prefer Real Singletons With Stubbed Methods

Do **not** construct fake managers manually.

Instead:
- use the real singleton
- stub its methods via Sinon

This preserves lifecycle behavior while keeping tests isolated.

---

## Directory Layout

```
src/__tests__/
├─ helpers/      # small utilities & assertions
├─ testkit/      # sandboxes & mock factories
```

---

## Core Testkit

### `makeDataManagerSandbox()`

Use when testing `DataManager` behavior:

```ts
import { makeDataManagerSandbox } from '../../__tests__/testkit';

let t: ReturnType<typeof makeDataManagerSandbox>;

beforeEach(() => {
  t = makeDataManagerSandbox();
});

afterEach(() => {
  t.restore();
});
```

Provides:
- stubbed Mongo adapter
- stubbed ChangeListenerManager hooks
- `handleDbError` spy

---

### `loggerSpies()`

Capture logs through the **real logger pipeline**:

```ts
import { loggerSpies } from '../../__tests__/testkit';

const logs = loggerSpies();

// run code

expect(logs.captured.length).toBeGreaterThan(0);
logs.restore();
```

---

### `expectLog(...)`

Standardized log assertions:

```ts
import { expectLog } from '../../__tests__/helpers';

expectLog(logs.last(), {
  severity: 'ERROR',
  messageSubstr: 'Failed to initialize',
});
```

---

## Mongo‑Related Tests

### `makeFakeMongo()`

Used for unit tests of `MongoDBManager`:

```ts
import { makeFakeMongo } from '../../__tests__/testkit';

const mongo = makeFakeMongo();
// injected into TestingMongoDBManager
```

This avoids real Mongo while preserving realistic shapes.

---

## Fake Timers

Always use **Sinon fake timers**:

```ts
import { withFakeTimers, advance } from '../../__tests__/helpers';

await withFakeTimers(async (clock) => {
  advance(clock, 1000);
});
```

---

## Streams & Change Listeners

Use stream helpers for clarity:

```ts
import { makeStream, push } from '../../__tests__/helpers';

const stream = makeStream();
push(stream, payload);
```

---

## Resetting Singletons

If a singleton exposes `killInstance()`:

```ts
import { resetSingleton } from '../../__tests__/helpers';

resetSingleton(SomeSingleton);
```

Always reset before rebuilding sandboxes.

---

## Final Core Rule

Core tests should answer:

> “If this breaks in production, would this test have warned us?”

If the answer is no, strengthen the test.
