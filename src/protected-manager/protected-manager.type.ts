export type ProtectedAttributes = {
  id: string;
  uniqueIdentifier: string;
  namespace: string;
  attributes: Record<string, unknown>;
};