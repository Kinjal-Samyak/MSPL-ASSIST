import { View, type ViewProps } from 'react-native';
import { getElevationStyle, useTheme, type ElevationKey } from '@/theme';

export interface CardProps extends ViewProps {
  padded?: boolean;
  elevation?: ElevationKey;
}

export function Card({ padded = true, elevation = 'sm', style, children, ...rest }: CardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          // Matches the web app's Card (`rounded-2xl` / `p-6`) - see frontend/src/components/ui/Card.tsx.
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.borderMuted,
          padding: padded ? theme.spacing['2xl'] : 0,
        },
        getElevationStyle(elevation),
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
