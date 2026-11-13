import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PlanGate } from '@/components/access';
import { ProductPicker } from '@/components/sell/product-picker';
import { Banner, Button, Card, Chip, Icon, Screen, Text, TextField, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { cashOnHand } from '@/lib/cash';
import { errorMessage } from '@/lib/errors';
import { formatQty, formatTsh } from '@/lib/format';
import { sellsByCarton } from '@/lib/stock';
import { mockRequest } from '@/services/client';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, radius, space, touch } from '@/theme';

const num = (raw: string) => {
  const v = Number(raw.replace(/,/g, '').trim() || '0');
  return Number.isFinite(v) && v >= 0 ? v : NaN;
};

/** Buy stock in: cartons + loose units, optional supplier and invoice. Warns when cash is short. */
export default function RestockScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { user } = useCurrentSession();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useData();
  const { products, suppliers, restock } = data;

  const [productId, setProductId] = useState<number | null>(id ? Number(id) : null);
  const [picker, setPicker] = useState(!id);
  const [cartons, setCartons] = useState('');
  const [units, setUnits] = useState('');
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [invoice, setInvoice] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const p = products.find((x) => x.id === productId) ?? null;
  const c = num(cartons);
  const u = num(units);
  const cost = p && !Number.isNaN(c) && !Number.isNaN(u) ? c * p.purchasePriceCarton + u * p.purchasePriceUnit : 0;
  const cash = cashOnHand(data);

  const save = async () => {
    if (!p) {
      setPicker(true);
      return;
    }
    if (Number.isNaN(c) || Number.isNaN(u)) {
      setError(t('product.invalidNumber'));
      return;
    }
    if (c + u <= 0) {
      setError(t('restock.nothing'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await mockRequest(
        () => restock({ productId: p.id, cartons: c, units: u, supplierId, invoice: invoice.trim() || null, note: note.trim() || null }, user),
        500,
      );
      toast({ message: t('restock.saved', { name: p.name }) });
      router.back();
    } catch (e) {
      setError(errorMessage(t, e, {}));
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<TopBar title={t('restock.title')} />}
      footer={<Button label={t('restock.save')} loadingLabel={t('restock.saving')} loading={busy} size="lg" icon="check" onPress={save} block />}>
      <PlanGate module="stock">
        {error ? <Banner tone="danger" message={error} /> : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => setPicker(true)}
          style={({ pressed }) => [styles.product, pressed && { backgroundColor: colors.surfaceMuted }]}>
          <View style={styles.productIcon}>
            <Icon name="stock" size={20} color={colors.brandStrong} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {p ? p.name : t('restock.choose')}
            </Text>
            {p ? (
              <Text variant="caption" color={colors.inkMuted}>
                {sellsByCarton(p) ? t('sell.stockLine', { cartons: p.stockCartons, units: formatQty(p.stockUnits) }) : `${formatQty(p.stockUnits)} ${t('sell.unit').toLowerCase()}`}
              </Text>
            ) : null}
          </View>
          <Icon name="chevronRight" size={16} color={colors.inkSubtle} />
        </Pressable>

        {p ? (
          <>
            <View style={styles.pair}>
              {sellsByCarton(p) ? (
                <View style={styles.flex}>
                  <TextField
                    label={t('restock.cartons')}
                    value={cartons}
                    onChangeText={setCartons}
                    keyboardType="number-pad"
                    placeholder="0"
                    hint={formatTsh(p.purchasePriceCarton)}
                  />
                </View>
              ) : null}
              <View style={styles.flex}>
                <TextField
                  label={sellsByCarton(p) ? t('restock.units') : t('sell.unit')}
                  value={units}
                  onChangeText={setUnits}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  hint={formatTsh(p.purchasePriceUnit)}
                />
              </View>
            </View>

            <Card style={styles.costCard}>
              <View style={styles.row}>
                <Text variant="body" color={colors.inkMuted} style={styles.flex}>
                  {t('restock.cost')}
                </Text>
                <Text variant="title">{formatTsh(cost)}</Text>
              </View>
              <View style={styles.row}>
                <Text variant="caption" color={colors.inkMuted} style={styles.flex}>
                  {t('restock.cash')}
                </Text>
                <Text variant="label" color={cost > cash ? colors.danger : colors.inkMuted}>
                  {formatTsh(cash)}
                </Text>
              </View>
            </Card>
            {cost > cash ? <Banner tone="warning" message={t('restock.notEnoughCash')} /> : null}

            <View style={styles.field}>
              <Text variant="label">{t('restock.supplier')}</Text>
              <View style={styles.chips}>
                <Chip label={t('restock.noSupplier')} selected={supplierId === null} onPress={() => setSupplierId(null)} />
                {suppliers.map((s) => (
                  <Chip key={s.id} label={s.name} icon="suppliers" selected={supplierId === s.id} onPress={() => setSupplierId(s.id)} />
                ))}
              </View>
            </View>
            <TextField label={`${t('restock.invoice')} · ${t('common.optional')}`} value={invoice} onChangeText={setInvoice} autoCapitalize="characters" />
            <TextField label={`${t('restock.note')} · ${t('common.optional')}`} value={note} onChangeText={setNote} multiline />
          </>
        ) : null}

        <ProductPicker
          visible={picker}
          includeOutOfStock
          title={t('restock.choose')}
          onClose={() => setPicker(false)}
          onPick={(x) => {
            setPicker(false);
            setProductId(x.id);
            setError(null);
          }}
        />
      </PlanGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  product: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: touch.large,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pair: {
    flexDirection: 'row',
    gap: space.md,
  },
  costCard: {
    gap: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  field: {
    gap: space.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
