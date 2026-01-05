import { USERS } from "../data-manager.constants";

type ShadowsConfig = {
  collectionsToShadow: string[];
  shadowCollectionSuffix: string;
}

type ShadowItem = {
  snapshotAfterOperation: object;
  operation: ShadowOperation;
  timestamp: Date;
}

enum ShadowOperation {
  ADD = 'add',
  UPDATE = 'update',
  DELETE = 'delete',
}

const DEFAULT_SHADOW_COLLECTION_SUFFIX = '_shadow';
const DEFAULT_COLLECTIONS_TO_SHADOW: string[] = [USERS];

export { DEFAULT_SHADOW_COLLECTION_SUFFIX, DEFAULT_COLLECTIONS_TO_SHADOW, ShadowOperation };
export type { ShadowsConfig, ShadowItem };