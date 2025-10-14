# Class: JustInLiteWrapper

Defined in: [JustInLite.ts:34](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L34)

JustInLiteWrapper provides a minimal, serverless-oriented interface for 3rd-party apps:
- configure logger & result writers
- register tasks, decision rules, and event handlers
- keep users in-memory for the current warm instance
- run registered events immediately (no DB/queue)

## Methods

### configureDecisionRuleResultWriter()

```ts
configureDecisionRuleResultWriter(decisionRuleWriter): void;
```

Defined in: [JustInLite.ts:240](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L240)

#### Parameters

##### decisionRuleWriter

[`RecordResultFunction`](../../handlers/handler.type/type-aliases/RecordResultFunction.md)

#### Returns

`void`

***

### configureLogger()

```ts
configureLogger(logger): void;
```

Defined in: [JustInLite.ts:232](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L232)

#### Parameters

##### logger

[`Logger`](../../logger/logger.interface/interfaces/Logger.md)

#### Returns

`void`

***

### configureTaskResultWriter()

```ts
configureTaskResultWriter(taskWriter): void;
```

Defined in: [JustInLite.ts:236](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L236)

#### Parameters

##### taskWriter

[`RecordResultFunction`](../../handlers/handler.type/type-aliases/RecordResultFunction.md)

#### Returns

`void`

***

### killInstance()

```ts
killInstance(): Promise<void>;
```

Defined in: [JustInLite.ts:62](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L62)

Reset the singleton (useful for tests).
Includes a 1-tick drain to let any late recorder promises settle.

#### Returns

`Promise`\<`void`\>

***

### loadUsers()

```ts
loadUsers(users): Promise<JUser[]>;
```

Defined in: [JustInLite.ts:100](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L100)

Loads users for the current invocation (serverless-safe).
Accepts either `JUser[]` or `NewUserRecord[]`.
Replaces the in-memory set each call (atomic), requires `uniqueIdentifier`,
and throws on duplicates. Returns the normalized `JUser[]`.

#### Parameters

##### users

[`JUser`](../../user-manager/user.type/type-aliases/JUser.md)[] | [`NewUserRecord`](../../user-manager/user.type/type-aliases/NewUserRecord.md)[]

#### Returns

`Promise`\<[`JUser`](../../user-manager/user.type/type-aliases/JUser.md)[]\>

***

### publishEvent()

```ts
publishEvent(
   eventType, 
   generatedTimestamp, 
   eventDetails?, 
idempotencyKey?): Promise<void>;
```

Defined in: [JustInLite.ts:194](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L194)

Publish (execute) a registered event for the **currently loaded** users.
Signature matches full JustIn; `idempotencyKey` is optional (in-memory only).

#### Parameters

##### eventType

`string`

Registered event type.

##### generatedTimestamp

`Date`

Event timestamp.

##### eventDetails?

`object`

Optional event details payload.

##### idempotencyKey?

`string`

Optional in-memory dedupe key (skips if seen).

#### Returns

`Promise`\<`void`\>

***

### registerDecisionRule()

```ts
registerDecisionRule(decisionRule): void;
```

Defined in: [JustInLite.ts:157](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L157)

Register a Decision Rule.

#### Parameters

##### decisionRule

[`DecisionRuleRegistration`](../../handlers/handler.type/type-aliases/DecisionRuleRegistration.md)

#### Returns

`void`

***

### registerEventHandlers()

```ts
registerEventHandlers(eventType, handlers): Promise<void>;
```

Defined in: [JustInLite.ts:168](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L168)

Registers a new event type with ordered handler names.
Also caches the definition locally for introspection.

#### Parameters

##### eventType

`string`

The type of the event.

##### handlers

`string`[]

Ordered task/decision-rule names for the event.

#### Returns

`Promise`\<`void`\>

***

### registerTask()

```ts
registerTask(task): void;
```

Defined in: [JustInLite.ts:152](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L152)

Register a Task.

#### Parameters

##### task

[`TaskRegistration`](../../handlers/handler.type/type-aliases/TaskRegistration.md)

#### Returns

`void`

***

### setLoggingLevels()

```ts
setLoggingLevels(levels): void;
```

Defined in: [JustInLite.ts:244](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L244)

#### Parameters

##### levels

`Partial`\<*typeof* `logLevels`\>

#### Returns

`void`

***

### unregisterEventHandlers()

```ts
unregisterEventHandlers(eventType): void;
```

Defined in: [JustInLite.ts:176](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L176)

Unregister handlers for an event type.

#### Parameters

##### eventType

`string`

#### Returns

`void`

***

### getInstance()

```ts
static getInstance(): JustInLiteWrapper;
```

Defined in: [JustInLite.ts:51](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L51)

Returns the singleton Lite instance.

#### Returns

`JustInLiteWrapper`

***

### killInstance()

```ts
static killInstance(): Promise<void>;
```

Defined in: [JustInLite.ts:79](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInLite.ts#L79)

Static teardown helper for tests/tools.
If an instance exists, delegate to it; otherwise do a best-effort drain+clear.
Safe to call multiple times.

#### Returns

`Promise`\<`void`\>
