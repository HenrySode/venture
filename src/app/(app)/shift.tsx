import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, Card, Divider, Icon, Screen, Text, TextField, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatNumber, formatTime, formatTsh } from '@/lib/format';
import { isBusinessHours, workdayKey } from '@/lib/workday';
import { mockRequest } from '@/services/client';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { colors, radius, space } from '@/theme';

/** Seller's day: open since 05:00 → count the cash → close the books with the variance. */
export default function ShiftScreen() {
  const t = useT();
  const { user } = useCurrentSession();
  const { sales, payments, closures, closeBooks, reopenBooks } = useData();

  const today = workdayKey();
  const closure = closures.find((c) => c.workday === today && c.sellerId === user.id);
  const cashSales = sales
    .filter((s) => s.sellerId === user.id && !s.fromCredit && workdayKey(s.createdAt) === today)
    .reduce((sum, s) => sum + s.total, 0);
  const creditPayments = payments
    .filter((p) => p.receivedById === user.id && workdayKey(p.createdAt) === today)
    .reduce((sum, p) => sum + p.amount, 0);
  const expected = cashSales + creditPayments;

  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const countedValue = counted ? Number(counted.replace(/[^\d]/g, '')) : null;
  const open = isBusinessHours();

  const submit = async () => {
    if (countedValue === null) {
      setError(t('shift.countedRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await mockRequest(() => closeBooks({ workday: today, sellerId: user.id, expected, counted: countedValue, notes: notes.trim() }), 600);
      setCounted('');
      setNotes('');
    } catch (e) {
      setError(errorMessage(t, e, {}));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<TopBar title={t('shift.title')} />}
      footer={
        closure ? (
          <Button label={t('shift.reopen')} variant="ghost" icon="restore" onPress={() => reopenBooks(today, user.id)} block />
        ) : (
          <Button label={t('shift.confirm')} loadingLabel={t('shift.closing')} loading={busy} size="lg" icon="book" onPress={submit} block />
        )
      }>
      {/* Status */}
      <Card style={styles.status}>
        <View style={[styles.statusIcon, { backgroundColor: closure ? colors.successSoft : open ? colors.brandTint : colors.surfaceMuted }]}>
          <Icon name={closure ? 'check' : open ? 'clock' : 'hourglass'} size={22} color={closure ? colors.success : open ? colors.brandStrong : colors.inkMuted} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{closure ? t('shift.closed') : open ? t('shift.openSince', { time: '05:00' }) : t('shift.outside')}</Text>
          <Text variant="caption" color={colors.inkMuted}>
            {closure ? t('shift.closedAt', { time: formatTime(closure.closedAt) }) : t('shift.outsideBody')}
          </Text>
        </View>
      </Card>

      {/* Expected */}
      <Card style={styles.block}>
        <Text variant="label" color={colors.inkMuted}>
          {t('shift.expected')}
        </Text>
        <Text variant="display">{formatTsh(closure?.expected ?? expected)}</Text>
        <Text variant="caption" color={colors.inkMuted}>
          {t('shift.expectedHint')}
        </Text>
        <Divider style={styles.divider} />
        <Row label={t('shift.cashSales')} value={formatTsh(cashSales)} />
        <Row label={t('shift.creditPayments')} value={formatTsh(creditPayments)} />
      </Card>

      {closure ? (
        <Card style={styles.block}>
          <Row label={t('shift.counted')} value={formatTsh(closure.counted)} strong />
          <Variance diff={closure.counted - closure.expected} />
          {closure.notes ? (
            <>
              <Divider style={styles.divider} />
              <Text variant="caption" color={colors.inkMuted}>
                {t('shift.notes')}
              </Text>
              <Text variant="body">{closure.notes}</Text>
            </>
          ) : null}
        </Card>
      ) : (
        <>
          {error ? <Banner tone="danger" message={error} /> : null}
          <TextField
            label={t('shift.counted')}
            icon="cash"
            value={counted}
            onChangeText={(v) => {
              setCounted(v.replace(/[^\d]/g, '') ? formatNumber(Number(v.replace(/[^\d]/g, ''))) : '');
              setError(null);
            }}
            keyboardType="number-pad"
            placeholder={formatNumber(expected)}
          />
          {countedValue !== null ? <Variance diff={countedValue - expected} /> : null}
          <TextField label={`${t('shift.notes')} · ${t('common.optional')}`} value={notes} onChangeText={setNotes} placeholder={t('shift.notesPlaceholder')} multiline />
        </>
      )}
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant={strong ? 'bodyStrong' : 'body'} color={strong ? colors.ink : colors.inkMuted} style={styles.flex}>
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

function Variance({ diff }: { diff: number }) {
  const t = useT();
  const tone = diff === 0 ? 'success' : diff > 0 ? 'info' : 'danger';
  const message = diff === 0 ? t('shift.exact') : diff > 0 ? t('shift.over', { amount: formatTsh(diff) }) : t('shift.short', { amount: formatTsh(-diff) });
  return <Banner tone={tone} title={t('shift.variance')} message={message} icon={diff === 0 ? 'check' : 'warning'} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: {
    gap: space.xs,
  },
  divider: {
    marginVertical: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.xxs,
  },
});
