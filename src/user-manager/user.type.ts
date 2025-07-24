export type JUser = {
  id: string;
  uniqueIdentifier: string;
  [key: string]: any;
};

export type NewUserRecord = {
  uniqueIdentifier: string,
  initialAttributes: Record<string, any>
}