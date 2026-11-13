import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanBanner } from '@/components/access';
import { Badge, Banner, Button, Card, Divider, EmptyState, Icon, Sheet, StatTile, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate, formatQty, formatTime, formatTsh } from '@/lib/format';
import { isBusinessHours, isToday, workdayDate, workdayKey } from '@/lib/workday';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, radius, space } from '@/theme';
import type { Sale } from '@/types/domain';

/** Seller's own sales, grouped by workday. Unsell is allowed on today's lines only. */
export default function MySalesScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { user } = useCurrentSession();
  const { sales, closures, unsell } = useData();
  const [selected, setSelected] = useState<Sale | null>(null);

  const mine = sales.filter((s) => s.sellerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const today = workdayKey();
  const todays = mine.filter((s) => workdayKey(s.createdAt) === today);
  const todayTotal = todays.reduce((sum, s) => sum + s.total, 0);
  const closed = closures.some((c) => c.workday === today && c.sellerId === user.id);

  const groups = new Map<string, Sale[]>();
  for (const s of mine) {
    const k = workdayKey(s.createdAt);
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const sections = [...groups.entries()].map(([key, data]) => ({ key, data, total: data.reduce((sum, s) => sum + s.total, 0) }));

  const doUnsell = () => {
    if (!selected) return;
    unsell(selected.id);
    setSelected(null);
    toast({ message: t('mySales.unsold'), icon: 'undo' });
  };

  const dayStatus = closed ? t('shift.closed') : isBusinessHours() ? t('shift.openSince', { time: '05:00' }) : t('shift.outside');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {t('mySales.title')}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.top}>
            <PlanBanner />
            {/* Day / books */}
            <Pressable accessibilityRole="button" onPress={() => router.push('/shift')} style={({ pressed }) => [styles.day, closed && styles.dayClosed, pressed && { opacity: 0.85 }]}>
              <View style={[styles.dayIcon, closed && { backgroundColor: colors.successSoft }]}>
                <Icon name={closed ? 'check' : 'book'} size={20} color={closed ? colors.success : colors.brandStrong} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong">{dayStatus}</Text>
                <Text variant="caption" color={colors.inkMuted}>
                  {closed ? t('shift.title') : t('shift.closeBooks')}
                </Text>
              </View>
              <Icon name="chevronRight" size={16} color={colors.inkSubtle} />
            </Pressable>
            <View style={styles.stats}>
              <StatTile label={`${t('mySales.today')} · ${t('mySales.salesCount')}`} value={String(todays.length)} icon="receipt" tone="brand" />
              <StatTile label={`${t('mySales.today')} · ${t('mySales.revenue')}`} value={formatTsh(todayTotal)} icon="money" tone="success" />
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="receipt" title={t('mySales.empty')} message={t('mySales.emptyBody')} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHead}>
            <Text variant="overline" color={colors.inkMuted}>
              {(section.key === today ? t('mySales.today') : formatDate(workdayDate(section.key), locale)).toUpperCase()}
            </Text>
            <Text variant="caption" color={colors.inkMuted}>
              {t('mySales.dayTotal', { count: section.data.length, amount: formatTsh(section.total) })}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <SaleRow sale={item} first={index === 0} last={index === section.data.length - 1} onPress={() => setSelected(item)} />
        )}
      />

      <Sheet visible={selected !== null} onClose={() => setSelected(null)} title={selected?.productName ?? ''}>
        {selected ? (
          <View style={styles.sheet}>
            <Card padded={false}>
              <Detail label={t('receipt.date')} value={`${formatDate(selected.createdAt, locale)} · ${formatTime(selected.createdAt)}`} />
              <Divider />
              <Detail label={t('forgotten.quantity')} value={`${formatQty(selected.quantity)} × ${t(selected.kind === 'carton' ? 'sell.carton' : 'sell.unit')}`} />
              <Divider />
              <Detail label={t('basket.total')} value={formatTsh(selected.total)} />
            </Card>
            {isToday(selected.createdAt) ? (
              <>
                <Text variant="body" color={colors.inkMuted}>
                  {t('mySales.unsellBody', { qty: formatQty(selected.quantity), name: selected.productName })}
                </Text>
                <Button label={t('mySales.unsell')} variant="danger" icon="undo" onPress={doUnsell} block />
              </>
            ) : (
              <Banner tone="info" message={t('mySales.unsellOnlyToday')} />
            )}
          </View>
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}

function SaleRow({ sale: s, first, last, onPress }: { sale: Sale; first: boolean; last: boolean; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, first && styles.rowFirst, last && styles.rowLast, !last && styles.rowBorder, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <Text variant="caption" color={colors.inkMuted} style={styles.time}>
        {formatTime(s.createdAt)}
      </Text>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {s.productName}
        </Text>
        <View style={styles.meta}>
          <Text variant="caption" color={colors.inkMuted}>
            {formatQty(s.quantity)} × {t(s.kind === 'carton' ? 'sell.carton' : 'sell.unit')}
          </Text>
          {s.forgotten ? <Badge label={t('mySales.forgotten')} tone="info" /> : null}
          {s.fromCredit ? <Badge label={t('mySales.fromCredit')} tone="success" /> : null}
        </View>
      </View>
      <Text variant="bodyStrong">{formatTsh(s.total)}</Text>
    </Pressable>
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
  header: {
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
  },
  list: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
  },
  top: {
    gap: space.md,
  },
  day: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandSoft,
  },
  dayClosed: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  dayIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: space.md,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  time: {
    width: 42,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexWrap: 'wrap',
  },
  sheet: {
    gap: space.md,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
