import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import type { ViewProps } from 'react-native';
import { useTheme } from '@/theme';

export interface SafeAreaProps extends ViewProps {
  edges?: Edge[];
  /** Fills with the theme background colour by default so there's no white/black flash outside the safe area on notch devices. */
  backgroundColor?: string;
}

export function SafeArea({ edges = ['top', 'bottom', 'left', 'right'], backgroundColor, style, children, ...rest }: SafeAreaProps) {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[{ flex: 1, backgroundColor: backgroundColor ?? theme.colors.background }, style]}
      {...rest}
    >
      {children}
    </SafeAreaView>
  );
}
