# Class: JustInWrapper

Defined in: [JustInWrapper.ts:35](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L35)

JustInWrapper class provides a unified interface for managing application-level configurations,
event registrations, data manager initialization, and orchestrating the event queue for processing.

## Methods

### addUser()

```ts
addUser(newUserRecord): Promise<null | JUser>;
```

Defined in: [JustInWrapper.ts:169](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L169)

Adds a new user to the database.

#### Parameters

##### newUserRecord

[`NewUserRecord`](../../user-manager/user.type/type-aliases/NewUserRecord.md)

The new user record to add.

#### Returns

`Promise`\<`null` \| [`JUser`](../../user-manager/user.type/type-aliases/JUser.md)\>

The added user.

***

### addUsers()

```ts
addUsers(users): Promise<(null | JUser)[]>;
```

Defined in: [JustInWrapper.ts:152](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L152)

Adds a list of new users to the database.

#### Parameters

##### users

[`NewUserRecord`](../../user-manager/user.type/type-aliases/NewUserRecord.md)[]

The list of new users to add.

#### Returns

`Promise`\<(`null` \| [`JUser`](../../user-manager/user.type/type-aliases/JUser.md))[]\>

The list of added users, or null if not found.

***

### configureDecisionRuleResultWriter()

```ts
configureDecisionRuleResultWriter(decisionRuleWriter): void;
```

Defined in: [JustInWrapper.ts:297](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L297)

Configures the writer for a decision rule result with a custom function.
Will default to writing to the db

#### Parameters

##### decisionRuleWriter

[`RecordResultFunction`](../../handlers/handler.type/type-aliases/RecordResultFunction.md)

The function to take in the results of a task

#### Returns

`void`

***

### configureLogger()

```ts
configureLogger(logger): void;
```

Defined in: [JustInWrapper.ts:279](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L279)

Configures the logger with a custom logger instance.

#### Parameters

##### logger

[`Logger`](../../logger/logger.interface/interfaces/Logger.md)

The logger implementation to use.

#### Returns

`void`

***

### configureTaskResultWriter()

```ts
configureTaskResultWriter(taskWriter): void;
```

Defined in: [JustInWrapper.ts:288](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L288)

Configures the writer for a task result with a custom function.
Will default to writing to the db

#### Parameters

##### taskWriter

[`RecordResultFunction`](../../handlers/handler.type/type-aliases/RecordResultFunction.md)

The function to take in the results of a task

#### Returns

`void`

***

### createIntervalTimerEventGenerator()

```ts
createIntervalTimerEventGenerator(
   eventTypeName, 
   intervalInMs, 
   options): void;
```

Defined in: [JustInWrapper.ts:227](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L227)

Creates a new interval timer event generator.

#### Parameters

##### eventTypeName

`string`

The name of the event type.

##### intervalInMs

`number`

The interval in milliseconds.

##### options

[`IntervalTimerEventGeneratorOptions`](../../event/event.type/type-aliases/IntervalTimerEventGeneratorOptions.md) = `{}`

The options for the event generator.

#### Returns

`void`

***

### deleteUser()

```ts
deleteUser(uniqueIdentifier): Promise<void>;
```

Defined in: [JustInWrapper.ts:197](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L197)

Deletes a user from the database by their unique identifier.

#### Parameters

##### uniqueIdentifier

`string`

The unique identifier of the user.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user is deleted.

***

### getAllUsers()

```ts
getAllUsers(): Promise<(null | JUser)[]>;
```

Defined in: [JustInWrapper.ts:160](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L160)

Retrieves a list of users from the database.

#### Returns

`Promise`\<(`null` \| [`JUser`](../../user-manager/user.type/type-aliases/JUser.md))[]\>

The list of users, or null if not found.

***

### getInitializationStatus()

```ts
getInitializationStatus(): boolean;
```

Defined in: [JustInWrapper.ts:72](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L72)

Returns the initialization status of the JustInWrapper.

#### Returns

`boolean`

The initialization status.

***

### getIntervalTimerEventGenerators()

```ts
getIntervalTimerEventGenerators(): Map<string, IntervalTimerEventGenerator>;
```

Defined in: [JustInWrapper.ts:236](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L236)

Returns the interval timer event generators.

#### Returns

`Map`\<`string`, `IntervalTimerEventGenerator`\>

The interval timer event generators.

***

### getUser()

```ts
getUser(uniqueIdentifier): Promise<null | JUser>;
```

Defined in: [JustInWrapper.ts:178](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L178)

Retrieves a user from the database by their unique identifier.

#### Parameters

##### uniqueIdentifier

`string`

The unique identifier of the user.

#### Returns

`Promise`\<`null` \| [`JUser`](../../user-manager/user.type/type-aliases/JUser.md)\>

The user, or null if not found.

***

