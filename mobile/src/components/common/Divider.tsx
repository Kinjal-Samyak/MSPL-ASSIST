import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme';

export interface DividerProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
  /** Space on either side of the line, along the cross axis - e.g. vertical margin for a horizontal divider. */
  inset?: number;
}

export function Divider({ orientation = 'horizontal', inset = 0, style, ...rest }: DividerProps) {
  const { theme } = useTheme();

  const dimensionStyle =
    orientation === 'horizontal'
      ? { height: 1, width: '100%' as const, marginVertical: inset }
      : { width: 1, height: '100%' as const, marginHorizontal: inset };

  return <View style={[dimensionStyle, { backgroundColor: theme.colors.border }, style]} {...rest} />;
}
