import { useEffect, useState } from 'react';
import { platformFacade } from '@/facades/platform';
import type { ConnectivityState } from '@/models';

const DEFAULT_STATE: ConnectivityState = { isOnline: true, lastConnectedAt: null, connectionType: 'UNKNOWN' };

/** Depends only on `platformFacade`. Subscribes for live updates on mount, unsubscribes on unmount. */
export function useConnectivity(): ConnectivityState {
  const [state, setState] = useState<ConnectivityState>(DEFAULT_STATE);

  useEffect(() => {
    let isMounted = true;
    platformFacade.getConnectivityState().then((initial) => {
      if (isMounted) setState(initial);
    });
    const unsubscribe = platformFacade.subscribeToConnectivity((next) => {
      if (isMounted) setState(next);
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return state;
}
