import { SyncManagerImpl } from './SyncManagerImpl';
import type { SyncManager } from './SyncManager';

export type { SyncManager } from './SyncManager';

/** Single shared instance - see `ConnectivityServiceInstance.ts` for why this is its own file. */
export const syncManager: SyncManager = new SyncManagerImpl();
