import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Typography } from '../typography';

export interface AvatarProps {
  name: string;
  imageUri?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({ name, imageUri, size = 40, style }: AvatarProps) {
  const { theme } = useTheme();
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={[dimension, style as StyleProp<ImageStyle>]} accessibilityLabel={name} />;
  }

  return (
    // Matches the web app's Avatar fallback exactly (solid primary bg, white initials) - see
    // frontend/src/components/ui/Avatar.tsx.
    <View style={[styles.fallback, dimension, { backgroundColor: theme.colors.primary }, style]} accessibilityLabel={name}>
      <Typography variant="label" color="onPrimary" style={{ fontSize: size * 0.4 }}>
        {getInitials(name)}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
