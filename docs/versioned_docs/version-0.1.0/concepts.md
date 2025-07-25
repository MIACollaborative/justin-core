---

id: concepts
title: Core Concepts
sidebar\_position: 2
--------------------

# Core Concepts

This page covers the key architectural concepts in `justin-core`. It’s useful for developers building custom handlers or researchers designing adaptive interventions.

---

## 🎯 Participants

Participants represent individual units (e.g. users in a study). Each participant must have a unique `participantId`. When an event runs, tasks and decision rules are executed **for each participant**.

Participant data is typically loaded from a database or API (e.g. MyDataHelps), and may include custom fields like demographics, recent behavior, or wearable data (e.g. steps).

---

## ⏰ Events

Events are central scheduling units that trigger a sequence of tasks and decision rules.

Each event has:

* A `name`
* A polling interval (e.g. every 15 min or daily)
* An ordered list of handler names (tasks and/or decision rules)

When triggered, the event is placed on the queue and executed in order for every participant.

---

## 🧩 Tasks

Tasks are side-effect handlers. They are typically used for:

* Fetching or transforming external data (e.g. Fitbit, weather)
* Logging activity
* Persisting changes

Each task implements:

* `shouldActivate` (optional): whether to run the task
* `doAction`: the main logic (e.g. fetch data, write to DB)

---

## 🧠 Decision Rules

Decision rules are the core unit of logic in a JITAI.

Each rule determines:

* If an intervention should happen (`shouldActivate`)
* What action to take (`selectAction`)
* How to carry it out (`doAction`)

The action object returned from `selectAction` can include custom types — e.g. messages, notifications, triggers — that are interpreted by the third-party application.

---

## 🔁 Execution Flow

1. A clock or API call triggers an event (e.g. `morningStepCheck`)
2. For each participant:

    * Tasks are evaluated in order
    * Decision rules run in sequence
3. Each handler checks `shouldActivate` → if true, proceeds
4. Tasks run `doAction`; decision rules run `selectAction` → `doAction`
5. Results are logged or persisted

---

## 🧱 Server vs Cloud Function

* **Server Mode**:

    * Uses MongoDB
    * Supports persistent queues
    * Archives events

* **Cloud Function Mode** *(not included in this package)*:

    * Stateless
    * Executes one event per function call

---

Let us know if you’d like to see additional examples or visual diagrams!
