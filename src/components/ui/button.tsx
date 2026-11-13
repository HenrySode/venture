import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space, touch } from '@/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  /** Label shown while loading, e.g. "Signing in…". */
  loadingLabel?: string;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
};

const palette: Record<Variant, { bg: string; bgPressed: string; fg: string; border: string }> = {
  primary: { bg: colors.brand, bgPressed: colors.brandStrong, fg: colors.ink, border: colors.brand },
  secondary: { bg: colors.surface, bgPressed: colors.surfaceMuted, fg: colors.ink, border: colors.borderStrong },
  ghost: { bg: 'transparent', bgPressed: colors.brandTint, fg: colors.link, border: 'transparent' },
  danger: { bg: colors.danger, bgPressed: '#991B1B', fg: colors.inkInverse, border: colors.danger },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'start',
  loading = false,
  loadingLabel,
  block = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const p = palette[variant];
  const isDisabled = disabled || loading;
  const iconEl = icon && !loading ? <Icon name={icon} size={20} color={p.fg} /> : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: size === 'lg' ? touch.large : touch.min,
          backgroundColor: pressed ? p.bgPressed : p.bg,
          borderColor: p.border,
          opacity: isDisabled && !loading ? 0.5 : 1,
        },
        block && styles.block,
        style,
      ]}
      {...rest}>
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={p.fg} size="small" /> : null}
        {iconPosition === 'start' ? iconEl : null}
        <Text variant={size === 'lg' ? 'bodyStrong' : 'label'} color={p.fg} numberOfLines={1}>
          {loading && loadingLabel ? loadingLabel : label}
        </Text>
        {iconPosition === 'end' ? iconEl : null}
      </View>
    </Pressable>
  );
}

/** Inline text link with a comfortable touch target. */
export function TextLink({ label, onPress, color = colors.link }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Text variant="label" color={color} style={styles.link}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
  },
  block: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
