---
id: gcp
title: Serverless with JustInLite and Google Cloud
sidebar_position: 6
---
import sched1 from '/img/sched1-create.png';
import sched2 from '/img/sched2-define.png';
import sched3 from '/img/sched3-configure.png';
import sched4 from '/img/sched4-create-topic.png';
import sched5 from '/img/sched5-topic-body.png';
import sched6 from '/img/sched6-options.png';
import sched7 from '/img/sched7-list-paused.png';
import sched8 from '/img/sched8-list-running.png';
import run1 from '/img/run1-logs.png';


# Serverless Execution with JustInLite and Google Cloud
Modern cloud computing platforms like Google Cloud Platform and Amazon Web Services offer tools for "serverless execution" which allow developers to run application code without needing to set up and maintain servers, databases, and the like. This guide will show you how to execute your Decision Rules and Tasks using features of Google Cloud Platform, including Cloud Scheduler and Cloud Run Functions. 

## JustInLiteWrapper
The `JustInLiteWrapper` is an alternative to the `JustInWrapper` that supports serverless execution. It differs from the standard `JustInWrapper` in the following ways:
1. It does not require a connection to a Mongo database.
2. It does not create or use event generators such as the built-in `IntervalTimerEventGenerator` to create and publish events.

Instead, `JustInLite` apps depend on external services for reading and writing data, and leverage the host cloud environment for generating events that trigger rule execution.

Importantly, the lifecycle of a `JustInLite` app is *very different* from that of a typical `JustIn` app. Whereas a typical `JustIn` app is expected to run indefinitely once started, a `JustInLite` app is short-lived. The `JustInLite` app lifecycle is as follows:
* An external event (e.g., a Cloud Scheduler event) triggers the invocation of the app (e.g., by invoking a Cloud Run Function that contains the app code).
* The `JustInLite` app calls external APIs to assemble the resources it needs (e.g., user records, content objects) for its `DecisionRule`s and `Task`s. The app calls `JustInLiteWrapper.loadUsers()` with the user records obtained from the external service.
* If the app wishes to write logs and/or result records (for `DecisionRule` and/or `Task` execution results) to anywhere other than the default `console` (e.g., by calling an external API to store the logs/results somewhere else), it calls `configureLogger()`, `configureDecisionRuleResultWriter()`, or `configureTaskResultWriter()` with a custom `Logger`, as appropriate.
* The app calls `JustInLiteWrapper.registerDecisionRule()` and `JustInLiteWrapper.registerTask()` to register the rules and tasks it needs to execute.
* The app calls `JustInLiteWrapper.registerEventHandlers()` to map the rules and tasks to the event that will invoke them. Most `JustInLite` apps will have just one event type that is mapped to all of the app's rules and tasks, but there may be cases where multiple events and mappings make sense.
* Execution of the rules and tasks is kicked off when the app calls `JustInLiteWrapper.publishEvent()`. [IMPORTANT: the `eventType` passed to `processEvent()` must match the `eventType` specified in the call to `registerEventHandlers()`.]
* After the published event is processed (i.e., all tasks and rules have been executed for all users), the app terminates. The next external event will trigger a completely new and fresh execution of the app, with no internal state preserved between executions. 

