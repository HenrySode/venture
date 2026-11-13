import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanGate } from '@/components/access';
import { PeriodPicker } from '@/components/money/period-picker';
import { Badge, Card, Divider, EmptyState, StatTile, Text, ToggleRow, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { isLineOpen, lineOwed } from '@/lib/credits';
import { formatDate, formatNumber, formatQty, formatTsh } from '@/lib/format';
import { inPeriod, type Period } from '@/lib/periods';
import { useData } from '@/state/data';
import { colors, space } from '@/theme';

/** Admin: every credit line, filtered by period and "unpaid only"; tap opens the customer. */
export default function CreditsScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { credits } = useData();
  const [period, setPeriod] = useState<Period>({ kind: 'all' });
  const [openOnly, setOpenOnly] = useState(true);

  const list = credits
    .filter((l) => inPeriod(l.createdAt, period) && (!openOnly || isLineOpen(l)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const owed = list.reduce((s, l) => s + lineOwed(l), 0);
  const paid = list.reduce((s, l) => s + l.paid, 0);

  return (
    <SafeAreaView style={styles.root}>
      <TopBar title={t('credits.title')} />
      <PlanGate module="credit">
        <FlatList
          data={list}
          keyExtractor={(l) => String(l.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.top}>
              <PeriodPicker value={period} onChange={setPeriod} />
              <View style={styles.grid}>
                <StatTile label={t('credits.owed')} value={formatTsh(owed)} tone="danger" icon="credit" />
                <StatTile label={t('credits.paid')} value={formatTsh(paid)} tone="success" icon="check" />
              </View>
              <Card padded={false}>
                <ToggleRow title={t('credits.openOnly')} subtitle={t('credits.lines', { count: list.length })} value={openOnly} onChange={setOpenOnly} />
              </Card>
            </View>
          }
          ItemSeparatorComponent={Divider}
          ListEmptyComponent={<EmptyState icon="credit" title={t('credits.empty')} />}
          renderItem={({ item: l }) => {
            const open = isLineOpen(l);
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/madeni/[key]', params: { key: l.customerKey } })}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {l.customerName}
                  </Text>
                  <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
                    {l.productName} · {formatQty(l.quantity)} × {t(l.kind === 'carton' ? 'sell.carton' : 'sell.unit')} · {formatDate(l.createdAt, locale)}
                  </Text>
                  {open && l.paid > 0 ? (
                    <Text variant="caption" color={colors.warning}>
                      {t('madeni.paidOf', { paid: formatNumber(l.paid), total: formatNumber(l.total) })}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.right}>
                  <Text variant="bodyStrong">{formatTsh(l.total)}</Text>
                  <Badge label={open ? t('madeni.open') : t('madeni.paid')} tone={open ? 'warning' : 'success'} />
                </View>
              </Pressable>
            );
          }}
        />
      </PlanGate>
    </SafeAreaView>
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
  right: {
    alignItems: 'flex-end',
    gap: space.xs,
  },
});
