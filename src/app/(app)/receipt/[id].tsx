import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Divider, EmptyState, Icon, Screen, Text, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate, formatQty, formatTime, formatTsh } from '@/lib/format';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, radius, space } from '@/theme';

/** Receipt for one basket sale. Print is a stub (PRD §2 non-goals). */
export default function ReceiptScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shop } = useCurrentSession();
  const { sales } = useData();
  const lines = sales.filter((s) => s.receiptId === id);
  const total = lines.reduce((sum, s) => sum + s.total, 0);
  const first = lines[0];

  return (
    <Screen
      header={<TopBar title={t('receipt.title')} onBack={null} right={<Button label={t('common.done')} variant="ghost" onPress={() => router.back()} />} />}
      footer={
        first ? (
          <View style={styles.actions}>
            <Button label={t('receipt.print')} variant="secondary" icon="print" onPress={() => toast({ message: t('receipt.printSoon'), tone: 'info', icon: 'print' })} style={styles.flex} />
            <Button label={t('receipt.newSale')} icon="sell" onPress={() => router.back()} style={styles.flex} />
          </View>
        ) : null
      }>
      {!first ? (
        <EmptyState icon="receipt" title={t('receipt.notFound')} />
      ) : (
        <>
          <View style={styles.done}>
            <View style={styles.doneIcon}>
              <Icon name="check" size={32} color={colors.success} />
            </View>
            <Text variant="title" align="center">
              {t('receipt.done')}
            </Text>
            <Text variant="display" align="center">
              {formatTsh(total)}
            </Text>
          </View>

          <Card style={styles.receipt}>
            <View style={styles.center}>
              <Text variant="heading" align="center">
                {shop.name}
              </Text>
              <Text variant="caption" color={colors.inkMuted} align="center">
                {shop.place}
              </Text>
            </View>
            <Divider style={styles.dashed} />
            <Meta label={t('receipt.number', { id: '' }).trim()} value={id} />
            <Meta label={t('receipt.date')} value={`${formatDate(first.createdAt, locale)} · ${formatTime(first.createdAt)}`} />
            <Meta label={t('receipt.seller')} value={first.sellerName} />
            <Divider style={styles.dashed} />
            {lines.map((s) => (
              <View key={s.id} style={styles.line}>
                <View style={styles.flex}>
                  <Text variant="label">{s.productName}</Text>
                  <Text variant="caption" color={colors.inkMuted}>
                    {formatQty(s.quantity)} × {formatTsh(s.price)} · {t(s.kind === 'carton' ? 'sell.carton' : 'sell.unit')}
                  </Text>
                </View>
                <Text variant="label">{formatTsh(s.total)}</Text>
              </View>
            ))}
            <Divider style={styles.dashed} />
            <View style={styles.line}>
              <Text variant="heading" style={styles.flex}>
                {t('basket.total')}
              </Text>
              <Text variant="heading">{formatTsh(total)}</Text>
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text variant="caption" color={colors.inkMuted} style={styles.flex}>
        {label}
      </Text>
      <Text variant="caption">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { gap: 2 },
  done: {
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
  },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  receipt: {
    gap: space.md,
  },
  dashed: {
    marginVertical: space.xs,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
});