## Create a JustInLite engine app
Your app will look pretty much the same as a standard JustIn app, with just a couple of exceptions

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="ts" label="TypeScript">
    ```ts
    import JustInLite from "@just-in/core";
    import { MySimpleTask } from "./my-simple-task"; // defined elsewhere

    export const runApp: CloudEventFunction<MessagePublishedData> = 
      async (cloudEvent: CloudEvent<MessagePublishedData>) => {

      try {
        const justIn = JustInLite(); // get a reference to the framework
        justIn.init();               // prepare JustIn to receive instructions

        await justIn.loadUsers(getUsersFromSomewhere()); // such as an API

        justIn.registerTask(MySimpleTask);

        justIn.registerEventHandlers(
          "MyEventType",         // event type for which handlers are being registered
          [MySimpleTask.name]    // names of handlers to invoke when event type is received
        );

        // Determine event time, using the cloud event time if possible
        const eventTime: Date = cloudEvent.publish_time
          ? new Date(
            typeof cloudEvent.publish_time === 'string'
              ? cloudEvent.publish_time
              : JSON.stringify(cloudEvent.publish_time)
          )
          : new Date();

        // optional, but recommended: define an idempotency key to prevent overlapping execution
        const idemKey: string = cloudEvent.message_id;

        // tell JustIn to process the event
        await justIn.processEvent('demo', eventTime, {}, `${idemKey}`);

      } catch (error) {
        Log.warn('Fatal error in runApp:', error);
        throw error;
      } finally {
        await justIn.killInstance(); // clean up for the next run
      }
    }
    ```
  </TabItem>
  <TabItem value="js" label="JavaScript">
    ```js
    import JustInLite from "@just-in/core";
    import { MySimpleTask } from "./my-simple-task"; // defined elsewhere

    export const runApp = async (cloudEvent) => {

      try {
        const justIn = JustInLite(); // get a reference to the framework
        justIn.init();               // prepare JustIn to receive instructions

        await justIn.loadUsers(getUsersFromSomewhere()); // such as an API

        justIn.registerTask(MySimpleTask);

        justIn.registerEventHandlers(
          "MyEventType",         // event type for which handlers are being registered
          [MySimpleTask.name]    // names of handlers to invoke when event type is received
        );

        // Determine event time, using the cloud event time if possible
        const eventTime = cloudEvent.publish_time
          ? new Date(
            typeof cloudEvent.publish_time === 'string'
              ? cloudEvent.publish_time
              : JSON.stringify(cloudEvent.publish_time)
          )
          : new Date();

        // optional, but recommended: define an idempotency key to prevent overlapping execution
        const idemKey = cloudEvent.message_id;

        // tell JustIn to process the event
        await justIn.processEvent('demo', eventTime, {}, `${idemKey}`);

      } catch (error) {
        Log.warn('Fatal error in runApp:', error);
        throw error;
      } finally {
        await justIn.killInstance(); // clean up for the next run
      }
    }
    ```
  </TabItem>
</Tabs>

## Set up Google Cloud Platform for a JustInLite app
*Note: This section assumes basic familiarity with Google Cloud. For example, it is assumed that you know how to create and administer a Google Cloud Project. It also assumes that you have the [gcloud cli](https://cloud.google.com/sdk/gcloud) installed and configured locally.*

### Create a Cloud Scheduler job
1. Go to the Cloud Scheduler tab in the Google Cloud Console and choose "Create job".
    <img src={sched1} width={200}/>
1. Give the schedule a name and a frequency. Here we are giving the name "every-minute-event-generator" and setting the schedule to run every minute.
    <img src={sched2} width={300}/>

2. Configure the execution of the schedule by choosing the "Pub/Sub" target type and selecting "Create a topic" from the topic selection dropdown.
    <img src={sched3} width={300}/>

1. Create the topic by giving it a name and taking the defaults for the other options. You will need to refer to this name later, so choose wisely! Here we have chosen the name "every-minute-event".
    <img src={sched4} width={300}/>

1. Enter a body for the pub sub message that will be sent. A body is required, but we will be ignoring it so you can enter whatever you want.
    <img src={sched5} width={300}/>

1. Leave the defaults for optional settings and click "Create."
    <img src={sched6} width={300}/>

1. Now you should see the job in your list.
    <img src={sched7} width={500}/>

1. Select it and click "Force Run." Your scheduler job is up and running!
    <img src={sched8} width={500}/>

## Deploy to a Cloud Function
To deploy your JustInLite app, you will need to use the [`gcloud cli`](https://cloud.google.com/sdk/docs/install). The following commands assume that your JustInLite app and all of its depdencies are in a `dist` directory with an `index.js` file at the top level that contains the exported `runApp()` function shown above. Note:
* change the `region` to the region where your Cloud Project is hosted
* make sure the `trigger-topic` is the same as the one you defined for your Cloud Scheduler event's pub sub action.
* you can place any needed environment variables in a YAML file named (in this example) `.env.yaml`. The format should be
```yaml
# env.yaml
MY_API_KEY: "XYZPDQABCDEF"
```
```zsh
$ gcloud project set <your-project-name>
$ gcloud functions deploy every-minute-handler --region=us-central1 --min-instances=1 --runtime=nodejs20 --gen2  --source=dist --entry-point=runApp --trigger-topic=every-minute-event --memory=1024MB --env-vars-file=.env.yaml
```
It will take a few minutes, but when the command completes your cloud function will be deployed and will start executing whenever the Scheduler event is fired (once per minute in this example). You can find the deployed function in your Cloud Project's "Cloud Run" tab, where you can see various metrics as well as the logs, which will contain any Logger output from your app. 
    <img src={run1} width={500}/>


