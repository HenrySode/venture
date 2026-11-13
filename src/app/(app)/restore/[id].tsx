import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ConfirmCodeDialog, Divider, EmptyState, Icon, RadioCard, Screen, Text, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate, formatNumber, formatTime } from '@/lib/format';
import { mockRequest } from '@/services/client';
import { useData } from '@/state/data';
import { useToast } from '@/state/toast';
import { colors, space } from '@/theme';
import type { RestoreScope } from '@/types/domain';

type Row = 'products' | 'sales' | 'credits' | 'payments' | 'purchases' | 'suppliers' | 'orders' | 'ledger';

const scopes: RestoreScope[] = ['all', 'products', 'sales', 'purchases'];

const rowsFor: Record<RestoreScope, Row[]> = {
  products: ['products'],
  sales: ['sales', 'credits', 'payments'],
  purchases: ['purchases', 'suppliers', 'orders'],
  all: ['products', 'sales', 'credits', 'payments', 'purchases', 'suppliers', 'orders', 'ledger'],
};

/** Admin: choose what to bring back from a backup, see what changes, then confirm with the code. */
export default function RestoreScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const backup = data.backups.find((b) => String(b.id) === id);

  const [scope, setScope] = useState<RestoreScope>('all');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!backup) {
    return (
      <Screen header={<TopBar title={t('backup.previewTitle')} />}>
        <EmptyState icon="restore" title={t('backup.notFound')} />
      </Screen>
    );
  }

  const date = `${formatDate(backup.createdAt, locale)} · ${formatTime(backup.createdAt)}`;

  const restore = async () => {
    setConfirming(false);
    setBusy(true);
    await mockRequest(() => data.restoreBackup(backup.id, scope), 900).catch(() => undefined);
    toast({ message: t('backup.restored'), icon: 'check' });
    router.back();
  };

  return (
    <Screen
      header={<TopBar title={t('backup.previewTitle')} />}
      footer={<Button label={t('backup.restore')} icon="restore" variant="danger" size="lg" loading={busy} onPress={() => setConfirming(true)} block />}>
      <Text variant="body" color={colors.inkMuted}>
        {t('backup.from', { date })}
      </Text>

      <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={t('backup.what')}>
        <Text variant="label">{t('backup.what')}</Text>
        {scopes.map((s) => (
          <RadioCard key={s} title={t(`backup.scopes.${s}`)} subtitle={t(`backup.scopeHints.${s}`)} selected={s === scope} onPress={() => setScope(s)} />
        ))}
      </View>

      {/* Dry run: how each list changes */}
      <Text variant="overline" color={colors.inkMuted}>
        {t('backup.dryRun').toUpperCase()}
      </Text>
      <Card padded={false} style={styles.clip}>
        <View style={[styles.row, styles.headRow]}>
          <Text variant="caption" color={colors.inkMuted} style={styles.flex} />
          <Text variant="caption" color={colors.inkMuted} style={styles.num}>
            {t('backup.now')}
          </Text>
          <View style={styles.arrow} />
          <Text variant="caption" color={colors.inkMuted} style={styles.num}>
            {t('backup.after')}
          </Text>
        </View>
        {rowsFor[scope].map((r) => {
          const now = data[r].length;
          const after = backup[r].length;
          const changed = now !== after;
          return (
            <View key={r}>
              <Divider />
              <View style={styles.row}>
                <Text variant="body" style={styles.flex}>
                  {t(`backup.rows.${r}`)}
                </Text>
                <Text variant="body" color={colors.inkMuted} style={styles.num}>
                  {formatNumber(now)}
                </Text>
                <View style={styles.arrow}>
                  <Icon name="chevronRight" size={16} color={colors.inkSubtle} />
                </View>
                <Text variant="bodyStrong" color={changed ? colors.warning : colors.ink} style={styles.num}>
                  {formatNumber(after)}
                </Text>
              </View>
            </View>
          );
        })}
      </Card>

      <ConfirmCodeDialog
        visible={confirming}
        title={t('backup.restoreConfirm', { scope: t(`backup.scopes.${scope}`).toLowerCase() })}
        message={t('backup.restoreMessage', { date })}
        confirmLabel={t('backup.restore')}
        codeLabel={t('backup.codeLabel')}
        mismatchLabel={t('backup.codeMismatch')}
        onConfirm={restore}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  clip: { overflow: 'hidden' },
  group: {
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  headRow: {
    paddingVertical: space.sm,
  },
  num: {
    width: 56,
    textAlign: 'right',
  },
  arrow: {
    width: 20,
    alignItems: 'center',
  },
});
