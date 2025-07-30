---
id: using
title: Using JustIn Core
sidebar_position: 2
---


# Justin Core

The `just-in/core` package is a lightweight, **event-driven** framework for building **Just-In-Time Adaptive Interventions (JITAIs)**. It helps research app developers define, schedule, and deliver adaptive interventions using events, decision rules, and tasks.

## Requirements

`just-in/core` requires a connection to a MongoDB server. We have guides to walk you through selecting and configuring a MongoDB installation to work with JustIn.

`just-in/core` is avilable via npm and can be used by applications written in TypeScript or JavaScript. `just-in/core` iteself is written in TypeScript, so all of our documentation and examples will be offered in TypeScript.

`just-in/core` requires node version 20+. You can check your version via `node --version` and if you need to upgrade you can do so at the [nodejs website](https://nodejs.org/).

To use `just-in/core` in an application, create an npm package and install just-in/core.

If using yarn:
```bash
$ mkdir my-justin-app
$ cd my-justin-app
$ yarn init 
$ yarn add @just-in/core
```

If using npm:
```bash
$ mkdir my-justin-app
$ cd my-justin-app
$ npm init 
$ npm install @just-in/core
```

You can also start with one of our [examples](https://github.com/MIACollaborative/justin-examples) (recommended), or our tutorial.
