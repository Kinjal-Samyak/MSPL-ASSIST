import { StyleSheet, View } from 'react-native';
import { Button, Typography } from '@/components';
import { useTheme } from '@/hooks';

export type PreviewOverride = 'loading' | 'error' | null;

export interface DevPreviewMenuProps {
  value: PreviewOverride;
  onChange: (value: PreviewOverride) => void;
}

/**
 * Development-only QA tool for forcing the Dashboard's loading/error states without touching the
 * mock repository or a debugger. Gated on `__DEV__`, which is stripped out of release JS bundles
 * entirely - this can never render in a production build. Not a Dashboard feature.
 */
export function DevPreviewMenu({ value, onChange }: DevPreviewMenuProps) {
  const { theme } = useTheme();

  if (!__DEV__) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: theme.spacing.sm, gap: theme.spacing.sm },
      ]}
    >
      <Typography variant="caption" color="textSecondary">
        DEV PREVIEW
      </Typography>
      <View style={[styles.row, { gap: theme.spacing.sm }]}>
        <Button label="Loading" size="sm" variant={value === 'loading' ? 'primary' : 'outline'} onPress={() => onChange('loading')} />
        <Button label="Error" size="sm" variant={value === 'error' ? 'primary' : 'outline'} onPress={() => onChange('error')} />
        <Button label="Reset" size="sm" variant={value === null ? 'primary' : 'outline'} onPress={() => onChange(null)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
