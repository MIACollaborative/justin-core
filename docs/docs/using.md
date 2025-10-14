---
id: using
title: Using JustIn Core
sidebar_position: 1
---


# Justin Core

The `@just-in/core` package is a lightweight, **event-driven** framework for building **Just-In-Time Adaptive Interventions (JITAIs)**. It helps research app developers define, schedule, and deliver adaptive interventions using events, decision rules, and tasks.

## Requirements

`@just-in/core` is avilable via npm and can be used by applications written in TypeScript or JavaScript. `@just-in/core` iteself is written in TypeScript, so all of our documentation and examples will be offered in TypeScript.

`@just-in/core` requires node version 20+. You can check your version via `node --version` and if you need to upgrade you can do so at the [nodejs website](https://nodejs.org/).

There are two ways to run `@just-in/core`, **standard mode** and **serverless mode** (a.k.a. "JustInLite"). 
* **Standard mode** requires a connection to a MongoDB server. We have [guides to walk you through selecting and configuring a MongoDB installation](./guides/mongo.md) to work with JustIn. 
* **Serverless** mode is designed to be run as a cloud function/lambda within a cloud services environment such as Google Cloud or Amazon Web Services. See the [Serverless with JustInLite and Google Cloud guide](./guides/gcp.md) for instructions on setting up JustInLite.

To use `@just-in/core` in either mode, create an npm package and install `@just-in/core`.


import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="yarn" label="yarn">
    ```bash
    $ mkdir my-justin-app
    $ cd my-justin-app
    $ yarn init 
    $ yarn add @just-in/core
    ```
  </TabItem>
  <TabItem value="js" label="npm">
    ```bash
    $ mkdir my-justin-app
    $ cd my-justin-app
    $ npm init 
    $ npm install @just-in/core
    ```
  </TabItem>
</Tabs>

You can also start with one of our [examples](https://github.com/MIACollaborative/justin-examples) (recommended).
