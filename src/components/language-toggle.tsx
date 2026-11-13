import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { useI18n, type Locale } from '@/i18n';
import { colors, radius, space } from '@/theme';

/** Compact SW | EN switch for headers. */
export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const options: { value: Locale; label: string; a11y: string }[] = [
    { value: 'sw', label: 'SW', a11y: t('common.swahili') },
    { value: 'en', label: 'EN', a11y: t('common.english') },
  ];

  return (
    <View style={styles.root} accessibilityRole="radiogroup" accessibilityLabel={t('common.language')}>
      <Icon name="language" size={16} color={colors.inkMuted} />
      {options.map((o) => {
        const selected = o.value === locale;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.a11y}
            accessibilityState={{ selected }}
            onPress={() => setLocale(o.value)}
            hitSlop={6}
            style={[styles.option, selected && styles.selected]}>
            <Text variant="label" color={selected ? colors.ink : colors.inkMuted}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingLeft: space.sm,
    paddingRight: space.xs,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  option: {
    minWidth: 36,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  selected: {
    backgroundColor: colors.brand,
  },
});
