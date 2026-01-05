import DataManager from '../data-manager';
import { 
  DEFAULT_COLLECTIONS_TO_SHADOW, 
  DEFAULT_SHADOW_COLLECTION_SUFFIX ,
  type ShadowsConfig,
  type ShadowItem,
  ShadowOperation
} from './shadows-db.manager.type';

class ShadowsDBManager {
  private static instance: ShadowsDBManager | null = null;
  private isInitialized = false;
  private dm: DataManager | null = null;
  private config: ShadowsConfig | null = null;

  private constructor() {
    this.isInitialized = false;
  }

  public static getInstance(): ShadowsDBManager {
    if (!ShadowsDBManager.instance) {
      ShadowsDBManager.instance = new ShadowsDBManager();
    }
    return ShadowsDBManager.instance;
  }

  public static killInstance(): void {
    if (ShadowsDBManager.instance) {
      ShadowsDBManager.instance = null;
    }
  }
  
  private checkInitialization(): void {
    if (!this.isInitialized) {
      throw new Error('ShadowsDBManager has not been initialized');
    }
  }

  /**
   * Checks if ShadowsDBManager is initialized.
   * @returns {boolean} Initialization status.
   */
  public getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * Gets the configuration for ShadowsDBManager.
   * @returns {ShadowsConfig | null} Configuration.
   */
  public getConfig(): ShadowsConfig | null {
    return this.config;
  }

  /**
   * Initializes the ShadowsDBManager.
   * @param {ShadowsConfig} config - Configuration for ShadowsDBManager.
   * @returns {Promise<void>} Resolves when initialization is complete.
   */
  public async init(config?: ShadowsConfig): Promise<void> {
    if (this.isInitialized) return;
    this.dm = DataManager.getInstance();
    this.config = config || {
      collectionsToShadow: DEFAULT_COLLECTIONS_TO_SHADOW,
      shadowCollectionSuffix: DEFAULT_SHADOW_COLLECTION_SUFFIX,
    };
    for (const collection of this.config!.collectionsToShadow) {
      await this.dm!.ensureStore(`${collection}${this.config!.shadowCollectionSuffix}`);
      this.dm!.on('addItem', this.onAddItemToCollection);
      this.dm!.on('updateItem', this.onUpdateItemInCollection);
      this.dm!.on('deleteItem', this.onDeleteItemFromCollection);
    }
    this.isInitialized = true;
  }

  public async close(): Promise<void> {
    this.dm!.off('addItem', this.onAddItemToCollection);
    this.dm!.off('updateItem', this.onUpdateItemInCollection);
    this.dm!.off('deleteItem', this.onDeleteItemFromCollection);
    this.config = null;
    this.dm = null;
    this.isInitialized = false;
  }

  private onAddItemToCollection = async (collection: string, itemId: string): Promise<void> => {
    this.checkInitialization();
    
    if (!collection || !itemId) {
      throw new Error('Collection or itemId is not provided');
    }
    
    if (DEFAULT_COLLECTIONS_TO_SHADOW.includes(collection)) {
      const item = await this.dm!.findItemByIdInCollection(collection, itemId);
      if (!item) {
        throw new Error('Item not found');
      }
      const shadowItem = {
        snapshotAfterOperation: {...item},
        operation: ShadowOperation.ADD,
        timestamp: new Date(),
      };
      await this.dm!.addItemToCollection(
        `${collection}${this.config!.shadowCollectionSuffix}`, 
        shadowItem);
      return;
    }
  }  
    
  private async onUpdateItemInCollection(collection: string, itemId: string): Promise<void> {
    this.checkInitialization();
    const item = await this.dm!.findItemByIdInCollection(collection, itemId);
    if (!item) {
      return;
    }

    const shadowItem: ShadowItem = {
      snapshotAfterOperation: {...item},
      operation: ShadowOperation.UPDATE,
      timestamp: new Date(),
    };

    await this.dm!.addItemToCollection(
      `${collection}${this.config!.shadowCollectionSuffix}`, 
      shadowItem);
  }

  private async onDeleteItemFromCollection(collection: string, itemId: string): Promise<void> {
    this.checkInitialization();
    
    const shadowItem: ShadowItem  = {
      snapshotAfterOperation: {deletedId: itemId},
      operation: ShadowOperation.DELETE,
      timestamp: new Date(),
    };

    await this.dm!.addItemToCollection(
      `${collection}${this.config!.shadowCollectionSuffix}`, 
      shadowItem);
  }
}

export { ShadowsDBManager };