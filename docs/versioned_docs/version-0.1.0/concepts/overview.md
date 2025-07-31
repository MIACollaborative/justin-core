---
id: overview
title: Overview
sidebar_position: 1
---

The primary way that you will interact with JustIn Core as an app developer is to write **Decision Rules** and **Tasks** (collectively called **"Event Handlers"**) that are executed when certain **Events** (called **JEvents** in JustIn) occur. The code you write for your Decision Rules and Tasks will be executed by JustIn for *each* event and *each* user independently.

You will also write code to specify how and when events are generated, and how those events are mapped to the Decision Rules and Tasks that should execute for each. JustIn comes with one built-in event generator--the IntervalTimerEventGenerator--that you can enable to fire events at a specified interval (e.g., every minute or every hour).

A very basic JustIn app looks like this:

```ts
import JustIn from "just-in/core";
import { MySimpleTask } from "./my-simple-task"; // TBD

const justIn = JustIn(); // get a reference to the framework
justIn.init();           // prepare JustIn to receive instructions

justIn.registerTask(MySimpleTask);
justIn.createIntervalTimerEventGenerator(
  "MyEventType",         // event type to generate
  1000 * 60,             // interval: one minute in milliseconds
);

justIn.registerEventHandlers(
  "MyEventType",         // event type for which handlers are being registered
  [MySimpleTask.name]    // names of handlers to invoke when event type is received
);

justIn.startEngine();   // starts event generators and processing

```
