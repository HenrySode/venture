import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { PlanGate } from '@/components/access';
import { ProductRow } from '@/components/stock/product-row';
import { Badge, Banner, Button, Card, Chip, EmptyState, Screen, SearchField, SegmentedControl, Sheet, Text, TextField, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { daysUntil, formatQty, productMatches } from '@/lib/format';
import { sellsByCarton, totalUnits } from '@/lib/stock';
import { isLowStock, isOutOfStock } from '@/mocks/products';
import { mockRequest } from '@/services/client';
import { useData, type CountEntry } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, space } from '@/theme';
import type { Product, StockAdjustmentReason } from '@/types/domain';

type Tab = 'count' | 'reorder' | 'expiring';
const REASONS: StockAdjustmentReason[] = ['correction', 'damaged', 'lost', 'expired', 'other'];

/** Stock count + Reorder list + Expiring within 7 days. */
export default function StockCountScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { user } = useCurrentSession();
  const { tab: initialTab } = useLocalSearchParams<{ tab?: Tab }>();
  const { products, applyCount } = useData();

  const [tab, setTab] = useState<Tab>(initialTab ?? 'count');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<CountEntry[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    await mockRequest(() => applyCount(pending, user), 600).catch(() => undefined);
    toast({ message: t('count.applied', { count: pending.length }) });
    setPending([]);
    setBusy(false);
  };

  const reorder = products.filter((p) => !p.ignoreLowStock && (isOutOfStock(p) || isLowStock(p)));
  const expiring = products.filter((p) => p.expiresAt !== null && daysUntil(p.expiresAt) <= 7).sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));

  const tabs = (
    <SegmentedControl<Tab>
      value={tab}
      onChange={setTab}
      options={[
        { value: 'count', label: pending.length ? `${t('count.tabCount')} · ${pending.length}` : t('count.tabCount') },
        { value: 'reorder', label: `${t('count.tabReorder')} · ${reorder.length}` },
        { value: 'expiring', label: `${t('count.tabExpiring')} · ${expiring.length}` },
      ]}
    />
  );

  const countList = products.filter((p) => productMatches(p, query));

  return (
    <Screen
      scroll={false}
      header={<TopBar title={t('count.title')} />}
      footer={
        tab === 'count' && pending.length ? (
          <Button label={t('count.apply', { count: pending.length })} size="lg" icon="check" loading={busy} onPress={apply} block />
        ) : null
      }>
      <PlanGate module="stock">
        {tabs}
        {tab === 'count' ? (
          <>
            <Text variant="caption" color={colors.inkMuted}>
              {t('count.lead')}
            </Text>
            <SearchField value={query} onChangeText={setQuery} placeholder={t('stock.search')} />
            <FlatList
              data={countList}
              keyExtractor={(p) => String(p.id)}
              style={styles.flex}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const entry = pending.find((e) => e.productId === item.id);
                return (
                  <ProductRow
                    product={item}
                    onPress={() => setEditing(item)}
                    trailing={
                      entry ? (
                        <Badge
                          label={`${t('count.counted')}: ${sellsByCarton(item) ? `${entry.cartons} C · ` : ''}${formatQty(entry.units)} U`}
                          tone="brand"
                          icon="check"
                        />
                      ) : undefined
                    }
                  />
                );
              }}
            />
          </>
        ) : null}

        {tab === 'reorder' ? (
          <FlatList
            data={reorder}
            keyExtractor={(p) => String(p.id)}
            style={styles.flex}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState icon="check" title={t('count.noReorder')} message={t('count.noReorderBody')} />}
            renderItem={({ item }) => (
              <ProductRow
                product={item}
                onPress={() => router.push({ pathname: '/restock', params: { id: String(item.id) } })}
                trailing={sellsByCarton(item) ? <Badge label={t('count.suggest', { count: item.reorderQty ?? 5 })} tone="info" /> : undefined}
              />
            )}
          />
        ) : null}

        {tab === 'expiring' ? (
          <PlanGate module="expiry">
            <FlatList
              data={expiring}
              keyExtractor={(p) => String(p.id)}
              style={styles.flex}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<EmptyState icon="clock" title={t('count.noExpiring')} message={t('count.noExpiringBody')} />}
              renderItem={({ item }) => <ProductRow product={item} showExpiry onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(item.id) } })} />}
            />
          </PlanGate>
        ) : null}
      </PlanGate>

      <CountSheet
        product={editing}
        entry={pending.find((e) => e.productId === editing?.id)}
        onClose={() => setEditing(null)}
        onSave={(entry) => {
          setPending((list) => [...list.filter((e) => e.productId !== entry.productId), entry]);
          setEditing(null);
        }}
      />
    </Screen>
  );
}

