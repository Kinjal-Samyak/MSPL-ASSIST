import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme';
import { Typography } from '../typography';

export interface ErrorStateProps extends ViewProps {
  title?: string;
  description?: string;
  /** Composed in, not imported - typically a retry Button from the `buttons` component group. */
  action?: ReactNode;
}

export function ErrorState({ title = 'Something went wrong', description, action, style, ...rest }: ErrorStateProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { padding: theme.spacing['3xl'], gap: theme.spacing.md }, style]} {...rest}>
      <Typography variant="title" color="danger" style={styles.centerText}>
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
