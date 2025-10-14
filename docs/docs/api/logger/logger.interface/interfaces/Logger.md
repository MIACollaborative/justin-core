# Interface: Logger

Defined in: [logger/logger.interface.ts:5](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/logger/logger.interface.ts#L5)

Interface defining methods for logging at various levels, with optional custom functions.

## Properties

### dev()?

```ts
optional dev: (...args) => void;
```

Defined in: [logger/logger.interface.ts:28](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/logger/logger.interface.ts#L28)

Logs an development message in env var NODE_ENV === 'dev'.

#### Parameters

##### args

...`any`[]

The arguments to log (can be any type of data like strings, objects, etc.).

#### Returns

`void`

***

### error()?

```ts
optional error: (...args) => void;
```

Defined in: [logger/logger.interface.ts:22](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/logger/logger.interface.ts#L22)

Logs an error message.

#### Parameters

##### args

...`any`[]

The arguments to log (can be any type of data like strings, objects, etc.).

#### Returns

`void`

***

### info()?

```ts
optional info: (...args) => void;
```

Defined in: [logger/logger.interface.ts:10](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/logger/logger.interface.ts#L10)

Logs an informational message.

#### Parameters

##### args

...`any`[]

The arguments to log (can be any type of data like strings, objects, etc.).

#### Returns

`void`

***

### warn()?

```ts
optional warn: (...args) => void;
```

Defined in: [logger/logger.interface.ts:16](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/logger/logger.interface.ts#L16)

Logs a warning message.

#### Parameters

##### args

...`any`[]

The arguments to log (can be any type of data like strings, objects, etc.).

#### Returns

`void`
