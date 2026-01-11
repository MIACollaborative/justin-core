export type ProtectedAttributes = {
  id: string;
  uniqueIdentifier: string;
  namespace: string;
  attributes: Record<string, unknown>;
};

export type ProtectedAttributesDb = Omit<ProtectedAttributes, 'id'> & { readonly _id: string };
