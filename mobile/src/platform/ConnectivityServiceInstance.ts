import { ConnectivityServiceImpl } from './ConnectivityServiceImpl';
import type { ConnectivityService } from './ConnectivityService';

export type { ConnectivityService } from './ConnectivityService';

/** Single shared instance - a narrow file (rather than the `platform/index.ts` barrel) so other
 * platform services can depend on just this singleton without a circular import through the barrel. */
export const connectivityService: ConnectivityService = new ConnectivityServiceImpl();
