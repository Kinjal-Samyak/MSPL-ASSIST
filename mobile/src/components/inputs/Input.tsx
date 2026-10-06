import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme';
import { Typography } from '../typography';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  /** Matches the web Input's `leftElement`/`rightElement` API (frontend/src/components/ui/Input.tsx) - typically a lucide-react-native icon. */
  leftElement?: ReactNode;
  rightElement?: ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, leftElement, rightElement, style, ...rest },
  ref
) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {label ? (
        <Typography variant="label" color="textSecondary">
          {label}
        </Typography>
      ) : null}
      <View style={styles.fieldWrapper}>
        {leftElement ? (
          <View style={[styles.sideElement, styles.leftElement]} pointerEvents="none">
            {leftElement}
          </View>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.textSecondary}
          style={[
            styles.base,
            {
              borderColor: error ? theme.colors.danger : theme.colors.border,
              // Matches the web app's Input (`rounded-xl`) - see frontend/src/components/ui/Input.tsx.
              borderRadius: theme.radius.lg,
              paddingHorizontal: theme.spacing.md,
              paddingLeft: leftElement ? theme.spacing['3xl'] : theme.spacing.md,
              paddingRight: rightElement ? theme.spacing['3xl'] : theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
              fontSize: theme.typography.body.fontSize,
              fontFamily: theme.typography.body.fontFamily,
            },
            style,
          ]}
          {...rest}
        />
        {rightElement ? <View style={[styles.sideElement, styles.rightElement]}>{rightElement}</View> : null}
      </View>
      {error ? (
        <Typography variant="caption" color="danger">
          {error}
        </Typography>
      ) : hint ? (
        <Typography variant="caption" color="textSecondary">
          {hint}
        </Typography>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
  fieldWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  sideElement: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  leftElement: {
    left: 12,
  },
  rightElement: {
    right: 12,
  },
});
