import type { ConnectivityState } from '@/models';

/**
 * Wraps `expo-network` (the device's real connectivity signal, not a repository - there is no
 * backend involved). No business rules: it only reports what the OS reports.
 */
export interface ConnectivityService {
  getState(): Promise<ConnectivityState>;
  /** Returns an unsubscribe function. */
  subscribe(listener: (state: ConnectivityState) => void): () => void;
}
