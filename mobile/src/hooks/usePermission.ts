import { useCallback } from 'react';
import { Linking } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export type PermissionKind = 'camera' | 'mediaLibrary';
export type PermissionState = 'granted' | 'undetermined' | 'denied' | 'permanently-denied';

interface UsePermissionResult {
  state: PermissionState;
  request: () => Promise<PermissionState>;
  openSettings: () => Promise<void>;
}

/** The common shape both `expo-camera`'s `PermissionResponse` and `expo-image-picker`'s
 * `MediaLibraryPermissionResponse` share - typed loosely on purpose so this hook doesn't need to
 * pick one package's exact type over the other's. */
interface MinimalPermissionResponse {
  granted: boolean;
  status: string;
  canAskAgain: boolean;
}

function toState(response: MinimalPermissionResponse | null): PermissionState {
  if (!response) return 'undetermined';
  if (response.granted) return 'granted';
  if (response.status === 'undetermined') return 'undetermined';
  return response.canAskAgain ? 'denied' : 'permanently-denied';
}

/** Normalizes `expo-camera`'s and `expo-image-picker`'s separate permission APIs into one shape,
 * distinguishing "denied, can ask again" from "permanently denied, must use Settings" - the two
 * states the UI needs to treat differently (Part 9). */
export function usePermission(kind: PermissionKind): UsePermissionResult {
  const [cameraResponse, requestCamera] = useCameraPermissions();
  const [mediaResponse, requestMedia] = ImagePicker.useMediaLibraryPermissions();

  const response = kind === 'camera' ? cameraResponse : mediaResponse;

  const request = useCallback(async (): Promise<PermissionState> => {
    const result = kind === 'camera' ? await requestCamera() : await requestMedia();
    return toState(result);
  }, [kind, requestCamera, requestMedia]);

  const openSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  return {
    state: toState(response),
    request,
    openSettings,
  };
}
