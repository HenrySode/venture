import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { useT } from '@/i18n';
import { colors, radius, space, touch, type as typeScale } from '@/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  hint?: string | null;
  icon?: IconName;
  /** Renders a show/hide toggle and masks the value. */
  password?: boolean;
  ref?: Ref<TextInputInstance>;
};

export function TextField({ label, error, hint, icon, password = false, ref, onFocus, onBlur, ...input }: TextFieldProps) {
  const t = useT();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.brandStrong : colors.borderStrong;

  return (
    <View style={styles.wrapper}>
      <Text variant="label" color={colors.ink}>
        {label}
      </Text>
      <View style={[styles.field, { borderColor, borderWidth: focused || error ? 2 : 1 }]}>
        {icon ? <Icon name={icon} size={20} color={colors.inkSubtle} /> : null}
        <TextInput
          ref={ref}
          {...input}
          accessibilityLabel={label}
          secureTextEntry={password && !revealed}
          placeholderTextColor={colors.inkSubtle}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? t('auth.hidePassword') : t('auth.showPassword')}
            onPress={() => setRevealed((r) => !r)}
            hitSlop={12}>
            <Icon name={revealed ? 'eyeOff' : 'eye'} size={20} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.messageRow} accessibilityLiveRegion="polite">
          <Icon name="error" size={14} color={colors.danger} />
          <Text variant="caption" color={colors.danger} style={styles.message}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" color={colors.inkMuted}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: space.xs + 2,
  },
  field: {
    minHeight: touch.min + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  input: {
    flex: 1,
    ...typeScale.body,
    color: colors.ink,
    paddingVertical: space.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.xs,
  },
  message: {
    flex: 1,
  },
});
