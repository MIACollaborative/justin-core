# Type Alias: StepReturnResult\<T\>

```ts
type StepReturnResult<T> = {
  error?: any;
  result?: T;
  status: "success" | "stop" | "error";
};
```

Defined in: [handlers/handler.type.ts:4](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/handlers/handler.type.ts#L4)

## Type Parameters

### T

`T` = `any`

## Properties

### error?

```ts
optional error: any;
```

Defined in: [handlers/handler.type.ts:7](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/handlers/handler.type.ts#L7)

***

### result?

```ts
optional result: T;
```

Defined in: [handlers/handler.type.ts:6](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/handlers/handler.type.ts#L6)

***

### status

```ts
status: "success" | "stop" | "error";
```

Defined in: [handlers/handler.type.ts:5](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/handlers/handler.type.ts#L5)
