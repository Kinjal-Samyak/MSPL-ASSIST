import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { palette, useTheme } from '@/theme';
import { Typography } from '../typography';

/**
 * Matches the web app's StatCard exactly (frontend/src/components/ui/StatCard.tsx): a fixed-dark
 * tile regardless of the active theme mode. That's a deliberate accent treatment used web-wide
 * for headline metrics (Stripe/Linear-style), not a mobile-only invention.
 */
export type StatCardTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate' | 'cyan' | 'indigo';

const TONE_HEX: Record<StatCardTone, string> = {
  blue: palette.blue500,
  emerald: palette.green500,
  amber: palette.amber500,
  rose: palette.red500,
  violet: palette.violet500,
  slate: palette.slate500,
  cyan: palette.cyan500,
  indigo: palette.indigo500,
};

/** Deliberately loose (optional props) rather than importing lucide's own type, since
 * lucide-react-native doesn't publicly export a single named icon-component type - any component
 * accepting at least an optional `size`/`color`, e.g. a lucide-react-native icon, satisfies this. */
export interface StatCardIconProps {
  size?: number;
  color?: string;
}

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: ComponentType<StatCardIconProps>;
  tone?: StatCardTone;
  sublabel?: string;
  onPress?: () => void;
}

export function StatCard({ label, value, icon: Icon, tone = 'blue', sublabel, onPress }: StatCardProps) {
  const { theme } = useTheme();
  const accentColor = TONE_HEX[tone];

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.slate900,
          borderColor: palette.slate800,
          borderRadius: theme.radius.xl,
          padding: theme.spacing.lg,
        },
      ]}
    >
      <View style={[styles.iconRow, { gap: theme.spacing.sm }]}>
        <View style={[styles.iconChip, { backgroundColor: `${accentColor}26`, borderRadius: theme.radius.md }]}>
          <Icon size={16} color={accentColor} />
        </View>
        <Typography variant="body" style={[styles.label, { color: palette.slate300 }]}>
          {label}
        </Typography>
      </View>
      <Typography variant="display" style={[styles.value, { color: palette.white, marginTop: theme.spacing.md }]}>
        {value}
      </Typography>
      {sublabel ? (
        <Typography variant="caption" style={[styles.sublabel, { color: palette.slate400, marginTop: theme.spacing.xs }]}>
          {sublabel}
        </Typography>
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => ({ opacity: pressed ? theme.opacity.pressed : theme.opacity.opaque })}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconChip: {
    padding: 8,
  },
  label: {
    fontWeight: '500',
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
  sublabel: {
    fontWeight: '500',
  },
});
