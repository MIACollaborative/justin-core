import { Readable } from 'stream';
import { ShadowsConfig } from './shadows/shadows-db.manager.type';

export type DataManagerOptions = {
  enableShadowsDB?: boolean;
  shadowsDBConfig?: ShadowsConfig;
}

export enum SortDirection {
  ASC = 1,
  DESC = -1,
}

export enum CollectionChangeType {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
}

export type CollectionChangeListener = {
  (document: { fullDocument: object; updateDescription?: object }): Promise<void>;
};

export type CollectionChangeNotifier = {
  stream: Readable;
  criteria: {
    collectionName: string;
    changeType: CollectionChangeType;
  };
  listenerList: CollectionChangeListener[];
};
