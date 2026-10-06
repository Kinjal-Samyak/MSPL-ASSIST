import { AlertCircle } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Typography } from '@/components';
import { useTheme } from '@/hooks';
import type { PermissionState } from '@/hooks';

export interface PermissionDeniedNoticeProps {
  state: Extract<PermissionState, 'denied' | 'permanently-denied'>;
  label: string;
  onRequest: () => void;
  onOpenSettings: () => void;
}

/** Friendly permission-denied messaging, distinguishing "you can ask again" from "you must go to
 * Settings" - the system won't show its own prompt again once permanently denied. */
export function PermissionDeniedNotice({ state, label, onRequest, onOpenSettings }: PermissionDeniedNoticeProps) {
  const { theme } = useTheme();

  return (
    <View style={{ alignItems: 'center', padding: theme.spacing.lg, gap: theme.spacing.sm }}>
      <AlertCircle size={24} color={theme.colors.warning} />
      <Typography variant="body" style={{ textAlign: 'center' }}>
        {label} access is required to add evidence photos.
      </Typography>
      {state === 'permanently-denied' ? (
        <>
          <Typography variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
            Enable it from your device Settings to continue.
          </Typography>
          <Button label="Open Settings" variant="outline" onPress={onOpenSettings} accessibilityLabel="Open device settings" />
        </>
      ) : (
        <Button label="Allow Access" variant="outline" onPress={onRequest} accessibilityLabel={`Allow ${label.toLowerCase()} access`} />
      )}
    </View>
  );
}
