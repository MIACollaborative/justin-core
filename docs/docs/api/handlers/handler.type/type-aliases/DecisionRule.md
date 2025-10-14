# Type Alias: DecisionRule

```ts
type DecisionRule = BaseHandler & {
  selectAction: (user, event, previousResult) => 
     | Promise<StepReturnResult>
    | StepReturnResult;
};
```

Defined in: [handlers/handler.type.ts:47](https://github.com/MIACollaborative/justin-core/blob/8385d4d0d777ed86964a505a463641e5698aeac0/src/handlers/handler.type.ts#L47)

## Type declaration

### selectAction()

```ts
selectAction: (user, event, previousResult) => 
  | Promise<StepReturnResult>
  | StepReturnResult;
```

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
