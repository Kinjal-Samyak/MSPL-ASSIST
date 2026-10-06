import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ConnectivityState } from '@/models';

const mockGetConnectivityState = jest.fn();
const mockSubscribeToConnectivity = jest.fn();

jest.mock('@/facades/platform', () => ({
  platformFacade: {
    getConnectivityState: (...args: unknown[]) => mockGetConnectivityState(...args),
    subscribeToConnectivity: (...args: unknown[]) => mockSubscribeToConnectivity(...args),
  },
}));

// Imported after the mock so the hook picks up the mocked facade module.
import { useConnectivity } from '../useConnectivity';

describe('useConnectivity', () => {
  beforeEach(() => {
    mockGetConnectivityState.mockReset();
    mockSubscribeToConnectivity.mockReset();
  });

  it('adopts the facade snapshot once getConnectivityState resolves', async () => {
    const resolved: ConnectivityState = { isOnline: false, lastConnectedAt: '2026-07-01T00:00:00Z', connectionType: 'WIFI' };
    mockGetConnectivityState.mockResolvedValue(resolved);
    mockSubscribeToConnectivity.mockReturnValue(() => {});

    const { result } = await renderHook(() => useConnectivity());

    await waitFor(() => expect(result.current).toEqual(resolved));
  });

  it('applies live updates pushed through the subscription and unsubscribes on unmount', async () => {
    mockGetConnectivityState.mockResolvedValue({ isOnline: true, lastConnectedAt: null, connectionType: 'UNKNOWN' });
    let pushUpdate: ((state: ConnectivityState) => void) | undefined;
    const unsubscribe = jest.fn();
    mockSubscribeToConnectivity.mockImplementation((listener: (state: ConnectivityState) => void) => {
      pushUpdate = listener;
      return unsubscribe;
    });

    const { result, unmount } = await renderHook(() => useConnectivity());
    await waitFor(() => expect(mockSubscribeToConnectivity).toHaveBeenCalled());

    await act(() => {
      pushUpdate?.({ isOnline: false, lastConnectedAt: '2026-07-01T00:00:00Z', connectionType: 'CELLULAR' });
    });
    expect(result.current.isOnline).toBe(false);

    await unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
