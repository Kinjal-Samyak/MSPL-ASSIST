import { useEffect, useRef } from 'react';
import { Animated, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export interface SkeletonBoxProps {
  style: ViewStyle;
}

/** A single pulsing placeholder block - the building block every screen's loading skeleton composes. */
export function SkeletonBox({ style }: SkeletonBoxProps) {
  const { theme } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[{ backgroundColor: theme.colors.borderMuted, borderRadius: theme.radius.md, opacity: pulse }, style]}
    />
  );
}