function CountSheet({ product: p, entry, onClose, onSave }: { product: Product | null; entry?: CountEntry; onClose: () => void; onSave: (e: CountEntry) => void }) {
  return (
    <Sheet visible={p !== null} onClose={onClose} title={p?.name ?? ''}>
      {/* Keyed so the form resets for each product. */}
      {p ? <CountForm key={p.id} product={p} entry={entry} onSave={onSave} /> : null}
    </Sheet>
  );
}

function CountForm({ product: p, entry, onSave }: { product: Product; entry?: CountEntry; onSave: (e: CountEntry) => void }) {
  const t = useT();
  const byCarton = sellsByCarton(p);
  const [cartons, setCartons] = useState(String(entry?.cartons ?? p.stockCartons));
  const [units, setUnits] = useState(String(entry?.units ?? p.stockUnits));
  const [reason, setReason] = useState<StockAdjustmentReason>(entry?.reason ?? 'correction');
  const [error, setError] = useState<string | null>(null);

  const c = byCarton ? Number(cartons || '0') : 0;
  const u = Number(units || '0');
  const valid = Number.isFinite(c) && Number.isFinite(u) && c >= 0 && u >= 0 && Number.isInteger(c);
  const diff = valid ? c * p.unitsPerCarton + u - totalUnits(p) : 0;

  return (
    <View style={styles.form}>
      <Card style={styles.expected}>
        <Text variant="caption" color={colors.inkMuted}>
          {t('count.expected')}
        </Text>
        <Text variant="heading">
          {byCarton ? t('sell.stockLine', { cartons: p.stockCartons, units: formatQty(p.stockUnits) }) : `${formatQty(p.stockUnits)} ${t('sell.unit').toLowerCase()}`}
        </Text>
      </Card>
      <View style={styles.pair}>
        {byCarton ? (
          <View style={styles.flex}>
            <TextField label={t('product.stockCartons')} value={cartons} onChangeText={setCartons} keyboardType="number-pad" selectTextOnFocus />
          </View>
        ) : null}
        <View style={styles.flex}>
          <TextField label={byCarton ? t('product.stockUnits') : t('sell.unit')} value={units} onChangeText={setUnits} keyboardType="decimal-pad" selectTextOnFocus />
        </View>
      </View>
      {valid && diff !== 0 ? (
        <Banner tone={diff > 0 ? 'info' : 'warning'} title={t('count.difference')} message={`${diff > 0 ? '+' : '−'}${formatQty(Math.abs(diff))} ${t('sell.unit').toLowerCase()}`} />
      ) : null}
      <Text variant="label">{t('count.reason')}</Text>
      <View style={styles.chips}>
        {REASONS.map((r) => (
          <Chip key={r} label={t(`count.reasons.${r}`)} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      {error ? <Banner tone="danger" message={error} /> : null}
      <Button
        label={t('count.setCount')}
        onPress={() => (valid ? onSave({ productId: p.id, cartons: c, units: u, reason }) : setError(t('product.invalidNumber')))}
        block
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    gap: space.sm,
    paddingBottom: space.lg,
  },
  form: {
    gap: space.md,
  },
  expected: {
    gap: 2,
  },
  pair: {
    flexDirection: 'row',
    gap: space.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
