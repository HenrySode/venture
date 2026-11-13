import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Banner, Button, Card, Divider, EmptyState, Icon, Screen, SegmentedControl, Sheet, Text, TextField, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { isLineOpen, lineOwed, type PaymentResult } from '@/lib/credits';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatNumber, formatQty, formatTime, formatTsh, initials } from '@/lib/format';
import { mockRequest } from '@/services/client';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, radius, space } from '@/theme';
import type { CreditLine } from '@/types/domain';

type PayMode = 'full' | 'part';

/** One customer's credit: items (oldest first), payments, receive payment, sell more. */
export default function CreditorScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { user } = useCurrentSession();
  const { key = '' } = useLocalSearchParams<{ key: string }>();
  const { credits, payments, payCredit, removeCreditLine } = useData();

  const lines = credits.filter((l) => l.customerKey === key).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const history = payments.filter((p) => p.customerKey === key).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const owed = lines.reduce((s, l) => s + lineOwed(l), 0);
  // Supervisors view reports only; they don't take payments or change credit.
  const canAct = user.role !== 'supervisor';
  const first = lines[0];

  const [payOpen, setPayOpen] = useState(false);
  const [mode, setMode] = useState<PayMode>('full');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [removing, setRemoving] = useState<CreditLine | null>(null);

  if (!first) {
    return (
      <Screen header={<TopBar />}>
        <EmptyState icon="credit" title={t('madeni.notFound')} />
      </Screen>
    );
  }

  const openPay = () => {
    setMode('full');
    setAmount('');
    setAmountError(null);
    setPayOpen(true);
  };

  const payValue = mode === 'full' ? owed : Number(amount.replace(/[^\d]/g, ''));

  const pay = async () => {
    if (!(payValue > 0 && payValue <= owed)) {
      setAmountError(t('madeni.amountInvalid', { max: formatTsh(owed) }));
      return;
    }
    setPaying(true);
    try {
      const r = await mockRequest(() => payCredit(key, payValue, user), 500);
      setResult(r);
      setPayOpen(false);
      toast({ message: t('madeni.received', { amount: formatTsh(r.applied) }), icon: 'cash' });
    } catch (e) {
      setAmountError(errorMessage(t, e, {}));
    } finally {
      setPaying(false);
    }
  };

  const confirmRemove = () => {
    if (!removing) return;
    removeCreditLine(removing.id);
    setRemoving(null);
    setResult(null);
    toast({ message: t('madeni.removed'), icon: 'undo' });
  };

  return (
    <Screen
      header={<TopBar title={first.customerName} />}
      footer={
        canAct ? (
        <View style={styles.actions}>
          <Button label={t('madeni.sellMore')} variant="secondary" icon="add" onPress={() => router.push({ pathname: '/credit-sale', params: { customer: key } })} style={styles.flex} />
          <Button label={t('madeni.receivePayment')} icon="cash" disabled={owed === 0} onPress={openPay} style={styles.flex} />
        </View>
        ) : null
      }>
      {/* Summary */}
      <Card style={styles.summary}>
        <View style={styles.avatar}>
          <Text variant="heading">{initials(first.customerName)}</Text>
        </View>
        <View style={styles.flex}>
          <Text variant="caption" color={colors.inkMuted}>
            {owed ? t('madeni.owes') : t('madeni.settled')}
          </Text>
          <Text variant="title" color={owed ? colors.danger : colors.success}>
            {formatTsh(owed)}
          </Text>
          {first.customerPhone ? (
            <Text variant="caption" color={colors.inkMuted}>
              {first.customerPhone}
            </Text>
          ) : null}
        </View>
      </Card>

      {result ? <PaymentBanner result={result} name={first.customerName} owedNow={owed} /> : null}

      {/* Items */}
      <Text variant="overline" color={colors.inkMuted}>
        {t('madeni.itemsTitle').toUpperCase()}
      </Text>
      <Card padded={false} style={styles.clip}>
        {lines.map((l, i) => {
          const open = isLineOpen(l);
          return (
            <View key={l.id}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.line}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {l.productName}
                  </Text>
                  <Text variant="caption" color={colors.inkMuted}>
                    {formatQty(l.quantity)} × {t(l.kind === 'carton' ? 'sell.carton' : 'sell.unit')} · {formatDate(l.createdAt, locale)}
                  </Text>
                  {open && l.paid > 0 ? (
                    <Text variant="caption" color={colors.warning}>
                      {t('madeni.paidOf', { paid: formatNumber(l.paid), total: formatNumber(l.total) })}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.lineRight}>
                  <Text variant="bodyStrong">{formatTsh(l.total)}</Text>
                  <Badge label={open ? t('madeni.open') : t('madeni.paid')} tone={open ? 'warning' : 'success'} />
                </View>
                {canAct && open && l.paid === 0 ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={t('madeni.remove')} hitSlop={10} onPress={() => setRemoving(l)} style={styles.trash}>
                    <Icon name="trash" size={18} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>

      {/* Payments */}
      <Text variant="overline" color={colors.inkMuted}>
        {t('madeni.paymentsTitle').toUpperCase()}
      </Text>
      <Card padded={false} style={styles.clip}>
        {history.length === 0 ? (
          <Text variant="body" color={colors.inkMuted} style={styles.none}>
            {t('madeni.noPayments')}
          </Text>
        ) : (
          history.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.line}>
                <Icon name="cash" size={20} color={colors.success} />
                <Text variant="body" style={styles.flex}>
                  {formatDate(p.createdAt, locale)} · {formatTime(p.createdAt)}
                </Text>
                <Text variant="bodyStrong" color={colors.success}>
                  {formatTsh(p.amount)}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Receive payment */}
      <Sheet visible={payOpen} onClose={() => setPayOpen(false)} title={t('madeni.receivePayment')}>
        <SegmentedControl<PayMode>
          value={mode}
          onChange={(m) => {
            setMode(m);
            setAmountError(null);
          }}
          options={[
            { value: 'full', label: `${t('madeni.payFull')} · ${formatNumber(owed)}` },
            { value: 'part', label: t('madeni.payPartial') },
          ]}
        />
        {mode === 'part' ? (
          <TextField
            label={t('madeni.amount')}
            icon="cash"
            value={amount}
            onChangeText={(v) => {
              setAmount(v);
              setAmountError(null);
            }}
            keyboardType="number-pad"
            placeholder={formatNumber(Math.round(owed / 2))}
            error={amountError}
            autoFocus
          />
        ) : amountError ? (
          <Banner tone="danger" message={amountError} />
        ) : null}
        <Button
          label={t('madeni.confirmPay', { amount: formatTsh(payValue || 0) })}
          size="lg"
          loading={paying}
          onPress={pay}
          block
        />
      </Sheet>

      {/* Remove line */}
      <Sheet visible={removing !== null} onClose={() => setRemoving(null)} title={t('madeni.removeTitle')}>
        {removing ? (
          <Text variant="body" color={colors.inkMuted}>
            {t('madeni.removeBody', { qty: formatQty(removing.quantity), name: removing.productName, amount: formatTsh(removing.total) })}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button label={t('common.cancel')} variant="secondary" onPress={() => setRemoving(null)} style={styles.flex} />
          <Button label={t('madeni.remove')} variant="danger" onPress={confirmRemove} style={styles.flex} />
        </View>
      </Sheet>
    </Screen>
  );
}

function PaymentBanner({ result, name, owedNow }: { result: PaymentResult; name: string; owedNow: number }) {
  const { t } = useI18n();
  if (owedNow === 0) return <Banner tone="success" message={t('madeni.paidAll', { name })} />;
  const parts = [t('madeni.received', { amount: formatTsh(result.applied) })];
  if (result.cleared) parts.push(t('madeni.clearedItems', { count: result.cleared }));
  if (result.heldBack) parts.push(t('madeni.heldBack', { amount: formatTsh(result.heldBack) }));
  return <Banner tone={result.heldBack ? 'warning' : 'success'} icon={result.heldBack ? 'hourglass' : 'check'} message={parts.join(' ')} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  clip: { overflow: 'hidden' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  lineRight: {
    alignItems: 'flex-end',
    gap: space.xs,
  },
  trash: {
    padding: space.xs,
  },
  none: {
    padding: space.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
});
