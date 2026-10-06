import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme';
import { Typography } from '../typography';

export interface EmptyStateProps extends ViewProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Composed in, not imported - keeps this component decoupled from the Button component's folder. */
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action, style, ...rest }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { padding: theme.spacing['3xl'], gap: theme.spacing.md }, style]} {...rest}>
      {icon}
      <Typography variant="title" style={styles.centerText}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body" color="textSecondary" style={styles.centerText}>
          {description}
        </Typography>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
});
