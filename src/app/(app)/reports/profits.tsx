import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PeriodPicker } from '@/components/money/period-picker';
import { Divider, EmptyState, SegmentedControl, StatTile, Text, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate, formatQty, formatTime, formatTsh } from '@/lib/format';
import { marginText, summarize } from '@/lib/money';
import { inPeriod, type Period } from '@/lib/periods';
import { useData } from '@/state/data';
import { colors, space } from '@/theme';
import type { Sale } from '@/types/domain';

type Mode = 'product' | 'sale';
type ProductProfit = { productId: number; name: string; units: number; revenue: number; cost: number; profit: number };

/** Profit table: by product (best first) or every sale's profit. */
export default function ProfitsScreen() {
  const { t, locale } = useI18n();
  const { sales, products } = useData();
  const [period, setPeriod] = useState<Period>({ kind: 'month' });
  const [mode, setMode] = useState<Mode>('product');

  const inRange = sales.filter((s) => inPeriod(s.createdAt, period)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sum = summarize(inRange);

  const byProduct = new Map<number, ProductProfit>();
  for (const s of inRange) {
    const upc = products.find((p) => p.id === s.productId)?.unitsPerCarton ?? 1;
    const row = byProduct.get(s.productId) ?? { productId: s.productId, name: s.productName, units: 0, revenue: 0, cost: 0, profit: 0 };
    row.units += s.quantity * (s.kind === 'carton' ? upc : 1);
    row.revenue += s.total;
    row.cost += s.cost;
    row.profit = row.revenue - row.cost;
    byProduct.set(s.productId, row);
  }
  const productRows = [...byProduct.values()].sort((a, b) => b.profit - a.profit);

  const header = (
    <View style={styles.top}>
      <PeriodPicker value={period} onChange={setPeriod} />
      <View style={styles.grid}>
        <StatTile label={t('profits.cost')} value={formatTsh(sum.cost)} />
        <StatTile label={t('home.profit')} value={formatTsh(sum.profit)} tone="success" hint={`${t('profits.margin')}: ${marginText(sum.profit, sum.revenue)}`} />
      </View>
      <SegmentedControl<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'product', label: t('profits.byProduct') },
          { value: 'sale', label: t('profits.bySale') },
        ]}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <TopBar title={t('money.profits')} />
      {mode === 'product' ? (
        <FlatList
          data={productRows}
          keyExtractor={(r) => String(r.productId)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ItemSeparatorComponent={Divider}
          ListEmptyComponent={<EmptyState icon="chart" title={t('profits.empty')} />}
          renderItem={({ item: r }) => (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {r.name}
                </Text>
                <Text variant="caption" color={colors.inkMuted}>
                  {t('profits.sold')}: {formatQty(r.units)} · {formatTsh(r.revenue)} · {t('profits.margin')} {marginText(r.profit, r.revenue)}
                </Text>
              </View>
              <Text variant="bodyStrong" color={r.profit >= 0 ? colors.success : colors.danger}>
                {formatTsh(r.profit)}
              </Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={inRange}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ItemSeparatorComponent={Divider}
          ListEmptyComponent={<EmptyState icon="chart" title={t('profits.empty')} />}
          renderItem={({ item: s }) => <SaleProfit sale={s} locale={locale} t={t} />}
        />
      )}
    </SafeAreaView>
  );
}

function SaleProfit({ sale: s, locale, t }: { sale: Sale; locale: ReturnType<typeof useI18n>['locale']; t: ReturnType<typeof useI18n>['t'] }) {
  const profit = s.total - s.cost;
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {s.productName}
        </Text>
        <Text variant="caption" color={colors.inkMuted}>
          {formatDate(s.createdAt, locale)} {formatTime(s.createdAt)} · {formatQty(s.quantity)} × {t(s.kind === 'carton' ? 'sell.carton' : 'sell.unit')} · {formatTsh(s.total)}
        </Text>
      </View>
      <Text variant="bodyStrong" color={profit >= 0 ? colors.success : colors.danger}>
        {formatTsh(profit)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
  },
  top: {
    gap: space.md,
    marginBottom: space.sm,
  },
  grid: {
    flexDirection: 'row',
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
});
