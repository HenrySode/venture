import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, type as typeScale } from '@/theme';

export type TextVariant = keyof typeof typeScale;

type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', color = colors.ink, align, style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={[typeScale[variant], { color }, align ? { textAlign: align } : null, style]}
    />
  );
}
