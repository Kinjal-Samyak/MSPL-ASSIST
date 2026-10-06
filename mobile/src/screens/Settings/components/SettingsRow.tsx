import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Typography } from '@/components';
import { useTheme } from '@/hooks';

export interface SettingsRowProps {
  label: string;
  value?: string;
  icon?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  rightElement?: ReactNode;
  accessibilityHint?: string;
}

export function SettingsRow({ label, value, icon, onPress, disabled, rightElement, accessibilityHint }: SettingsRowProps) {
  const { theme } = useTheme();
  const interactive = Boolean(onPress) && !disabled;

  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        minHeight: 44,
        opacity: disabled ? theme.opacity.disabled : pressed && interactive ? theme.opacity.pressed : theme.opacity.opaque,
      })}
    >
      {icon ? <View style={{ marginRight: theme.spacing.md }}>{icon}</View> : null}
      <Typography variant="body" style={{ flex: 1 }}>
        {label}
      </Typography>
      {value ? (
        <Typography variant="caption" color="textSecondary" style={{ marginRight: theme.spacing.xs }}>
          {value}
        </Typography>
      ) : null}
      {rightElement}
      {interactive && !rightElement ? <ChevronRight size={16} color={theme.colors.textSecondary} /> : null}
    </Pressable>
  );
}
