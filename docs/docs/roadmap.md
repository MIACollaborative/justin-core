---
id: roadmap
title: JustIn Roadmap
sidebar_position: 3
---

# JustIn Roadmap

## JustIn 0.1

The initial (and current) release is JustIn 0.1. It contains only `justin-core`, which provides the foundation for the JustIn Framework. `justin-core` can be used right away for building the backend logic for adaptive interventions, but lacks several features required for supporting a complete mHealth application. We plan to add additional features in future releases. In this RoadMap, we first describe the high level components we plan to add and then provide a rough timeline for the rollout of those components as well as enhancements to existing components.

## The JustIn App Server

The next step after `justin-core` will be to provide a basic web application server that allows mobile and/or web clients to read and write JustIn data securely. This will be the first step in allowing the building of JustIn client applications. The JustIn App Server will use the same data abstractions as `justin-core` (e.g., `JUser`s, `JEvent`s) and provide a standards-compliant, secure RESTful API for reading and writing study data. 

## The JustIn Dashboard

The introduction of the JustIn App Server, in addition to supporting client development, will also enable the creation of the JustIn Dashboard for data monitoring and study administration tasks (e.g., participant registration and management).

## The JustIn Client Library

While developers can use any client platform that can interact with a RESTful API for creating apps, we plan to provide basic app components and starter code for developing cross-platform apps in ReactNative.

## JustIn Extensions

A key aspect of the JustIn vision is to enable the growth of JustIn functionality through the ongoing work of the core team as well as community contributions. To facilitate this, we will introduce well-defined patterns for extending JustIn with more specialized functionality. We anticipate that most, if not all, integrations of JustIn with 3rd party technologies such as FitBit, mobile push notifications, SMS services, etc. will be implemented as extensions. The core JustIn project will maintain a directory of extensions that can be used for particular JustIn use cases.

## Upcoming Releases

Here is a snapshot of our anticipated release planning as of the release of JustIn 0.1 in Summer 2025. Please note that the release contents and dates might change significantly, and we welcome input on these plans and priorities. If you have ideas, needs, or a desire to contribute please get in touch!

### Justin 0.2 (late 2025)
- JustIn App Server (initial release)
- JustIn Dashboard (initial release)
- JustIn Core additions
  - Streams (time-series data streams associated with a `JUser`, e.g., Fitbit data, EMA reports)
  - Content Library (repositories for intervention content with structured metadata for attribute-based selection)
- Extension support
- Extensions:
  - Fitbit
  - send SMS via Twillio
  - send Email via SendGrid

### Justin 0.3 (early 2026)
- Client Library
  - User login/study enrollment
  - Usage analytics collection
  - Push notifications
  - Questionnaire display
  - Basic data charts
  - ...
- App Server
  - Survey design and management
- Extensions
  - Push notifications in ReactNative

... and that's as far as the RoadMap goes at the moment. With the 0.3 release JustIn will be "complete" in the sense that it provides at least some support for all aspects of building, deploying, and managing an app-based mHealth research study. We expect to find many challenges and opportunities along the way (with help from you) that will shape the future of JustIn beyond these initial steps, and we will update the RoadMap with each future release.