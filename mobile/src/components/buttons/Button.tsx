import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { useTheme } from '@/theme';
import { Typography } from '../typography';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const SIZE_PADDING: Record<ButtonSize, { vertical: number; horizontal: number }> = {
  sm: { vertical: 8, horizontal: 12 },
  md: { vertical: 12, horizontal: 16 },
  lg: { vertical: 16, horizontal: 20 },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyle: Record<ButtonVariant, { background: string; text: string; border?: string }> = {
    primary: { background: theme.colors.primary, text: theme.colors.onPrimary },
    secondary: { background: theme.colors.secondary, text: theme.colors.onSecondary },
    outline: { background: 'transparent', text: theme.colors.primary, border: theme.colors.border },
    ghost: { background: 'transparent', text: theme.colors.primary },
    danger: { background: theme.colors.danger, text: theme.colors.onPrimary },
  };
  const colors = variantStyle[variant];
  const padding = SIZE_PADDING[size];
  /** Only solid-fill variants swap to the flat "disabled" colour; outline/ghost stay transparent and just dim their text/border, or a disabled Forgot-Password-style link would wrongly render as a grey block. */
  const hasSolidBackground = colors.background !== 'transparent';

  return (
    <Pressable
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isDisabled && hasSolidBackground ? theme.colors.disabled : colors.background,
          borderRadius: theme.radius.md,
          borderWidth: colors.border ? 1 : 0,
          borderColor: isDisabled ? theme.colors.disabled : colors.border,
          paddingVertical: padding.vertical,
          paddingHorizontal: padding.horizontal,
          opacity: pressed && !isDisabled ? theme.opacity.pressed : theme.opacity.opaque,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isDisabled ? theme.colors.disabledText : colors.text} />
      ) : (
        <>
          {leftIcon}
          <Typography variant="button" style={{ color: isDisabled ? theme.colors.disabledText : colors.text }}>
            {label}
          </Typography>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
