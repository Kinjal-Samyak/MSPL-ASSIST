import { BackgroundSyncManagerImpl } from './BackgroundSyncManagerImpl';
import type { BackgroundSyncManager } from './BackgroundSyncManager';

export type { BackgroundSyncManager, SyncScheduler, RetryScheduler } from './BackgroundSyncManager';

export const backgroundSyncManager: BackgroundSyncManager = new BackgroundSyncManagerImpl();
