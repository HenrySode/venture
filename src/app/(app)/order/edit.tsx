import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProductPicker } from '@/components/sell/product-picker';
import { Banner, Button, Card, Chip, Icon, Screen, Text, TextField, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { formatTsh } from '@/lib/format';
import { lineCost, orderTotal } from '@/lib/orders';
import { sellsByCarton } from '@/lib/stock';
import { mockRequest } from '@/services/client';
import { useData } from '@/state/data';
import { useToast } from '@/state/toast';
import { colors, space } from '@/theme';
import type { OrderLine } from '@/types/domain';

type Draft = { productId: number; cartons: string; units: string; costCarton: string; costUnit: number };

const n = (raw: string) => {
  const v = Number(raw.replace(/,/g, '').trim() || '0');
  return Number.isFinite(v) && v >= 0 ? v : 0;
};

/** Create (?supplier=) or edit (?id=) a draft purchase order. */
export default function OrderFormScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { id, supplier } = useLocalSearchParams<{ id?: string; supplier?: string }>();
  const { orders, suppliers, products, saveOrder } = useData();
  const existing = id ? orders.find((o) => String(o.id) === id) : undefined;

  const [supplierId, setSupplierId] = useState<number | null>(existing?.supplierId ?? (supplier ? Number(supplier) : null));
  const [lines, setLines] = useState<Draft[]>(
    () =>
      existing?.lines.map((l) => ({ productId: l.productId, cartons: String(l.cartons || ''), units: String(l.units || ''), costCarton: String(l.costCarton), costUnit: l.costUnit })) ?? [],
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toLines = (): OrderLine[] =>
    lines.map((l) => ({ productId: l.productId, cartons: n(l.cartons), units: n(l.units), costCarton: n(l.costCarton), costUnit: l.costUnit }));
  const total = orderTotal({ lines: toLines() });

  const update = (i: number, patch: Partial<Draft>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const save = async () => {
    if (supplierId === null) {
      setError(t('orders.supplierRequired'));
      return;
    }
    const clean = toLines().filter((l) => l.cartons + l.units > 0);
    if (!clean.length) {
      setError(t('orders.noLines'));
      return;
    }
    setBusy(true);
    const orderId = await mockRequest(() => saveOrder({ supplierId, lines: clean, notes: notes.trim() || null }, existing?.id), 500);
    toast({ message: t('orders.saved') });
    if (existing) router.back();
    else router.replace({ pathname: '/order/[id]', params: { id: String(orderId) } });
  };

  return (
    <Screen
      header={<TopBar title={existing ? t('orders.number', { id: existing.id }) : t('orders.new')} />}
      footer={
        <View style={styles.footer}>
          <View style={styles.row}>
            <Text variant="bodyStrong" color={colors.inkMuted} style={styles.flex}>
              {t('orders.total')}
            </Text>
            <Text variant="title">{formatTsh(total)}</Text>
          </View>
          <Button label={t('orders.saveDraft')} size="lg" icon="check" loading={busy} onPress={save} block />
        </View>
      }>
      {error ? <Banner tone="danger" message={error} /> : null}

      <Text variant="label">{t('orders.supplier')}</Text>
      <View style={styles.chips}>
        {suppliers.map((s) => (
          <Chip
            key={s.id}
            label={s.name}
            icon="suppliers"
            selected={supplierId === s.id}
            onPress={() => {
              setSupplierId(s.id);
              setError(null);
            }}
          />
        ))}
      </View>

      <Text variant="overline" color={colors.inkMuted} style={styles.section}>
        {t('orders.lines').toUpperCase()}
      </Text>
      {lines.map((l, i) => {
        const p = products.find((x) => x.id === l.productId);
        if (!p) return null;
        const byCarton = sellsByCarton(p);
        return (
          <Card key={`${l.productId}-${i}`} style={styles.line}>
            <View style={styles.row}>
              <Text variant="bodyStrong" style={styles.flex} numberOfLines={2}>
                {p.name}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('madeni.remove')} hitSlop={10} onPress={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                <Icon name="trash" size={20} color={colors.danger} />
              </Pressable>
            </View>
            <View style={styles.pair}>
              {byCarton ? (
                <View style={styles.flex}>
                  <TextField label={t('restock.cartons')} value={l.cartons} onChangeText={(v) => update(i, { cartons: v })} keyboardType="number-pad" placeholder="0" />
                </View>
              ) : null}
              <View style={styles.flex}>
                <TextField label={byCarton ? t('restock.units') : t('sell.unit')} value={l.units} onChangeText={(v) => update(i, { units: v })} keyboardType="decimal-pad" placeholder="0" />
              </View>
            </View>
            {byCarton ? (
              <TextField label={t('orders.costCarton')} value={l.costCarton} onChangeText={(v) => update(i, { costCarton: v })} keyboardType="number-pad" />
            ) : null}
            <Text variant="label" style={styles.lineTotal}>
              {formatTsh(lineCost({ productId: l.productId, cartons: n(l.cartons), units: n(l.units), costCarton: n(l.costCarton), costUnit: l.costUnit }))}
            </Text>
          </Card>
        );
      })}
      <Button label={t('orders.addLine')} variant="secondary" icon="add" onPress={() => setPicker(true)} block />

      <TextField label={`${t('orders.notes')} · ${t('common.optional')}`} value={notes} onChangeText={setNotes} multiline />

      <ProductPicker
        visible={picker}
        includeOutOfStock
        title={t('orders.addLine')}
        onClose={() => setPicker(false)}
        onPick={(p) => {
          setPicker(false);
          setError(null);
          setLines((ls) => [
            ...ls,
            { productId: p.id, cartons: sellsByCarton(p) ? String(p.reorderQty ?? 1) : '', units: sellsByCarton(p) ? '' : '1', costCarton: String(p.purchasePriceCarton), costUnit: p.purchasePriceUnit },
          ]);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  section: {
    marginTop: space.sm,
  },
  line: {
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  pair: {
    flexDirection: 'row',
    gap: space.md,
  },
  lineTotal: {
    textAlign: 'right',
  },
  footer: {
    gap: space.md,
  },
});
