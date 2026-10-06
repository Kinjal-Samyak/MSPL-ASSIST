import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme';
import { Typography } from '../typography';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends ViewProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'neutral', style, ...rest }: BadgeProps) {
  const { theme } = useTheme();

  const variantColors: Record<BadgeVariant, { background: string; text: string }> = {
    neutral: { background: theme.colors.secondaryMuted, text: theme.colors.textSecondary },
    primary: { background: theme.colors.primaryMuted, text: theme.colors.primary },
    success: { background: theme.colors.successMuted, text: theme.colors.success },
    warning: { background: theme.colors.warningMuted, text: theme.colors.warning },
    danger: { background: theme.colors.dangerMuted, text: theme.colors.danger },
    info: { background: theme.colors.infoMuted, text: theme.colors.info },
  };
  const colors = variantColors[variant];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
        style,
      ]}
      {...rest}
    >
      <Typography variant="label" style={{ color: colors.text }}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
});
