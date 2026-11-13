import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { Button, Card, ConfirmCodeDialog, Divider, Icon, Screen, Text, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate, formatNumber, formatTime } from '@/lib/format';
import { mockRequest } from '@/services/client';
import { useData, type ResetScope } from '@/state/data';
import { useToast } from '@/state/toast';
import { colors, radius, space } from '@/theme';
import type { Backup } from '@/types/domain';

/** Admin: save a backup, restore one, or reset the shop's data (each reset guarded by a code). */
export default function ResetRestoreScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { backups, createBackup, resetData } = useData();
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState<ResetScope | null>(null);

  const list = [...backups].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const last = list[0];
  const when = (b: Backup) => `${formatDate(b.createdAt, locale)} · ${formatTime(b.createdAt)}`;

  const backupNow = async () => {
    setSaving(true);
    const backup = await mockRequest(() => createBackup(), 700).catch(() => null);
    setSaving(false);
    if (!backup) return;
    toast({ message: t('backup.saved'), icon: 'check' });
    Share.share({ title: t('backup.shareTitle'), message: JSON.stringify(backup) }).catch(() => undefined);
  };

  const confirmReset = () => {
    if (!resetting) return;
    resetData(resetting);
    setResetting(null);
    toast({ message: t('backup.resetDone'), icon: 'undo' });
  };

  return (
    <Screen header={<TopBar title={t('backup.title')} />}>
      {/* Backup */}
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={styles.icon}>
            <Icon name="sync" size={20} color={colors.brandStrong} />
          </View>
          <View style={styles.flex}>
            <Text variant="heading">{t('backup.backupTitle')}</Text>
            <Text variant="caption" color={colors.inkMuted}>
              {last ? t('backup.lastBackup', { date: when(last) }) : t('backup.noBackup')}
            </Text>
          </View>
        </View>
        <Text variant="body" color={colors.inkMuted}>
          {t('backup.backupBody')}
        </Text>
        <Button label={t('backup.download')} icon="share" loading={saving} onPress={backupNow} block />
      </Card>

      {/* Restore */}
      {list.length ? (
        <>
          <Text variant="overline" color={colors.inkMuted}>
            {t('backup.restoreTitle').toUpperCase()}
          </Text>
          <Text variant="caption" color={colors.inkMuted}>
            {t('backup.restoreBody')}
          </Text>
          <Card padded={false} style={styles.clip}>
            {list.map((b, i) => (
              <View key={b.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/restore/[id]', params: { id: String(b.id) } })}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
                  <Icon name="restore" size={20} color={colors.inkMuted} />
                  <View style={styles.flex}>
                    <Text variant="bodyStrong">{when(b)}</Text>
                    <Text variant="caption" color={colors.inkMuted}>
                      {t('backup.summary', { products: formatNumber(b.products.length), sales: formatNumber(b.sales.length) })}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={18} color={colors.inkSubtle} />
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {/* Start over */}
      <Text variant="overline" color={colors.danger}>
        {t('backup.dangerTitle').toUpperCase()}
      </Text>
      <Card style={[styles.card, styles.danger]}>
        <DangerRow title={t('backup.resetSales')} body={t('backup.resetSalesBody')} onPress={() => setResetting('salesPurchases')} />
        <Divider />
        <DangerRow title={t('backup.resetAll')} body={t('backup.resetAllBody')} onPress={() => setResetting('all')} />
      </Card>

      <ConfirmCodeDialog
        visible={resetting !== null}
        title={resetting === 'all' ? t('backup.resetAll') : t('backup.resetSales')}
        message={`${resetting === 'all' ? t('backup.resetAllBody') : t('backup.resetSalesBody')} ${t('backup.backupFirst')}`}
        confirmLabel={t('backup.confirmReset')}
        codeLabel={t('backup.codeLabel')}
        mismatchLabel={t('backup.codeMismatch')}
        onConfirm={confirmReset}
        onCancel={() => setResetting(null)}
      />
    </Screen>
  );
}

function DangerRow({ title, body, onPress }: { title: string; body: string; onPress: () => void }) {
  return (
    <View style={styles.dangerRow}>
      <Text variant="bodyStrong">{title}</Text>
      <Text variant="caption" color={colors.inkMuted}>
        {body}
      </Text>
      <Button label={title} icon="trash" variant="danger" onPress={onPress} style={styles.dangerBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  clip: { overflow: 'hidden' },
  card: {
    gap: space.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  danger: {
    borderColor: colors.danger + '40',
  },
  dangerRow: {
    gap: space.xs,
  },
  dangerBtn: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
  },
});
