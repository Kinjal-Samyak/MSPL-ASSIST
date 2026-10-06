import { ActivityIndicator, View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme';
import { Typography } from '../typography';

export interface LoaderProps extends ViewProps {
  size?: 'small' | 'large';
  label?: string;
  /** Fills the parent and centers - the common "whole screen is loading" case. */
  fullscreen?: boolean;
}

export function Loader({ size = 'large', label, fullscreen = false, style, ...rest }: LoaderProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
        fullscreen && { flex: 1 },
        style,
      ]}
      {...rest}
    >
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {label ? (
        <Typography variant="caption" color="textSecondary">
          {label}
        </Typography>
      ) : null}
    </View>
  );
}
