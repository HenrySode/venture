import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PeriodPicker } from '@/components/money/period-picker';
import { Badge, Button, Card, Chip, Divider, EmptyState, Icon, Sheet, StatTile, Text, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate, formatQty, formatTime, formatTsh, isoDay } from '@/lib/format';
import { summarize } from '@/lib/money';
import { inPeriod, type Period } from '@/lib/periods';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, space } from '@/theme';
import type { Sale } from '@/types/domain';

/** Every sale by period and seller, with profit, unsell (admin), and CSV export. */
export default function SalesReportScreen() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { user } = useCurrentSession();
  const { sales, unsell } = useData();

  const [period, setPeriod] = useState<Period>({ kind: 'today' });
  const [seller, setSeller] = useState<number | null>(null);
  const [selected, setSelected] = useState<Sale | null>(null);

  const sellers = [...new Map(sales.map((s) => [s.sellerId, s.sellerName])).entries()];
  const list = sales
    .filter((s) => inPeriod(s.createdAt, period) && (seller === null || s.sellerId === seller))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sum = summarize(list);
  const showDate = period.kind !== 'today' && period.kind !== 'day';

  const exportCsv = () => {
    const rows = [
      ['date', 'time', 'product', 'type', 'quantity', 'revenue', 'profit', 'seller'],
      ...list.map((s) => [isoDay(new Date(s.createdAt)), formatTime(s.createdAt), s.productName, s.kind, formatQty(s.quantity), String(s.total), String(s.total - s.cost), s.sellerName]),
    ];
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
    Share.share({ title: t('report.exportTitle'), message: csv }).catch(() => undefined);
  };

  return (
    <SafeAreaView style={styles.root}>
      <TopBar
        title={t('money.salesReport')}
        right={
          <Pressable accessibilityRole="button" accessibilityLabel={t('report.exportCsv')} onPress={exportCsv} hitSlop={8} disabled={!list.length}>
            <Icon name="share" size={22} color={list.length ? colors.ink : colors.inkSubtle} />
          </Pressable>
        }
      />
      <FlatList
        data={list}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.top}>
            <PeriodPicker value={period} onChange={setPeriod} />
            {sellers.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.bar}>
                <Chip label={t('report.allSellers')} icon="users" selected={seller === null} onPress={() => setSeller(null)} />
                {sellers.map(([id, name]) => (
                  <Chip key={id} label={name} selected={seller === id} onPress={() => setSeller(id)} />
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.grid}>
              <StatTile label={t('report.revenue')} value={formatTsh(sum.revenue)} tone="brand" />
              <StatTile label={t('report.profit')} value={formatTsh(sum.profit)} tone="success" />
            </View>
            <Text variant="caption" color={colors.inkMuted}>
              {t('report.count')}: {sum.count}
            </Text>
          </View>
        }
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={<EmptyState icon="receipt" title={t('report.empty')} />}
        renderItem={({ item: s }) => (
          <Pressable accessibilityRole="button" onPress={() => setSelected(s)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
            <View style={styles.time}>
              <Text variant="caption" color={colors.inkMuted}>
                {formatTime(s.createdAt)}
              </Text>
              {showDate ? (
                <Text variant="caption" color={colors.inkSubtle}>
                  {formatDate(s.createdAt, locale).slice(0, 6)}
                </Text>
              ) : null}
            </View>
            <View style={styles.flex}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {s.productName}
              </Text>
              <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
                {formatQty(s.quantity)} × {t(s.kind === 'carton' ? 'sell.carton' : 'sell.unit')} · {s.sellerName.split(' ')[0]}
              </Text>
            </View>
            <View style={styles.amounts}>
              <Text variant="bodyStrong">{formatTsh(s.total)}</Text>
              <Text variant="caption" color={s.total - s.cost >= 0 ? colors.success : colors.danger}>
                +{formatTsh(s.total - s.cost)}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <Sheet visible={selected !== null} onClose={() => setSelected(null)} title={selected?.productName ?? ''}>
        {selected ? (
          <View style={styles.sheet}>
            <Card padded={false}>
              <Detail label={t('receipt.date')} value={`${formatDate(selected.createdAt, locale)} · ${formatTime(selected.createdAt)}`} />
              <Divider />
              <Detail label={t('report.type')} value={`${formatQty(selected.quantity)} × ${t(selected.kind === 'carton' ? 'sell.carton' : 'sell.unit')}`} />
              <Divider />
              <Detail label={t('report.revenue')} value={formatTsh(selected.total)} />
              <Divider />
              <Detail label={t('report.profit')} value={formatTsh(selected.total - selected.cost)} />
              <Divider />
              <Detail label={t('report.seller')} value={selected.sellerName} />
            </Card>
            <View style={styles.badges}>
              {selected.forgotten ? <Badge label={t('mySales.forgotten')} tone="info" /> : null}
              {selected.fromCredit ? <Badge label={t('mySales.fromCredit')} tone="success" /> : null}
            </View>
            {user.role === 'admin' ? (
              <>
                <Text variant="body" color={colors.inkMuted}>
                  {t('report.unsellBody')}
                </Text>
                <Button
                  label={t('mySales.unsell')}
                  variant="danger"
                  icon="undo"
                  onPress={() => {
                    unsell(selected.id);
                    setSelected(null);
                    toast({ message: t('mySales.unsold'), icon: 'undo' });
                  }}
                  block
                />
              </>
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text variant="body" color={colors.inkMuted} style={styles.flex}>
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
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
    marginBottom: space.md,
  },
  bar: { flexGrow: 0 },
  chips: { gap: space.sm },
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
  time: {
    width: 48,
  },
  amounts: {
    alignItems: 'flex-end',
  },
  sheet: { gap: space.md },
  badges: {
    flexDirection: 'row',
    gap: space.sm,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
