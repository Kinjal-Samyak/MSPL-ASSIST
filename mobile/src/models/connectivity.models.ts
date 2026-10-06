export type ConnectionType = 'WIFI' | 'CELLULAR' | 'NONE' | 'UNKNOWN';

export interface ConnectivityState {
  isOnline: boolean;
  lastConnectedAt: string | null;
  connectionType: ConnectionType;
}
