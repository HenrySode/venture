import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProductPicker } from '@/components/sell/product-picker';
import { Banner, Button, Card, Chip, Icon, QuantityStepper, Screen, SegmentedControl, Text, TextField, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { customerNames, debtors } from '@/lib/credits';
import { errorMessage } from '@/lib/errors';
import { customerKey, formatTsh, matchesAllWords } from '@/lib/format';
import { available, sellsByCarton } from '@/lib/stock';
import { priceOf } from '@/mocks/sales';
import { mockRequest } from '@/services/client';
import { planAccess } from '@/state/access';
import { StockError, useData, type SaleLineInput } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { colors, radius, space } from '@/theme';
import type { SaleKind } from '@/types/domain';

/** Sell on credit: customer + one or more products. Stock leaves now; it's a sale once paid. */
export default function CreditSaleScreen() {
  const t = useT();
  const router = useRouter();
  const session = useCurrentSession();
  const canCarton = planAccess(session).hasModule('cartonPricing');
  const { products, credits, recordCredit } = useData();
  const { customer } = useLocalSearchParams<{ customer?: string }>();

  const known = customerNames(credits);
  const preset = customer ? known.find((c) => c.key === customer) : undefined;

  const [name, setName] = useState(preset?.name ?? '');
  const [phone, setPhone] = useState(preset?.phone ?? '');
  const [lines, setLines] = useState<SaleLineInput[]>([]);
  const [picker, setPicker] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; lines?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; key: string } | null>(null);

  const suggestions = name.trim() && !known.some((c) => c.key === customerKey(name)) ? known.filter((c) => matchesAllWords(name, c.name)).slice(0, 5) : [];
  const rows = lines.flatMap((l) => {
    const p = products.find((x) => x.id === l.productId);
    return p ? [{ ...l, product: p, price: priceOf(p, l.kind) }] : [];
  });
  const total = rows.reduce((s, r) => s + r.price * r.quantity, 0);

  const update = (index: number, patch: Partial<SaleLineInput>) => setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const submit = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = t('credit.customerRequired');
    if (!lines.length) next.lines = t('credit.noItems');
    setErrors(next);
    if (next.name || next.lines) return;

    setBusy(true);
    setFormError(null);
    try {
      await mockRequest(() => recordCredit({ name, phone: phone.trim() || null, lines }, session.user), 500);
      setDone({ name: name.trim(), key: customerKey(name) });
    } catch (e) {
      setFormError(e instanceof StockError ? t('sell.notEnough', { name: e.productName }) : errorMessage(t, e, {}));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    const owed = debtors(credits).find((d) => d.key === done.key)?.owed ?? total;
    return (
      <Screen
        header={<TopBar onBack={null} />}
        footer={
          <View style={styles.doneActions}>
            <Button label={t('credit.viewCustomer')} size="lg" onPress={() => router.replace({ pathname: '/madeni/[key]', params: { key: done.key } })} block />
            <Button
              label={t('credit.another')}
              variant="secondary"
              onPress={() => {
                setDone(null);
                setName('');
                setPhone('');
                setLines([]);
              }}
              block
            />
            <Button label={t('common.done')} variant="ghost" onPress={() => router.back()} block />
          </View>
        }>
        <View style={styles.done}>
          <View style={styles.doneIcon}>
            <Icon name="check" size={32} color={colors.success} />
          </View>
          <Text variant="title" align="center">
            {t('credit.recorded')}
          </Text>
          <Text variant="body" align="center" color={colors.inkMuted}>
            {t('credit.recordedBody', { name: done.name, amount: formatTsh(owed) })}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={<TopBar title={t('credit.title')} />}
      footer={
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text variant="bodyStrong" color={colors.inkMuted}>
              {t('basket.total')}
            </Text>
            <Text variant="title">{formatTsh(total)}</Text>
          </View>
          <Button label={t('credit.record')} loadingLabel={t('credit.recording')} loading={busy} size="lg" icon="credit" onPress={submit} block />
        </View>
      }>
      {formError ? <Banner tone="danger" message={formError} /> : null}

      <TextField
        label={t('credit.customer')}
        icon="person"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setErrors((e) => ({ ...e, name: undefined }));
        }}
        placeholder={t('credit.customerPlaceholder')}
        autoCapitalize="words"
        error={errors.name}
      />
      {suggestions.length ? (
        <View style={styles.chips}>
          {suggestions.map((c) => (
            <Chip
              key={c.key}
              label={c.name}
              icon="person"
              onPress={() => {
                setName(c.name);
                if (c.phone) setPhone(c.phone);
              }}
            />
          ))}
        </View>
      ) : null}
      <TextField
        label={`${t('credit.phone')} · ${t('common.optional')}`}
        icon="phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="07xx xxx xxx"
      />

      <Text variant="overline" color={colors.inkMuted} style={styles.section}>
        {t('credit.items').toUpperCase()}
      </Text>
      {errors.lines ? <Banner tone="danger" message={errors.lines} /> : null}

      {rows.map((r, i) => {
        const cartonOk = canCarton && sellsByCarton(r.product);
        return (
          <Card key={`${r.productId}-${i}`} style={styles.line}>
            <View style={styles.lineHead}>
              <Text variant="bodyStrong" style={styles.flex} numberOfLines={2}>
                {r.product.name}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('madeni.remove')}
                hitSlop={10}
                onPress={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                <Icon name="trash" size={20} color={colors.danger} />
              </Pressable>
            </View>
            {cartonOk ? (
              <SegmentedControl<SaleKind>
                value={r.kind}
                onChange={(kind) => update(i, { kind, quantity: 1 })}
                options={[
                  { value: 'unit', label: t('sell.unit') },
                  { value: 'carton', label: t('sell.carton') },
                ]}
              />
            ) : null}
            <View style={styles.lineFoot}>
              <QuantityStepper
                label={r.product.name}
                value={r.quantity}
                min={1}
                max={available(r.product, r.kind)}
                onChange={(quantity) => update(i, { quantity })}
              />
              <Text variant="heading">{formatTsh(r.price * r.quantity)}</Text>
            </View>
          </Card>
        );
      })}

      <Button label={t('credit.addItem')} variant="secondary" icon="add" onPress={() => setPicker(true)} block />

      <ProductPicker
        visible={picker}
        title={t('credit.pickProduct')}
        onClose={() => setPicker(false)}
        onPick={(p) => {
          setPicker(false);
          setErrors((e) => ({ ...e, lines: undefined }));
          setLines((ls) => [...ls, { productId: p.id, kind: 'unit', quantity: 1 }]);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: -space.sm,
  },
  section: {
    marginTop: space.sm,
  },
  line: {
    gap: space.md,
  },
  lineHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  lineFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    gap: space.md,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  done: {
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.xxxl,
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  doneActions: {
    gap: space.sm,
  },
});
