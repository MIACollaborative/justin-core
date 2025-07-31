---
id: mongo
title: Setting up MongoDB
sidebar_position: 5
---

## Install MongoDB

JustIn requires a MongoDB server with replica sets in order to work. These instructions cover how to set up a local instance of MongoDB for testing and playing with the examples.

### Download MongoDB Community Edition

[Download MongoDB community edition](https://www.mongodb.com/docs/manual/administration/install-community/)

### Create folder for storing data

On Mac, create a `/data/mdata` directory in your home directory (`$ mkdir ~/data/mdata`).

On Windows, create a `\data\mdata` directory at the top level of your C: drive, or (`mkdir c:\data\mdata`).

## Run MongoDB

### Enable MongoDB ReplicaSets

JustIn utilizes MongoDB's capability to subscribe to changes in the database, which requires the use of ReplicaSet (https://www.mongodb.com/docs/manual/replication/). To enable this feature, you will need to 

1. run `mongod` with the `--replSet` option in one terminal

#### Mac OS
```bash
$ mongod --port 27017 --dbpath ~/data/mdata --replSet rs0 --bind_ip localhost
```
#### Windows
```bash
$ mongod --port 27017 --dbpath "c:\data\mdata" --replSet rs0 --bind_ip localhost
```
At this point you may see a bunch of errors complaining that replica sets are not initialized.

2. Use `mongosh` to enable Replica Sets

Leaving `mongod` running, open a separate terminal and do the following:
#### Both MacOS and Windows
```
$ mongosh
[mongosh prompt] > rs.initialize()
[mongosh prompt] > exit
```

### Run `mongod` whenever running JustIn apps
Everything should be ready to go now, and you should see the error messages in the `mongod` terminal stop. `mongod` will need to stay running while any JustIn apps are running. 

For information about other ways to install and run MongoDB, including running it as an always-available service, see the [MongoDB documentation](https://www.mongodb.com/docs/manual/installation/) for your OS. Note that however you configure and run MongoDB you will need to be sure to enable ReplicaSets as discussed above.

## Install MongoDB GUI (Optional)

If you want to see the data that JustIn creates and modifies in Mongo, you can use [MongoDB compass](https://www.mongodb.com/products/compass) for exploring the DB, or you can use [mongosh](https://www.mongodb.com/docs/mongodb-shell/) from the command line.