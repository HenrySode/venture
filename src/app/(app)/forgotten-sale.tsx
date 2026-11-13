import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProductPicker } from '@/components/sell/product-picker';
import { Banner, Button, Card, Chip, Icon, QuantityStepper, Screen, SegmentedControl, Text, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatQty, formatTsh } from '@/lib/format';
import { available, sellsByCarton } from '@/lib/stock';
import { priceOf } from '@/mocks/sales';
import { mockRequest } from '@/services/client';
import { planAccess } from '@/state/access';
import { StockError, useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, radius, space, touch } from '@/theme';
import type { SaleKind } from '@/types/domain';

const DAYS = [0, 1, 2, 3];
const STEP_MIN = 15;

const pad = (n: number) => String(n).padStart(2, '0');

/** Record a sale that happened earlier (pick product, date and time). */
export default function ForgottenSaleScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const session = useCurrentSession();
  const canCarton = planAccess(session).hasModule('cartonPricing');
  const { products, sell } = useData();

  const [productId, setProductId] = useState<number | null>(null);
  const [kind, setKind] = useState<SaleKind>('unit');
  const [qty, setQty] = useState(1);
  const [daysAgo, setDaysAgo] = useState(0);
  const [minutes, setMinutes] = useState(() => {
    const now = new Date();
    return Math.max(0, Math.floor((now.getHours() * 60 + now.getMinutes() - 60) / STEP_MIN) * STEP_MIN);
  });
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const product = products.find((p) => p.id === productId) ?? null;
  const save = async () => {
    const now = new Date();
    const at = new Date(now.getTime());
    at.setDate(at.getDate() - daysAgo);
    at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    if (!product) {
      setError(t('forgotten.choose'));
      return;
    }
    if (at.getTime() > now.getTime()) {
      setError(t('forgotten.futureTime'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await mockRequest(() => sell([{ productId: product.id, kind, quantity: qty }], session.user, { at, forgotten: true }), 500);
      toast({ message: t('forgotten.saved') });
      router.back();
    } catch (e) {
      setError(e instanceof StockError ? t('sell.notEnough', { name: e.productName }) : errorMessage(t, e, {}));
      setBusy(false);
    }
  };

  const dayLabel = (d: number) => (d === 0 ? t('forgotten.today') : d === 1 ? t('forgotten.yesterday') : t('forgotten.daysAgo', { n: d }));

  return (
    <Screen
      header={<TopBar title={t('forgotten.title')} />}
      footer={
        <Button
          label={product ? `${t('forgotten.save')} · ${formatTsh(priceOf(product, kind) * qty)}` : t('forgotten.save')}
          loading={busy}
          size="lg"
          onPress={save}
          block
        />
      }>
      <Text variant="body" color={colors.inkMuted}>
        {t('forgotten.lead')}
      </Text>
      {error ? <Banner tone="danger" message={error} /> : null}

      <Field label={t('forgotten.product')}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setPicker(true)}
          style={({ pressed }) => [styles.select, pressed && { backgroundColor: colors.surfaceMuted }]}>
          <Icon name="stock" size={20} color={colors.inkSubtle} />
          <View style={styles.flex}>
            <Text variant="body" color={product ? colors.ink : colors.inkSubtle} numberOfLines={1}>
              {product ? product.name : t('forgotten.choose')}
            </Text>
            {product ? (
              <Text variant="caption" color={colors.inkMuted}>
                {formatTsh(product.sellPriceUnit)} · {formatQty(available(product, 'unit'))} {t('sell.unit').toLowerCase()}
              </Text>
            ) : null}
          </View>
          <Icon name="chevronRight" size={16} color={colors.inkSubtle} />
        </Pressable>
      </Field>

      {product && canCarton && sellsByCarton(product) ? (
        <Field label={t('forgotten.type')}>
          <SegmentedControl<SaleKind>
            value={kind}
            onChange={(k) => {
              setKind(k);
              setQty(1);
            }}
            options={[
              { value: 'unit', label: t('sell.unit') },
              { value: 'carton', label: t('sell.carton') },
            ]}
          />
        </Field>
      ) : null}

      <Field label={t('forgotten.quantity')}>
        <View style={styles.left}>
          <QuantityStepper value={qty} min={1} max={product ? available(product, kind) : 99} onChange={setQty} label={t('forgotten.quantity')} />
        </View>
      </Field>

      <Field label={t('forgotten.when')}>
        <View style={styles.chips}>
          {DAYS.map((d) => (
            <Chip key={d} label={dayLabel(d)} icon="calendar" selected={daysAgo === d} onPress={() => setDaysAgo(d)} />
          ))}
        </View>
      </Field>

      <Field label={t('forgotten.time')}>
        <Card style={styles.time}>
          <TimeButton icon="minus" onPress={() => setMinutes((m) => (m - STEP_MIN + 1440) % 1440)} label="−15" />
          <Text variant="display" style={styles.timeText}>
            {pad(Math.floor(minutes / 60))}:{pad(minutes % 60)}
          </Text>
          <TimeButton icon="add" onPress={() => setMinutes((m) => (m + STEP_MIN) % 1440)} label="+15" />
        </Card>
      </Field>

      <ProductPicker
        visible={picker}
        title={t('forgotten.choose')}
        onClose={() => setPicker(false)}
        onPick={(p) => {
          setPicker(false);
          setProductId(p.id);
          setKind('unit');
          setQty(1);
          setError(null);
        }}
      />
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      {children}
    </View>
  );
}

function TimeButton({ icon, onPress, label }: { icon: 'add' | 'minus'; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.timeBtn, pressed && { backgroundColor: colors.brandSoft }]}>
      <Icon name={icon} size={22} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: space.sm },
  left: { alignItems: 'flex-start' },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: touch.large,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.sm,
  },
  timeText: {
    fontVariant: ['tabular-nums'],
  },
  timeBtn: {
    width: touch.large,
    height: touch.large,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
