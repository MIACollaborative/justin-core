---
id: logging
title: Logging and Result Writing
sidebar_position: 5
---

# Logging and Result Writing
JustIn provides support for standard logging as well as "result writing" for recording the results of Tasks and Decision Rules. Result writing is treated separately from standard logging to provide greater control over the handling of study execution data required for analysis.

## Logging
Here is the interface for a JustIn `Logger`:

```ts
/**
 * Interface defining methods for logging at various levels, with optional custom functions.
 */
export interface Logger {
  /**
   * Logs an informational message.
   * @param args - The arguments to log (can be any type of data like strings, objects, etc.).
   */
  info?: (...args: any[]) => void;

  /**
   * Logs a warning message.
   * @param args - The arguments to log (can be any type of data like strings, objects, etc.).
   */
  warn?: (...args: any[]) => void;

  /**
   * Logs an error message.
   * @param args - The arguments to log (can be any type of data like strings, objects, etc.).
   */
  error?: (...args: any[]) => void;

  /**
   * Logs an development message in env var NODE_ENV === 'dev'.
   * @param args - The arguments to log (can be any type of data like strings, objects, etc.).
   */
  dev?: (...args: any[]) => void;
}
```

By default, JustIn creates a `ConsoleLogger` that simply passes any arguments through to the corresponsing `console` method and includes logic for suppressing `dev` output in production mode:
```ts
import { Logger } from './logger.interface';

/**
 * Default logger implementation that logs messages to the console.
 */
export const ConsoleLogger: Logger = {
  info(...args: any[]): void {
    console.log('INFO:', ...args);
  },

  warn(...args: any[]): void {
    console.warn('WARN:', ...args);
  },

  error(...args: any[]): void {
    console.error('ERROR:', ...args);
  },

  dev(...args: any[]): void {
    if (process.env.NODE_ENV !== 'PROD') {
      console.log('DEV:', ...args);
    }
  }
};
```

However, you can replace any or all of the logging methods by calling `setLogger()` on the JustIn Wrapper you receive from the `JustIn()` call. For example:

```ts
const justIn = JustIn(); // this works with JustInLite() as well
justIn.setLogger({
  error: (...args: any[]): void => {
    console.error(args);
    emailDevTeam(args); // or some such
  }
});
```

Note that since all of the methods on the `Logger` interface are optional, you can replace any or all of them as you see fit. Any that are not explicitly overridden will be executed by the default `ConsoleLogger`.

## Result Writing
Results of Task and Decision Rule execution are written to persistent storage and/or output logs, depending on factors described below. 

**Note that `RecordResult`s are only written when `shouldActivate()` returns a `StepReturnResult` with `status: 'success'`. If you want to change this behavior you MUST provide a custom `ResultWriter` as described below.**

Recall that [JustIn Handlers](./concepts/handlers) (i.e., Tasks and Decision Rules) all return `StepReturnResult`s which contain both the high level outcome (`status`) of the step (`success`, `stop`, `error`), as well as an optional `result` field. The value of the `result` is an object that can contain any key-value pairs deemed useful by the study team for documenting the outcome of executing a particular handler for a particular user. All of the `StepReturnResult`s for a handler execution are collected by JustIn and written to a `RecordResult` with the following structure:

```ts
type RecordResult = {
  event: JEvent
  name: string,
  steps: ExecuteStepReturn[],
  user: JUser,
}

//ExecuteStepReturn is simply a wrapper for a StepReturnResult from a Task or Decision Rule
type ExecuteStepReturn<T = any> = {
  step: string;
  result: StepReturnResult<T>;
  timestamp: Date;
};
```

Note that, in addition to the `StepReturnResult`s, the `RecordResult` includes a snapshot of the `JUser` at the time of handler execution as well as the details of the `JEvent` that triggered the execution. 

After executing a handler for a user, JustIn passes the `RecordResult` to the appropriate *result recorder* function (i.e., `DecisionRuleResultRecorder` or `TaskResultRecorder`, depending on the handler type). What happens to the `ResultRecord` next depends upon the JustIn mode (standard or serverless) and/or optional configuration actions taken by your app.


import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="justin" label="Standard JustIn">
    By default, 
    * `DecisionRule` `ResultRecord`s are written to the `"decision_rule_results"` Mongo Collection (one Document per record).
    * `Task` `ResultRecord`s are written to the `"task_results"` Collection
  </TabItem>
  <TabItem value="justinlite" label="JustIn Lite (Serverless)">
    By default, all results are written to `console.log()` since there is no persistent storage. Overriding the `Recorder`s is *strongly recommended* to ensure you will have handler execution results available for later analysis.
  </TabItem>
</Tabs>

In both cases, you can override the default `ResultRecord` writing behavior by calling `setDecisionRuleResultRecorder(RecordResultFunction)` and/or `setTaskResultRecorder(RecordResultFunction)`, providing a `RecordResultFunction` of the form:
```ts
type RecordResultFunction = (record: RecordResult) => Promise<void> | void;
```

For example:

```ts
import JustIn from "@just-in/core";

const justIn = JustIn(); 
justIn.setTaskResultRecorder((result: RecordResult): void => {
  // we don't need task results for our analysis, so we'll just log 'em
  console.log(JSON.stringify(result));
});           

```