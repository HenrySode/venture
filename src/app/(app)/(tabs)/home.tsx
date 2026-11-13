import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanBanner } from '@/components/access';
import { Banner, Card, Icon, StatTile, Text, type IconName } from '@/components/ui';
import { useI18n, type TranslationKey } from '@/i18n';
import { cashOnHand } from '@/lib/cash';
import { formatNumber, formatTsh } from '@/lib/format';
import { summarize } from '@/lib/money';
import { recentWorkdays } from '@/lib/periods';
import { workdayDate, workdayKey } from '@/lib/workday';
import { isLowStock, isOutOfStock } from '@/mocks/products';
import { canManageStock } from '@/state/access';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { colors, radius, space } from '@/theme';

/** Admin / Supervisor dashboard: today at a glance, cash, last 7 days, all-time totals. */
export default function HomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, shop } = useCurrentSession();
  const data = useData();
  const { products, sales, purchases, credits, closures, ledger } = data;
  const [hideStart, setHideStart] = useState(false);

  const today = workdayKey();
  const isToday = (iso: string) => workdayKey(iso) === today;
  const todaySales = summarize(sales.filter((s) => isToday(s.createdAt)));
  const todayBought = purchases.filter((p) => isToday(p.createdAt)).reduce((s, p) => s + p.cost, 0);
  const otherNet = (keep: (iso: string) => boolean) =>
    ledger.filter((e) => keep(e.createdAt)).reduce((s, e) => s + (e.kind === 'revenue' ? e.amount : -e.amount), 0);
  const todayNet = todaySales.profit + otherNet(isToday);

  const all = summarize(sales);
  const allNet = all.profit + otherNet(() => true);
  const cash = cashOnHand(data);
  const low = products.filter((p) => isOutOfStock(p) || (!p.ignoreLowStock && isLowStock(p))).length;

  const days = recentWorkdays(7).reverse();
  const perDay = days.map((key) => sales.filter((s) => workdayKey(s.createdAt) === key).reduce((sum, s) => sum + s.total, 0));
  const max = Math.max(1, ...perDay);

  const steps: { done: boolean; label: TranslationKey; href: Href }[] = [
    { done: products.length > 0, label: 'home.stepProduct', href: '/product/edit' },
    { done: sales.some((s) => !s.fromCredit), label: 'home.stepSale', href: '/sell' },
    { done: credits.length > 0, label: 'home.stepCredit', href: '/credit-sale' },
    { done: closures.length > 0, label: 'home.stepBooks', href: '/shift' },
  ];
  const showStart = !hideStart && user.role === 'admin' && steps.some((s) => !s.done) && (data.emptyShop || !steps[0].done || !steps[1].done);

  const manage = canManageStock(user.role);
  const actions: { icon: IconName; label: TranslationKey; href: Href; show: boolean }[] = [
    { icon: 'sell', label: 'tabs.sell', href: '/sell', show: user.role === 'admin' },
    { icon: 'add', label: 'product.restock', href: '/restock', show: manage },
    { icon: 'chart', label: 'money.salesReport', href: '/reports/sales', show: true },
    { icon: 'credit', label: 'money.credits', href: '/reports/credits', show: true },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text variant="title" accessibilityRole="header">
            {t('home.greeting', { name: user.name.split(' ')[0] })}
          </Text>
          <Text variant="caption" color={colors.inkMuted}>
            {shop.name} · {t(`roles.${user.role}`)}
          </Text>
        </View>

        <PlanBanner />

        {showStart ? (
          <Card style={styles.start}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="heading">{t('home.startTitle')}</Text>
                <Text variant="caption" color={colors.inkMuted}>
                  {t('home.startLead')}
                </Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setHideStart(true)} hitSlop={10}>
                <Text variant="label" color={colors.inkMuted}>
                  {t('home.hide')}
                </Text>
              </Pressable>
            </View>
            {steps.map((s) => (
              <Pressable key={s.label} accessibilityRole="button" onPress={() => router.push(s.href)} style={styles.step}>
                <View style={[styles.stepDot, s.done && styles.stepDone]}>{s.done ? <Icon name="check" size={14} color={colors.success} /> : null}</View>
                <Text variant="body" color={s.done ? colors.inkMuted : colors.ink} style={[styles.flex, s.done && styles.strike]}>
                  {t(s.label)}
                </Text>
                {!s.done ? <Icon name="chevronRight" size={16} color={colors.inkSubtle} /> : null}
              </Pressable>
            ))}
          </Card>
        ) : null}

        {low > 0 ? (
          <Banner
            tone="warning"
            icon="warning"
            message={t('home.lowStock', { count: low })}
            action={{ label: t('home.lowStockAction'), onPress: () => router.push({ pathname: '/stock-count', params: { tab: 'reorder' } }) }}
          />
        ) : null}

        {/* Today */}
        <Card style={styles.hero}>
          <Text variant="overline" color={colors.brandStrong}>
            {t('home.today').toUpperCase()}
          </Text>
          <Text variant="display">{formatTsh(todaySales.revenue)}</Text>
          <Text variant="caption" color={colors.inkMuted}>
            {t('home.revenue')} · {t('home.salesCount')}: {todaySales.count}
          </Text>
        </Card>
        <View style={styles.grid}>
          <StatTile label={t('home.profit')} value={formatTsh(todaySales.profit)} icon="chart" tone="success" hint={t('home.profitHint')} />
          <StatTile label={t('home.netProfit')} value={formatTsh(todayNet)} icon="wallet" tone={todayNet >= 0 ? 'success' : 'danger'} hint={t('home.netHint')} />
        </View>
        <View style={styles.grid}>
          <StatTile label={t('home.purchaseCost')} value={formatTsh(todayBought)} icon="purchases" tone="neutral" />
          <Pressable style={styles.flex} onPress={() => router.push('/reports/finances')} accessibilityRole="button">
            <StatTile label={t('home.cash')} value={formatTsh(cash)} icon="cash" tone="brand" />
          </Pressable>
        </View>

        {/* Last 7 days */}
        <Card style={styles.chartCard}>
          <Text variant="label">{t('home.last7')}</Text>
          <View style={styles.chart} accessibilityLabel={`${t('home.last7')}: ${perDay.map((v) => formatNumber(v)).join(', ')}`}>
            {perDay.map((v, i) => (
              <View key={days[i]} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: `${Math.max(4, (v / max) * 100)}%`, backgroundColor: i === perDay.length - 1 ? colors.brand : colors.brandSoft }]} />
                </View>
                <Text variant="caption" color={colors.inkMuted}>
                  {workdayDate(days[i]).getDate()}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Quick actions */}
        <Text variant="overline" color={colors.inkMuted}>
          {t('home.quick').toUpperCase()}
        </Text>
        <View style={styles.actions}>
          {actions
            .filter((a) => a.show)
            .map((a) => (
              <Pressable key={a.label} accessibilityRole="button" onPress={() => router.push(a.href)} style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}>
                <View style={styles.actionIcon}>
                  <Icon name={a.icon} size={22} color={colors.brandStrong} />
                </View>
                <Text variant="caption" align="center" numberOfLines={2}>
                  {t(a.label)}
                </Text>
              </Pressable>
            ))}
        </View>

        {/* All time */}
        <Text variant="overline" color={colors.inkMuted}>
          {t('home.totals').toUpperCase()}
        </Text>
        <View style={styles.grid}>
          <StatTile label={t('home.revenue')} value={formatTsh(all.revenue)} />
          <StatTile label={t('home.profit')} value={formatTsh(all.profit)} tone="success" />
        </View>
        <View style={styles.grid}>
          <StatTile label={t('home.cogs')} value={formatTsh(all.cost)} />
          <StatTile label={t('home.netProfit')} value={formatTsh(allNet)} tone={allNet >= 0 ? 'success' : 'danger'} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    padding: space.xl,
    paddingTop: space.sm,
    gap: space.md,
    paddingBottom: space.xxxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  start: {
    gap: space.sm,
    borderColor: colors.brand,
    borderWidth: 2,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 40,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  strike: { textDecorationLine: 'line-through' },
  hero: {
    gap: space.xs,
    backgroundColor: colors.brandTint,
    borderColor: colors.brandSoft,
  },
  grid: {
    flexDirection: 'row',
    gap: space.md,
  },
  chartCard: { gap: space.md },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    height: 120,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    height: '100%',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: radius.sm / 2,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
