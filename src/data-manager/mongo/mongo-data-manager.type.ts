export type WithId = {
  id?: string;
  _id?: string;
};

export type DeletedDocRecord = {
  documentKey: WithId;
};

export type InsertedOrUpatedDocRecord = {
  fullDocument: WithId;
  updateDescription?: object;
};
