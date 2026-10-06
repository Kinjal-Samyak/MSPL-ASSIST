import { View } from 'react-native';
import { Avatar, Button, Card, ErrorState, Loader, Screen, Typography } from '@/components';
import { useProfile, useTheme } from '@/hooks';

/** Read-only (Part 5) - no edit functionality anywhere on this screen. */
export function ProfileScreen() {
  const { theme } = useTheme();
  const { user, profile, isLoading, error, refresh } = useProfile();

  return (
    <Screen scrollable>
      {isLoading ? (
        <Loader fullscreen label="Loading profile..." />
      ) : error || !user || !profile ? (
        <ErrorState
          title="Unable to load profile"
          description={error ?? 'Something went wrong. Please try again.'}
          action={<Button label="Retry" variant="outline" onPress={() => void refresh()} accessibilityLabel="Retry loading profile" />}
        />
      ) : (
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
            <Avatar name={user.name} imageUri={profile.profilePhotoUrl ?? undefined} size={72} />
            <Typography variant="h2">{user.name}</Typography>
            <Typography variant="subtitle" color="textSecondary">
              {profile.designation}
            </Typography>
          </View>

          <Card>
            <ProfileRow label="Employee ID" value={profile.employeeId} />
            <ProfileRow label="Assigned Hub" value={profile.assignedHub} />
            <ProfileRow label="Designation" value={profile.designation} />
            <ProfileRow label="Mobile Number" value={profile.mobileNumber} />
            <ProfileRow label="Email" value={user.email} last />
          </Card>
        </View>
      )}
    </Screen>
  );
}

function ProfileRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.borderMuted,
      }}
    >
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="body">{value}</Typography>
    </View>
  );
}
