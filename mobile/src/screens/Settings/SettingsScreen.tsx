import { useState } from 'react';
import { Bell, FileText, Info, LogOut, Shield } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Card, LastSyncCard, NotificationBadge, Screen, Typography } from '@/components';
import { useAuth, useTheme } from '@/hooks';
import { getAppVersion, getBuildNumber } from '@/utils';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { SettingsRow } from './components/SettingsRow';

export function SettingsScreen() {
  const { theme } = useTheme();
  const { signOut } = useAuth();
  const [isNotificationCenterOpen, setNotificationCenterOpen] = useState(false);

  return (
    <Screen scrollable>
      <Typography variant="h2" style={{ marginBottom: theme.spacing.lg }}>
        Settings
      </Typography>

      <View style={{ gap: theme.spacing.lg }}>
        <Card>
          <SettingsRow
            label="Notifications"
            icon={<Bell size={18} color={theme.colors.textSecondary} />}
            rightElement={<NotificationBadge />}
            onPress={() => setNotificationCenterOpen(true)}
            accessibilityHint="Opens the notification center"
          />
        </Card>

        <View>
          <Typography variant="label" color="textSecondary" style={{ marginBottom: theme.spacing.sm }}>
            OFFLINE SYNC
          </Typography>
          <LastSyncCard />
        </View>

        <View>
          <Typography variant="label" color="textSecondary" style={{ marginBottom: theme.spacing.sm }}>
            ABOUT
          </Typography>
          <Card>
            <SettingsRow label="App Version" value={getAppVersion()} icon={<Info size={18} color={theme.colors.textSecondary} />} />
            <SettingsRow label="Build Number" value={getBuildNumber()} />
            <SettingsRow
              label="Privacy Policy"
              disabled
              icon={<Shield size={18} color={theme.colors.textSecondary} />}
              accessibilityHint="Not available yet"
            />
            <SettingsRow
              label="Terms of Service"
              disabled
              icon={<FileText size={18} color={theme.colors.textSecondary} />}
              accessibilityHint="Not available yet"
            />
          </Card>
        </View>

        <View style={{ alignItems: 'center', marginTop: theme.spacing.md }}>
          <Button
            label="Log Out"
            variant="outline"
            leftIcon={<LogOut size={16} color={theme.colors.primary} />}
            onPress={() => void signOut()}
            accessibilityLabel="Log out"
          />
        </View>
      </View>

      <NotificationCenterModal isOpen={isNotificationCenterOpen} onClose={() => setNotificationCenterOpen(false)} />
    </Screen>
  );
}
