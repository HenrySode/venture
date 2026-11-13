import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useT } from '@/i18n';
import { colors, radius, space, type as typeScale } from '@/theme';

import { Icon } from './icon';

/** Compact search input with a clear button. */
export function SearchField({ value, onChangeText, placeholder, ...rest }: Omit<TextInputProps, 'style'> & { value: string; onChangeText: (v: string) => void }) {
  const t = useT();
  return (
    <View style={styles.root}>
      <Icon name="search" size={18} color={colors.inkSubtle} />
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        placeholderTextColor={colors.inkSubtle}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={styles.input}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => onChangeText('')} hitSlop={10}>
          <Icon name="close" size={18} color={colors.inkMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 46,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    ...typeScale.body,
    color: colors.ink,
    paddingVertical: space.sm,
  },
});
