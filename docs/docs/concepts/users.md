---
id: users
title: JUser
sidebar_position: 4
---
# JUsers (JustIn Users)

All users (or "participants") in JustIn are represented by `JUser` objects. When adding new users to JustIn, you need to provide a `NewUserRecord` which is just a `JUser` without the JustIn-provided id.

`JUser` and `NewUserRecord` type definitions:
```ts
export type JUser = {
  id: string;
  uniqueIdentifier: string;
  attributes: Record<string, any>;
};

export type NewUserRecord = {
  uniqueIdentifier: string;
  initialAttributes: Record<string, any>;
};
```

The `uniqueIdentifier` is a required field that is *provided by the application developer*. This allows your application to use your own, study-specific mechanism for referring to your users. Given that being able to identify users is necessary for other study activities such as participant management and data analysis, we felt that using externally-supplied identifiers made sense. It also makes log inspection and participant management a bit easier because the research team will be more able to identify particular users using study-relevant and likely human-readable identifiers (e.g. P1, participant1@study.org) rather than obscure, database-generated IDs like `688bf62c8873d720f2d8b401`. Those gnarly IDs are still part of the JUser object, but you won't need them in order to manage your users in JustIn.

The other essential aspect of each `JUser` object is the `attributes` field, which is a key-value map (aka `Record<string, any>`) that you can use to represent variables related to each user that are relevant to your study, including the operation of your DecisionRules and Tasks (e.g., contextual states used for taiolring, study arm labels used for activating different intervention components, etc.).

The JustIn functions for working with users have the following signatures:
```ts
async addUsers (newUserRecords: NewUserRecord []): Promise<JUser []>;
async addUser (newUserRecord: NewUserRecord): Promise<JUser>;
async updateUser(uniqueIdentifier: string, attributesToUpdate: Record<string, any>): Promise<JUser>;
async deleteUser(uniqueIdentifier: string): Promise<void>;
async getUser(uniqueIdentifier: string): Promise<JUser>;
```

## Examples:

For all of these examples, first initialize JustIn:
```ts
import JustIn from '@just-in/core';

const justIn = JustIn();
await justIn.init();
```

Adding users in bulk. 
```ts
const usersToAdd: NewUserRecord[] = [
  {
    uniqueIdentifier: 'participant1',
    initialAttributes: {
      firstName: 'Alice',
      studyPhase: 'active',
      timezone: 'America/Detroit'
    }
  },
  {
    uniqueIdentifier: 'participant2',
    initialAttributes: {
      firstName: 'Bob',
      studyPhase: 'baseline',
      timezone: 'America/Los Angeles'
    },
  }
]

await justIn.addUsers(usersToAdd);
```

Adding just one user (after justIn.init(), of course):
```ts
await justIn.addUser({
  uniqueIdentifier: participant3,
  initialAttributes: {
    firstName: 'Charlie',
    studyPhase: 'pre-enrollment',
    timezone: 'America/Chicago'
  }
});
```

Updating a user's attributes:
```ts
await justIn.updateUser('participant2', {studyPhase: 'active'});
```

Deleting a user (be careful! can't undo!):
```ts
await justIn.deleteUser('participant1'); // bye Alice!
```

Retrieving a specific `JUser`:
```ts
const theUser = await justIn.getUser('participant3');
```
