import { OfflineManagerImpl } from './OfflineManagerImpl';
import type { OfflineManager } from './OfflineManager';

export type { OfflineManager } from './OfflineManager';

/** Single shared instance - see `ConnectivityServiceInstance.ts` for why this is its own file. */
export const offlineManager: OfflineManager = new OfflineManagerImpl();
