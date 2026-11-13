import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, Sheet, Text, TextField } from '@/components/ui';
import { useT } from '@/i18n';
import { formatQty } from '@/lib/format';
import { colors, space } from '@/theme';

const PRESETS = [0.5, 1, 2, 3, 5, 10];

/** "How many each tap sells": presets plus a custom (decimal) amount. */
export function TapQtySheet({
  visible,
  value,
  onClose,
  onChange,
}: {
  visible: boolean;
  value: number;
  onClose: () => void;
  onChange: (qty: number) => void;
}) {
  const t = useT();
  const [custom, setCustom] = useState('');
  const parsed = Number(custom.replace(',', '.'));
  const valid = custom !== '' && Number.isFinite(parsed) && parsed > 0;

  const choose = (qty: number) => {
    onChange(qty);
    setCustom('');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('sell.perTapTitle')}>
      <Text variant="caption" color={colors.inkMuted}>
        {t('sell.perTapHint')}
      </Text>
      <View style={styles.chips}>
        {PRESETS.map((q) => (
          <Chip key={q} label={`× ${formatQty(q)}`} selected={q === value} onPress={() => choose(q)} />
        ))}
      </View>
      <TextField label={t('sell.custom')} value={custom} onChangeText={setCustom} keyboardType="decimal-pad" placeholder="1.5" />
      <Button label={t('sell.apply')} disabled={!valid} onPress={() => choose(Math.round(parsed * 1000) / 1000)} block />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
