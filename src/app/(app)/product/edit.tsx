import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, Card, Chip, Screen, Text, TextField, ToggleRow, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatTsh } from '@/lib/format';
import { mockRequest } from '@/services/client';
import { useData, type ProductInput } from '@/state/data';
import { useToast } from '@/state/toast';
import { colors, space } from '@/theme';

/** Empty string → null; otherwise a number, or NaN when not a number. */
function parseNum(raw: string): number | null {
  const v = raw.trim().replace(/,/g, '');
  if (!v) return null;
  return Number(v);
}

const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

/** Add a product (no id) or edit one (?id=). Stock changes after creation go through restock / stock count. */
export default function ProductFormScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { products, addProduct, updateProduct } = useData();
  const existing = id ? products.find((p) => String(p.id) === id) : undefined;
  const categories = [...new Set(products.map((p) => p.category))].sort();

  const [f, setF] = useState(() => ({
    name: existing?.name ?? '',
    category: existing?.category ?? '',
    barcode: existing?.barcode ?? '',
    unitsPerCarton: str(existing?.unitsPerCarton ?? 1),
    buyCarton: str(existing?.purchasePriceCarton),
    buyUnit: existing && existing.purchasePriceUnit !== Math.round(existing.purchasePriceCarton / existing.unitsPerCarton) ? str(existing.purchasePriceUnit) : '',
    sellCarton: str(existing?.sellPriceCarton),
    sellUnit: str(existing?.sellPriceUnit),
    stockCartons: '',
    stockUnits: '',
    thresholdCartons: str(existing?.lowStockCartonThreshold),
    thresholdUnits: str(existing?.lowStockUnitThreshold),
    ignoreLow: existing?.ignoreLowStock ?? false,
    tax: str(existing?.taxPercent || null),
    reorder: str(existing?.reorderQty),
    expiry: existing?.expiresAt ? existing.expiresAt.slice(0, 10) : '',
    discount: str(existing?.discountPrice),
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof typeof f, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof f>(key: K) => (value: (typeof f)[K]) => {
    setF((prev) => ({ ...prev, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const upc = Math.max(1, Math.floor(parseNum(f.unitsPerCarton) ?? 1));
  const byCarton = upc > 1;
  const buyCarton = parseNum(f.buyCarton) ?? 0;
  const autoBuyUnit = byCarton ? Math.round(buyCarton / upc) : buyCarton;
  const buyUnit = parseNum(f.buyUnit) ?? autoBuyUnit;
  const sellUnit = parseNum(f.sellUnit) ?? 0;

  const save = async () => {
    const next: typeof errors = {};
    if (!f.name.trim()) next.name = t('product.nameRequired');
    const numeric: (keyof typeof f)[] = ['unitsPerCarton', 'buyCarton', 'buyUnit', 'sellCarton', 'sellUnit', 'stockCartons', 'stockUnits', 'thresholdCartons', 'thresholdUnits', 'tax', 'reorder', 'discount'];
    for (const k of numeric) {
      const v = parseNum(String(f[k]));
      if (v !== null && (!Number.isFinite(v) || v < 0)) next[k] = t('product.invalidNumber');
    }
    if (f.expiry && (!/^\d{4}-\d{2}-\d{2}$/.test(f.expiry) || Number.isNaN(new Date(f.expiry).getTime()))) next.expiry = t('product.expiryInvalid');
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const input: ProductInput = {
      name: f.name.trim(),
      category: f.category.trim() || 'Nyingine',
      barcode: f.barcode.trim() || null,
      unitsPerCarton: upc,
      purchasePriceCarton: byCarton ? buyCarton : buyUnit,
      purchasePriceUnit: buyUnit,
      sellPriceCarton: byCarton ? (parseNum(f.sellCarton) ?? sellUnit * upc) : sellUnit,
      sellPriceUnit: sellUnit,
      stockCartons: byCarton ? (parseNum(f.stockCartons) ?? 0) : 0,
      stockUnits: parseNum(f.stockUnits) ?? 0,
      lowStockCartonThreshold: byCarton ? parseNum(f.thresholdCartons) : null,
      lowStockUnitThreshold: parseNum(f.thresholdUnits),
      ignoreLowStock: f.ignoreLow,
      expiresAt: f.expiry ? new Date(`${f.expiry}T12:00:00`).toISOString() : null,
      taxPercent: parseNum(f.tax) ?? 0,
      reorderQty: parseNum(f.reorder),
      discountPrice: parseNum(f.discount),
    };

    setBusy(true);
    setFormError(null);
    try {
      if (existing) {
        await mockRequest(() => updateProduct(existing.id, input), 500);
        toast({ message: t('product.saved') });
        router.back();
      } else {
        const newId = await mockRequest(() => addProduct(input), 500);
        toast({ message: t('product.saved') });
        router.replace({ pathname: '/product/[id]', params: { id: String(newId) } });
      }
    } catch (e) {
      setFormError(errorMessage(t, e, {}));
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<TopBar title={existing ? t('product.editTitle') : t('product.newTitle')} />}
      footer={<Button label={t('product.save')} loadingLabel={t('product.saving')} loading={busy} size="lg" icon="check" onPress={save} block />}>
      {formError ? <Banner tone="danger" message={formError} /> : null}

      <Section title={t('product.basics')}>
        <TextField label={t('product.name')} value={f.name} onChangeText={set('name')} placeholder={t('product.namePlaceholder')} error={errors.name} autoCapitalize="words" />
        <TextField label={t('product.category')} value={f.category} onChangeText={set('category')} placeholder={t('product.categoryPlaceholder')} autoCapitalize="words" />
        {categories.length ? (
          <View style={styles.chips}>
            {categories.map((c) => (
              <Chip key={c} label={c} selected={f.category === c} onPress={() => set('category')(c)} />
            ))}
          </View>
        ) : null}
        <TextField label={`${t('product.barcode')} · ${t('common.optional')}`} value={f.barcode} onChangeText={set('barcode')} keyboardType="number-pad" icon="search" />
      </Section>

      <Section title={t('product.packing')}>
        <TextField
          label={t('product.unitsPerCarton')}
          value={f.unitsPerCarton}
          onChangeText={set('unitsPerCarton')}
          keyboardType="number-pad"
          hint={t('product.unitsPerCartonHint')}
          error={errors.unitsPerCarton}
        />
      </Section>

      <Section title={t('product.buying')}>
        <Pair>
          {byCarton ? <NumField label={t('product.buyCarton')} value={f.buyCarton} onChange={set('buyCarton')} error={errors.buyCarton} /> : null}
          <NumField
            label={t('product.buyUnit')}
            value={f.buyUnit}
            onChange={set('buyUnit')}
            placeholder={byCarton ? String(autoBuyUnit) : undefined}
            error={errors.buyUnit}
          />
        </Pair>
        {byCarton && buyCarton > 0 && !f.buyUnit ? (
          <Text variant="caption" color={colors.inkMuted}>
            {t('product.buyUnitAuto', { price: formatTsh(autoBuyUnit) })}
          </Text>
        ) : null}
      </Section>

      <Section title={t('product.selling')}>
        <Pair>
          {byCarton ? <NumField label={t('product.sellCarton')} value={f.sellCarton} onChange={set('sellCarton')} error={errors.sellCarton} /> : null}
          <NumField label={t('product.sellUnit')} value={f.sellUnit} onChange={set('sellUnit')} error={errors.sellUnit} />
        </Pair>
        {sellUnit > 0 ? (
          <Text variant="caption" color={sellUnit - buyUnit >= 0 ? colors.success : colors.danger}>
            {t('product.margin', { amount: formatTsh(sellUnit - buyUnit) })}
          </Text>
        ) : null}
      </Section>

      {!existing ? (
        <Section title={t('product.openingStock')}>
          <Pair>
            {byCarton ? <NumField label={t('product.stockCartons')} value={f.stockCartons} onChange={set('stockCartons')} error={errors.stockCartons} placeholder="0" /> : null}
            <NumField label={t('product.stockUnits')} value={f.stockUnits} onChange={set('stockUnits')} error={errors.stockUnits} placeholder="0" />
          </Pair>
        </Section>
      ) : null}

      <Section title={t('product.alerts')}>
        {!f.ignoreLow ? (
          <>
            <Pair>
              {byCarton ? <NumField label={t('product.thresholdCartons')} value={f.thresholdCartons} onChange={set('thresholdCartons')} error={errors.thresholdCartons} /> : null}
              <NumField label={t('product.thresholdUnits')} value={f.thresholdUnits} onChange={set('thresholdUnits')} error={errors.thresholdUnits} />
            </Pair>
            <Text variant="caption" color={colors.inkMuted}>
              {t('product.thresholdHint')}
            </Text>
          </>
        ) : null}
        <Card padded={false}>
          <ToggleRow title={t('product.ignoreLow')} value={f.ignoreLow} onChange={set('ignoreLow')} />
        </Card>
      </Section>

      <Section title={t('product.moreDetails')}>
        <TextField
          label={`${t('product.expiry')} · ${t('common.optional')}`}
          value={f.expiry}
          onChangeText={set('expiry')}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          icon="calendar"
          error={errors.expiry}
        />
        <Pair>
          <NumField label={t('product.tax')} value={f.tax} onChange={set('tax')} error={errors.tax} placeholder="0" />
          <NumField label={t('product.reorder')} value={f.reorder} onChange={set('reorder')} error={errors.reorder} />
        </Pair>
        <NumField label={`${t('product.discount')} · ${t('common.optional')}`} value={f.discount} onChange={set('discount')} error={errors.discount} />
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline" color={colors.inkMuted}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function Pair({ children }: { children: ReactNode }) {
  return <View style={styles.pair}>{children}</View>;
}

function NumField({ label, value, onChange, error, placeholder }: { label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string }) {
  return (
    <View style={styles.flex}>
      <TextField label={label} value={value} onChangeText={onChange} keyboardType="decimal-pad" error={error} placeholder={placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: {
    gap: space.sm,
    marginBottom: space.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  pair: {
    flexDirection: 'row',
    gap: space.md,
  },
});
