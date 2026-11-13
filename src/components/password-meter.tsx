import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useT, type TranslationKey } from '@/i18n';
import { passwordStrength, type PasswordStrength } from '@/lib/password';
import { colors, radius, space } from '@/theme';

const meta: Record<Exclude<PasswordStrength, 'empty'>, { bars: number; color: string; key: TranslationKey }> = {
  tooShort: { bars: 1, color: colors.danger, key: 'register.tooShort' },
  needMix: { bars: 2, color: colors.warning, key: 'register.addLetterNumber' },
  ok: { bars: 3, color: colors.success, key: 'register.goodEnough' },
  strong: { bars: 4, color: colors.success, key: 'register.strong' },
};

/** Live feedback under a new-password field. */
export function PasswordMeter({ password }: { password: string }) {
  const t = useT();
  const strength = passwordStrength(password);

  if (strength === 'empty') {
    return (
      <Text variant="caption" color={colors.inkMuted}>
        {t('register.passwordRule')}
      </Text>
    );
  }

  const m = meta[strength];
  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <View style={styles.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i < m.bars ? m.color : colors.border }]} />
        ))}
      </View>
      <Text variant="caption" color={m.color}>
        {t(m.key)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.xs,
  },
  bars: {
    flexDirection: 'row',
    gap: space.xs,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
  },
});
