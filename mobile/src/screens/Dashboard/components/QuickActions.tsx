import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Briefcase, Settings as SettingsIcon, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Typography } from '@/components';
import { useTheme } from '@/hooks';
import type { MainStackParamList } from '@/navigation';
import type { QuickAction, QuickActionRoute } from '@/models';
import type { StatCardIconProps } from '@/components';

const ICON_BY_ROUTE: Record<QuickActionRoute, ComponentType<StatCardIconProps>> = {
  MyJobs: Briefcase,
  Profile: User,
  Settings: SettingsIcon,
};

export interface QuickActionsProps {
  actions: QuickAction[];
}

/** Navigates using the existing native-stack navigator - no new navigation surface, no business actions. */
export function QuickActions({ actions }: QuickActionsProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <View style={[styles.row, { gap: theme.spacing.md }]}>
      {actions.map((action) => {
        const Icon = ICON_BY_ROUTE[action.route];
        return (
          <Pressable
            key={action.id}
            onPress={() => navigation.navigate(action.route as 'MyJobs' | 'Profile' | 'Settings')}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => [
              styles.cell,
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderMuted,
                borderRadius: theme.radius.xl,
                padding: theme.spacing.lg,
                opacity: pressed ? theme.opacity.pressed : theme.opacity.opaque,
              },
            ]}
          >
            <View
              style={[
                styles.iconChip,
                { backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radius.md },
              ]}
            >
              <Icon size={18} color={theme.colors.primary} />
            </View>
            <Typography variant="label" style={styles.label}>
              {action.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    flexBasis: '30%',
    flexGrow: 1,
  },
  card: {
    borderWidth: 1,
    alignItems: 'center',
  },
  iconChip: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 8,
    textAlign: 'center',
  },
});