### init()

```ts
init(dbType): Promise<void>;
```

Defined in: [JustInWrapper.ts:82](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L82)

Initializes the DataManager and UserManager, setting up the database connection.
This should be called before any operations that depend on the database.

#### Parameters

##### dbType

`DBType` = `DBType.MONGO`

The type of database to initialize (default is MongoDB).

#### Returns

`Promise`\<`void`\>

***

### publishEvent()

```ts
publishEvent(
   eventType, 
   generatedTimestamp, 
eventDetails?): Promise<void>;
```

Defined in: [JustInWrapper.ts:248](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L248)

Publishes an event, adding it to the processing queue.

#### Parameters

##### eventType

`string`

The type of the event.

##### generatedTimestamp

`Date`

The timestamp of the event.

##### eventDetails?

`object`

The details of the event instance.
     NOTE: publishEventDetails expects a Record,
     but I don't think we want to expose this to 3PDs

#### Returns

`Promise`\<`void`\>

***

### registerDecisionRule()

```ts
registerDecisionRule(decisionRule): void;
```

Defined in: [JustInWrapper.ts:271](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L271)

Registers a new decision rule within the framework.

#### Parameters

##### decisionRule

[`DecisionRuleRegistration`](../../handlers/handler.type/type-aliases/DecisionRuleRegistration.md)

The decision rule to register.

#### Returns

`void`

***

### registerEventHandlers()

```ts
registerEventHandlers(eventType, handlers): Promise<void>;
```

Defined in: [JustInWrapper.ts:206](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L206)

Registers a new event type and adds it to the queue.

#### Parameters

##### eventType

`string`

The type of the event.

##### handlers

`string`[]

The ordered task or decision rule names for the event.

#### Returns

`Promise`\<`void`\>

***

### registerTask()

```ts
registerTask(task): void;
```

Defined in: [JustInWrapper.ts:263](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L263)

Registers a new task within the framework.

#### Parameters

##### task

[`TaskRegistration`](../../handlers/handler.type/type-aliases/TaskRegistration.md)

The task to register.

#### Returns

`void`

***

### setLoggingLevels()

```ts
setLoggingLevels(levels): void;
```

Defined in: [JustInWrapper.ts:305](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L305)

Sets the logging levels for the application.

#### Parameters

##### levels

`Partial`\<*typeof* `logLevels`\>

The logging levels to enable or disable.

#### Returns

`void`

***

### setupEventQueueListener()

```ts
setupEventQueueListener(): void;
```

Defined in: [JustInWrapper.ts:255](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L255)

Sets up the event queue listener.

#### Returns

`void`

***

### shutdown()

```ts
shutdown(): Promise<void>;
```

Defined in: [JustInWrapper.ts:97](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L97)

Shuts down data manager, user manager, and event queue.
Clears all interval timer event generators and event handlers.
This should be called when the application is shutting down.

#### Returns

`Promise`\<`void`\>

***

### startEngine()

```ts
startEngine(): Promise<void>;
```

Defined in: [JustInWrapper.ts:120](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L120)

Starts the event queue engine, processing all queued events.
This should be called after init().

#### Returns

`Promise`\<`void`\>

***

### stopEngine()

```ts
stopEngine(): Promise<void>;
```

Defined in: [JustInWrapper.ts:138](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L138)

Stops the engine, halts event processing, and unregisters all clock events.
This can be called to stop the engine without shutting down the application.

#### Returns

`Promise`\<`void`\>

***

### unregisterEventHandlers()

```ts
unregisterEventHandlers(eventType): void;
```

Defined in: [JustInWrapper.ts:217](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L217)

Unregisters an existing event by name.

#### Parameters

##### eventType

`string`

The type of the event to unregister.

#### Returns

`void`

***

### updateUser()

```ts
updateUser(uniqueIdentifier, attributesToUpdate): Promise<null | JUser>;
```

Defined in: [JustInWrapper.ts:188](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L188)

Retrieves a user from the database by their unique identifier.

#### Parameters

##### uniqueIdentifier

`string`

The unique identifier of the user.

##### attributesToUpdate

`Record`\<`string`, `any`\>

The attributes to update in the user record.

#### Returns

`Promise`\<`null` \| [`JUser`](../../user-manager/user.type/type-aliases/JUser.md)\>

The user, or null if not found.

***

### getInstance()

```ts
static getInstance(): JustInWrapper;
```

Defined in: [JustInWrapper.ts:52](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L52)

Retrieves the singleton instance of JustInWrapper.

#### Returns

`JustInWrapper`

The singleton instance.

***

### killInstance()

```ts
static killInstance(): void;
```

Defined in: [JustInWrapper.ts:62](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/JustInWrapper.ts#L62)

Deletes the singleton instance of JustInWrapper.

#### Returns

`void`
