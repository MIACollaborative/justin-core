# Type Alias: BaseHandler

```ts
type BaseHandler = {
  afterExecution?: (event) => Promise<void> | void;
  beforeExecution?: (event) => Promise<void> | void;
  doAction: (user, event, previousResult) => 
     | Promise<StepReturnResult>
    | StepReturnResult;
  name: string;
  shouldActivate: (user, event) => 
     | Promise<StepReturnResult>
    | StepReturnResult;
  type: HandlerType;
};
```

Defined in: [handlers/handler.type.ts:38](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/handlers/handler.type.ts#L38)

Base type for shared properties between DecisionRule and Task.

## Properties

### afterExecution()?

```ts
optional afterExecution: (event) => Promise<void> | void;
```

Defined in: [handlers/handler.type.ts:44](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/handlers/handler.type.ts#L44)

#### Parameters

##### event

[`JEvent`](../../../event/event.type/type-aliases/JEvent.md)

#### Returns

`Promise`\<`void`\> \| `void`

***

### beforeExecution()?

```ts
optional beforeExecution: (event) => Promise<void> | void;
```

Defined in: [handlers/handler.type.ts:41](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/handlers/handler.type.ts#L41)

#### Parameters

##### event

[`JEvent`](../../../event/event.type/type-aliases/JEvent.md)

#### Returns

`Promise`\<`void`\> \| `void`

***

### doAction()

```ts
doAction: (user, event, previousResult) => 
  | Promise<StepReturnResult>
  | StepReturnResult;
```

Defined in: [handlers/handler.type.ts:43](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/handlers/handler.type.ts#L43)

#### Parameters

##### user

[`JUser`](../../../user-manager/user.type/type-aliases/JUser.md)

##### event

[`JEvent`](../../../event/event.type/type-aliases/JEvent.md)

##### previousResult

[`StepReturnResult`](StepReturnResult.md)

#### Returns

  \| `Promise`\<[`StepReturnResult`](StepReturnResult.md)\>
  \| [`StepReturnResult`](StepReturnResult.md)

***

### name

```ts
name: string;
```

Defined in: [handlers/handler.type.ts:39](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/handlers/handler.type.ts#L39)

***

### shouldActivate()

```ts
shouldActivate: (user, event) => 
  | Promise<StepReturnResult>
  | StepReturnResult;
```

Defined in: [handlers/handler.type.ts:42](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/handlers/handler.type.ts#L42)

#### Parameters

##### user

[`JUser`](../../../user-manager/user.type/type-aliases/JUser.md)

##### event

[`JEvent`](../../../event/event.type/type-aliases/JEvent.md)

#### Returns

  \| `Promise`\<[`StepReturnResult`](StepReturnResult.md)\>
  \| [`StepReturnResult`](StepReturnResult.md)

***

### type

```ts
type: HandlerType;
```

Defined in: [handlers/handler.type.ts:40](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/handlers/handler.type.ts#L40)
