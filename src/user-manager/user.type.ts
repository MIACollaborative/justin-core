export type JUser = {
  id: string;
  uniqueIdentifier: string;
  attributes: Record<string, any>;
};

export type NewUserRecord = {
  uniqueIdentifier: string;
  initialAttributes: Record<string, any>;
};
