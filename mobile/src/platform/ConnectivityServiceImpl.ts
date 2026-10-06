import * as Network from 'expo-network';
import type { ConnectionType, ConnectivityState } from '@/models';
import type { ConnectivityService } from './ConnectivityService';

function toConnectionType(type: Network.NetworkStateType | undefined): ConnectionType {
  switch (type) {
    case Network.NetworkStateType.WIFI:
      return 'WIFI';
    case Network.NetworkStateType.CELLULAR:
      return 'CELLULAR';
    case Network.NetworkStateType.NONE:
      return 'NONE';
    default:
      return 'UNKNOWN';
  }
}

export class ConnectivityServiceImpl implements ConnectivityService {
  private lastConnectedAt: string | null = null;

  async getState(): Promise<ConnectivityState> {
    const state = await Network.getNetworkStateAsync();
    const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    if (isOnline) {
      this.lastConnectedAt = new Date().toISOString();
    }
    return {
      isOnline,
      lastConnectedAt: this.lastConnectedAt,
      connectionType: toConnectionType(state.type),
    };
  }

  subscribe(listener: (state: ConnectivityState) => void): () => void {
    const subscription = Network.addNetworkStateListener((event) => {
      const isOnline = Boolean(event.isConnected && event.isInternetReachable !== false);
      if (isOnline) {
        this.lastConnectedAt = new Date().toISOString();
      }
      listener({
        isOnline,
        lastConnectedAt: this.lastConnectedAt,
        connectionType: toConnectionType(event.type),
      });
    });
    return () => subscription.remove();
  }
}
