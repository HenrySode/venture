import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PeriodPicker } from '@/components/money/period-picker';
import { Banner, Button, Card, Divider, Icon, SegmentedControl, Sheet, StatTile, Text, TextField, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cashOnHand } from '@/lib/cash';
import { formatDate, formatNumber, formatTime, formatTsh } from '@/lib/format';
import { bucketKey, bucketLabel, inPeriod, type Bucket, type Period } from '@/lib/periods';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, radius, space } from '@/theme';
import type { LedgerEntry } from '@/types/domain';

type Totals = { sales: number; other: number; purchases: number; expenses: number };
const zero = (): Totals => ({ sales: 0, other: 0, purchases: 0, expenses: 0 });
const cashIn = (x: Totals) => x.sales + x.other;
const cashOut = (x: Totals) => x.purchases + x.expenses;

/** Cash on hand, money in/out for a period, a bucketed ledger, and other revenue/expense entries. */
export default function FinancesScreen() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { user } = useCurrentSession();
  const isAdmin = user.role === 'admin';
  const data = useData();
  const { sales, purchases, ledger, cashSet, addEntry, deleteEntry, setCash, recalculateCash } = data;

  const [period, setPeriod] = useState<Period>({ kind: 'month' });
  const [bucket, setBucket] = useState<Bucket>('day');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'entry' | 'balance' | 'recalc' | null>(null);

  const cash = cashOnHand(data);

  // Totals per bucket inside the period.
  const buckets = new Map<string, Totals>();
  const add = (iso: string, key: keyof Totals, amount: number) => {
    if (!inPeriod(iso, period)) return;
    const k = bucketKey(iso, bucket);
    const row = buckets.get(k) ?? zero();
    row[key] += amount;
    buckets.set(k, row);
  };
  sales.forEach((s) => add(s.createdAt, 'sales', s.total));
  purchases.forEach((p) => add(p.createdAt, 'purchases', p.cost));
  ledger.forEach((e) => add(e.createdAt, e.kind === 'revenue' ? 'other' : 'expenses', e.amount));
  const rows = [...buckets.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const total = rows.reduce((acc, [, r]) => ({ sales: acc.sales + r.sales, other: acc.other + r.other, purchases: acc.purchases + r.purchases, expenses: acc.expenses + r.expenses }), zero());
  const net = cashIn(total) - cashOut(total);

  const entries = ledger.filter((e) => inPeriod(e.createdAt, period)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <SafeAreaView style={styles.root}>
      <TopBar title={t('money.finances')} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Cash on hand */}
        <Card style={styles.cash}>
          <Text variant="label" color={colors.inkMuted}>
            {t('home.cash')}
          </Text>
          <Text variant="display">{formatTsh(cash)}</Text>
          <Text variant="caption" color={colors.inkMuted}>
            {cashSet ? t('finances.setOn', { date: `${formatDate(cashSet.at, locale)} ${formatTime(cashSet.at)}` }) : t('finances.fromHistory')}
          </Text>
          {isAdmin ? (
            <View style={styles.actions}>
              <Button label={t('finances.setBalance')} variant="secondary" icon="cash" onPress={() => setSheet('balance')} style={styles.flex} />
              {cashSet ? <Button label={t('finances.recalculate')} variant="ghost" icon="restore" onPress={() => setSheet('recalc')} style={styles.flex} /> : null}
            </View>
          ) : null}
        </Card>

        <PeriodPicker value={period} onChange={setPeriod} />

        <View style={styles.grid}>
          <StatTile label={t('finances.cashIn')} value={formatTsh(cashIn(total))} icon="add" tone="success" />
          <StatTile label={t('finances.cashOut')} value={formatTsh(cashOut(total))} icon="minus" tone="danger" />
        </View>
        <Card style={styles.netCard}>
          <Text variant="bodyStrong" style={styles.flex}>
            {t('finances.net')}
          </Text>
          <Text variant="title" color={net >= 0 ? colors.success : colors.danger}>
            {formatTsh(net)}
          </Text>
        </Card>

        {/* Ledger */}
        <View style={styles.sectionHead}>
          <Text variant="overline" color={colors.inkMuted} style={styles.flex}>
            {t('finances.ledger').toUpperCase()}
          </Text>
          <View style={styles.bucketToggle}>
            <SegmentedControl<Bucket>
              value={bucket}
              onChange={(b) => {
                setBucket(b);
                setExpanded(null);
              }}
              options={[
                { value: 'day', label: t('purchases.groupDay') },
                { value: 'week', label: t('purchases.groupWeek') },
                { value: 'month', label: t('purchases.groupMonth') },
              ]}
            />
          </View>
        </View>
        <Card padded={false} style={styles.clip}>
          {rows.length === 0 ? (
            <Text variant="body" color={colors.inkMuted} style={styles.none}>
              {t('report.empty')}
            </Text>
          ) : (
            rows.map(([key, r], i) => {
              const open = expanded === key;
              const rowNet = cashIn(r) - cashOut(r);
              return (
                <View key={key}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setExpanded(open ? null : key)}
                    style={({ pressed }) => [styles.ledgerRow, pressed && { backgroundColor: colors.surfaceMuted }]}>
                    <View style={styles.flex}>
                      <Text variant="label">{bucketLabel(key, bucket, locale, (date) => t('purchases.weekOf', { date }))}</Text>
                      <Text variant="caption" color={colors.inkMuted}>
                        +{formatNumber(cashIn(r))} · −{formatNumber(cashOut(r))}
                      </Text>
                    </View>
                    <Text variant="bodyStrong" color={rowNet >= 0 ? colors.success : colors.danger}>
                      {formatTsh(rowNet)}
                    </Text>
                    <Icon name={open ? 'close' : 'chevronRight'} size={14} color={colors.inkSubtle} />
                  </Pressable>
                  {open ? (
                    <View style={styles.breakdown}>
                      <Line label={t('finances.salesIn')} value={r.sales} sign="+" />
                      <Line label={t('finances.otherIn')} value={r.other} sign="+" />
                      <Line label={t('finances.purchasesOut')} value={r.purchases} sign="−" />
                      <Line label={t('finances.expensesOut')} value={r.expenses} sign="−" />
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </Card>

        {/* Other revenue & expenses */}
        <View style={styles.sectionHead}>
          <Text variant="overline" color={colors.inkMuted} style={styles.flex}>
            {t('finances.entries').toUpperCase()}
          </Text>
          {isAdmin ? <Button label={t('finances.addEntry')} variant="ghost" icon="add" onPress={() => setSheet('entry')} /> : null}
        </View>
        <Card padded={false} style={styles.clip}>
          {entries.length === 0 ? (
            <Text variant="body" color={colors.inkMuted} style={styles.none}>
              {t('finances.noEntries')}
            </Text>
          ) : (
            entries.map((e, i) => (
              <View key={e.id}>
                {i > 0 ? <Divider /> : null}
                <EntryRow
                  entry={e}
                  canDelete={isAdmin}
                  onDelete={() => {
                    deleteEntry(e.id);
                    toast({ message: t('finances.deleted'), icon: 'trash' });
                  }}
                />
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      <EntrySheet
        visible={sheet === 'entry'}
        onClose={() => setSheet(null)}
        onSave={(input) => {
          addEntry(input, user);
          setSheet(null);
          toast({ message: t('finances.saved') });
        }}
      />
      <BalanceSheet
        visible={sheet === 'balance'}
        current={cash}
        onClose={() => setSheet(null)}
        onSave={(amount) => {
          setCash(amount);
          setSheet(null);
          toast({ message: t('finances.balanceSaved'), icon: 'cash' });
        }}
      />
      <Sheet visible={sheet === 'recalc'} onClose={() => setSheet(null)} title={t('finances.recalculateTitle')}>
        <Text variant="body" color={colors.inkMuted}>
          {t('finances.recalculateBody')}
        </Text>
        <View style={styles.actions}>
          <Button label={t('common.cancel')} variant="secondary" onPress={() => setSheet(null)} style={styles.flex} />
          <Button
            label={t('finances.recalculate')}
            onPress={() => {
              recalculateCash();
              setSheet(null);
              toast({ message: t('finances.recalculated'), icon: 'restore' });
            }}
            style={styles.flex}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function Line({ label, value, sign }: { label: string; value: number; sign: '+' | '−' }) {
  return (
    <View style={styles.line}>
      <Text variant="caption" color={colors.inkMuted} style={styles.flex}>
        {label}
      </Text>
      <Text variant="label" color={value === 0 ? colors.inkSubtle : sign === '+' ? colors.success : colors.danger}>
        {sign}
        {formatNumber(value)}
      </Text>
    </View>
  );
}

function EntryRow({ entry: e, canDelete, onDelete }: { entry: LedgerEntry; canDelete: boolean; onDelete: () => void }) {
  const { t, locale } = useI18n();
  const revenue = e.kind === 'revenue';
  return (
    <View style={styles.entry}>
      <View style={[styles.entryIcon, { backgroundColor: revenue ? colors.successSoft : colors.dangerSoft }]}>
        <Icon name={revenue ? 'add' : 'minus'} size={16} color={revenue ? colors.success : colors.danger} />
      </View>
      <View style={styles.flex}>
        <Text variant="label" numberOfLines={1}>
          {e.note}
        </Text>
        <Text variant="caption" color={colors.inkMuted}>
          {revenue ? t('finances.revenue') : t('finances.expense')} · {formatDate(e.createdAt, locale)}
        </Text>
      </View>
      <Text variant="bodyStrong" color={revenue ? colors.success : colors.danger}>
        {revenue ? '+' : '−'}
        {formatNumber(e.amount)}
      </Text>
      {canDelete ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('madeni.remove')} onPress={onDelete} hitSlop={10}>
          <Icon name="trash" size={18} color={colors.inkSubtle} />
        </Pressable>
      ) : null}
    </View>
  );
}

const parseAmount = (raw: string) => Number(raw.replace(/[^\d]/g, '') || '0');

function EntrySheet({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (i: { kind: LedgerEntry['kind']; amount: number; note: string }) => void }) {
  const t = useI18n().t;
  const [kind, setKind] = useState<LedgerEntry['kind']>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const value = parseAmount(amount);
    if (value <= 0) return setError(t('finances.amountInvalid'));
    if (!note.trim()) return setError(t('finances.noteRequired'));
    onSave({ kind, amount: value, note: note.trim() });
    setAmount('');
    setNote('');
    setError(null);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('finances.addEntry')}>
      <SegmentedControl<LedgerEntry['kind']>
        value={kind}
        onChange={setKind}
        options={[
          { value: 'expense', label: t('finances.expense') },
          { value: 'revenue', label: t('finances.revenue') },
        ]}
      />
      <TextField label={t('finances.amount')} icon="cash" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d]/g, '') ? formatNumber(parseAmount(v)) : '')} keyboardType="number-pad" />
      <TextField label={t('finances.note')} value={note} onChangeText={setNote} />
      {error ? <Banner tone="danger" message={error} /> : null}
      <Button label={t('common.save')} icon="check" onPress={save} block />
    </Sheet>
  );
}

function BalanceSheet({ visible, current, onClose, onSave }: { visible: boolean; current: number; onClose: () => void; onSave: (amount: number) => void }) {
  const t = useI18n().t;
  const [amount, setAmount] = useState('');
  return (
    <Sheet visible={visible} onClose={onClose} title={t('finances.setBalanceTitle')}>
      <Text variant="body" color={colors.inkMuted}>
        {t('finances.setBalanceHint')}
      </Text>
      <TextField
        label={t('finances.amount')}
        icon="cash"
        value={amount}
        onChangeText={(v) => setAmount(v.replace(/[^\d]/g, '') ? formatNumber(parseAmount(v)) : '')}
        keyboardType="number-pad"
        placeholder={formatNumber(Math.max(0, current))}
      />
      <Button
        label={t('finances.setBalance')}
        icon="check"
        disabled={!amount}
        onPress={() => {
          onSave(parseAmount(amount));
          setAmount('');
        }}
        block
      />
    </Sheet>
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
  cash: {
    gap: space.xs,
    backgroundColor: colors.brandTint,
    borderColor: colors.brandSoft,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.sm,
  },
  grid: {
    flexDirection: 'row',
    gap: space.md,
  },
  netCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.sm,
  },
  bucketToggle: {
    width: 220,
  },
  clip: { overflow: 'hidden' },
  none: { padding: space.lg },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  breakdown: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: space.xs,
    backgroundColor: colors.surfaceMuted,
    paddingTop: space.sm,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  entryIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
