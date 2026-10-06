import { Text, type TextProps } from 'react-native';
import { useTheme, type ThemeTokens, type TypographyVariantKey } from '@/theme';

export interface TypographyProps extends TextProps {
  variant?: TypographyVariantKey;
  /** A key from the theme's colour tokens (e.g. "text", "danger") - falls back to "text". Pass a raw colour via `style` if a token doesn't fit. */
  color?: keyof ThemeTokens;
}

export function Typography({ variant = 'body', color = 'text', style, children, ...rest }: TypographyProps) {
  const { theme } = useTheme();
  const variantStyle = theme.typography[variant];

  return (
    <Text
      style={[
        {
          fontFamily: variantStyle.fontFamily,
          fontSize: variantStyle.fontSize,
          lineHeight: variantStyle.lineHeight,
          fontWeight: variantStyle.fontWeight,
          letterSpacing: variantStyle.letterSpacing,
          color: theme.colors[color],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
