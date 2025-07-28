[**justin-core v0.1.0**](../README.md)

***

> `const` **Log**: `object`

Defined in: [logger/logger-manager.ts:48](https://github.com/MIACollaborative/justin-core/blob/d7ac85767c605f4ece587ef724c9ea4072392fcd/src/logger/logger-manager.ts#L48)

Provides a unified logging interface that respects log level configuration.
Each log method will only output if its corresponding log level is enabled.

## Type declaration

### dev()

> **dev**(`message`, ...`optionalParams`): `void`

Logs a message if `dev` logging is enabled and env var NODE_ENV === 'dev'.

#### Parameters

##### message

`string`

The message to log.

##### optionalParams

...`any`[]

Additional parameters for the log.

#### Returns

`void`

### error()

> **error**(`message`, ...`optionalParams`): `void`

Logs an error message if `error` logging is enabled.

#### Parameters

##### message

`string`

The message to log.

##### optionalParams

...`any`[]

Additional parameters for the log.

#### Returns

`void`

### handlerResult()

> **handlerResult**(`handlerResults`): `void`

Logs a result for a handler if `handlerResults` logging is enabled.

#### Parameters

##### handlerResults

`RecordResult`

Data on the event, the handler, and the results of its steps.

#### Returns

`void`

### info()

> **info**(`message`, ...`optionalParams`): `void`

Logs an informational message if `info` logging is enabled.

#### Parameters

##### message

`string`

The message to log.

##### optionalParams

...`any`[]

Additional parameters for the log.

#### Returns

`void`

### warn()

> **warn**(`message`, ...`optionalParams`): `void`

Logs a warning message if `warn` logging is enabled.

#### Parameters

##### message

`string`

The message to log.

##### optionalParams

...`any`[]

Additional parameters for the log.

#### Returns

`void`
