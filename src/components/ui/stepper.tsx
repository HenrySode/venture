import { Pressable, StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { formatQty } from '@/lib/format';
import { colors, radius, space, touch } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

type Props = {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label?: string;
};

/** − value + control with large tap targets for the counter. */
export function QuantityStepper({ value, onChange, step = 1, min = 0, max = Infinity, label }: Props) {
  const t = useT();
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const canDec = value - step >= min - 1e-9;
  const canInc = value + step <= max + 1e-9;
  return (
    <View style={styles.root} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: formatQty(value) }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label ?? ''} −`}
        disabled={!canDec}
        onPress={() => onChange(round(value - step))}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, !canDec && styles.disabled]}>
        <Icon name="minus" size={18} color={colors.ink} />
      </Pressable>
      <Text variant="bodyStrong" style={styles.value} accessibilityLabel={t('forgotten.quantity')}>
        {formatQty(value)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label ?? ''} +`}
        disabled={!canInc}
        onPress={() => onChange(round(value + step))}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, !canInc && styles.disabled]}>
        <Icon name="add" size={18} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  btn: {
    width: touch.min - 4,
    height: touch.min - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.brandTint },
  disabled: { opacity: 0.35 },
  value: {
    minWidth: 40,
    textAlign: 'center',
    paddingHorizontal: space.xs,
  },
});
