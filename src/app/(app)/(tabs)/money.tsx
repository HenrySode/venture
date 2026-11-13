import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanBanner, UpgradeSheet } from '@/components/access';
import { Card, Divider, Icon, ListRow, StatTile, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { cashOnHand } from '@/lib/cash';
import { debtors } from '@/lib/credits';
import { formatTsh } from '@/lib/format';
import { summarize } from '@/lib/money';
import { workdayKey } from '@/lib/workday';
import { planAccess } from '@/state/access';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { colors, space } from '@/theme';

/** Money hub: today's numbers, cash on hand, and the four reports. */
export default function MoneyScreen() {
  const t = useT();
  const router = useRouter();
  const session = useCurrentSession();
  const access = planAccess(session);
  const data = useData();
  const [upgrade, setUpgrade] = useState(false);

  const today = summarize(data.sales.filter((s) => workdayKey(s.createdAt) === workdayKey()));
  const cash = cashOnHand(data);
  const owed = debtors(data.credits).reduce((s, d) => s + d.owed, 0);
  const reports = access.hasModule('reports');

  const open = (path: '/reports/sales' | '/reports/profits' | '/reports/finances' | '/reports/credits', module: 'reports' | 'credit' = 'reports') => () =>
    access.hasModule(module) ? router.push(path) : setUpgrade(true);
  const lock = (ok: boolean) => (ok ? undefined : <Icon name="lock" size={16} color={colors.inkSubtle} />);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title" accessibilityRole="header">
          {t('money.title')}
        </Text>
        <PlanBanner />

        <Card style={styles.cash}>
          <Text variant="label" color={colors.inkMuted}>
            {t('home.cash')}
          </Text>
          <Text variant="display">{formatTsh(cash)}</Text>
        </Card>
        <View style={styles.grid}>
          <StatTile label={`${t('home.today')} · ${t('home.revenue')}`} value={formatTsh(today.revenue)} icon="money" tone="brand" />
          <StatTile label={`${t('home.today')} · ${t('home.profit')}`} value={formatTsh(today.profit)} icon="chart" tone="success" />
        </View>

        <Card padded={false} style={styles.clip}>
          <ListRow icon="receipt" title={t('money.salesReport')} subtitle={t('money.salesReportHint')} trailing={lock(reports)} onPress={open('/reports/sales')} />
          <Divider />
          <ListRow icon="chart" title={t('money.profits')} subtitle={t('money.profitsHint')} trailing={lock(reports)} onPress={open('/reports/profits')} />
          <Divider />
          <ListRow icon="wallet" title={t('money.finances')} subtitle={t('money.financesHint')} trailing={lock(reports)} onPress={open('/reports/finances')} />
          <Divider />
          <ListRow
            icon="credit"
            title={t('money.credits')}
            subtitle={t('money.creditsHint', { amount: formatTsh(owed) })}
            trailing={lock(access.hasModule('credit'))}
            onPress={open('/reports/credits', 'credit')}
          />
        </Card>
      </ScrollView>
      <UpgradeSheet visible={upgrade} onClose={() => setUpgrade(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: space.xl,
    paddingTop: space.sm,
    gap: space.md,
  },
  cash: {
    gap: space.xs,
    backgroundColor: colors.brandTint,
    borderColor: colors.brandSoft,
  },
  grid: {
    flexDirection: 'row',
    gap: space.md,
  },
  clip: { overflow: 'hidden' },
});
