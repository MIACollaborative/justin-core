---
id: users
title: JUser
sidebar_position: 4
---

All users (or "participants") in JustIn are represented by `JUser` objects. When adding new users to JustIn, you need to provide a `NewUserRecord` which is just a `JUser` without the JustIn-provided id.

`JUser` and `NewUserRecord` type definitions:
```
export type JUser = {
  id: string;
  uniqueIdentifier: string;
  attributes: Record<string, any>;
};

export type NewUserRecord = {
  uniqueIdentifier: string;
  attributes: Record<string, any>;
};

```

The `uniqueIdentifier` is a required field that is *provided by the application developer*. This allows your application to use your own, study-specific mechanism for referring to your users. Given that being able to identify users is necessary for other study activities such as participant management and data analysis, we felt that using externally-supplied identifiers made sense. It also makes log inspection and participant management a bit easier because the research team will be more able to identify particular users using study-relevant and likely human-readable identifiers (e.g. P1, participant1@study.org) rather than obscure, database-generated IDs like `688bf62c8873d720f2d8b401`. Those are still part of the JUser object, but you won't need them in order to manage your users in JustIn.

The other essential aspect of each `JUser` object is the `attributes` field, which is a key-value map (aka `Record<string, any>`) that you can use to represent variables related to each user that are important to your study, including the operation of your DecisionRules and Tasks (e.g., contextual states used for taiolring, study arm labels used for activating different intervention components).

Here are examples of working with `JUsers`:

Adding users in bulk. 

```
import JustIn from '@just-in/core';

const usersToAdd: NewUserRecord[] = [
  {
    uniqueIdentifier: 'participant1',
    attributes: {
      firstName: 'Alice',
      
    }
  }

]