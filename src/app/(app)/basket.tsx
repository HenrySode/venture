import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Banner, Button, Card, EmptyState, QuantityStepper, Screen, Text, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatTsh } from '@/lib/format';
import { available } from '@/lib/stock';
import { priceOf } from '@/mocks/sales';
import { mockRequest } from '@/services/client';
import { useBasket } from '@/state/basket';
import { StockError, useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { colors, space } from '@/theme';

export default function BasketScreen() {
  const t = useT();
  const router = useRouter();
  const { user } = useCurrentSession();
  const { products, sell } = useData();
  const basket = useBasket();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = basket.lines.flatMap((l) => {
    const p = products.find((x) => x.id === l.productId);
    return p ? [{ ...l, product: p, price: priceOf(p, l.kind) }] : [];
  });
  const total = rows.reduce((sum, r) => sum + r.price * r.quantity, 0);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const receiptId = await mockRequest(() => sell(basket.lines, user), 500);
      basket.clear();
      router.replace({ pathname: '/receipt/[id]', params: { id: receiptId } });
    } catch (e) {
      setError(e instanceof StockError ? t('sell.notEnough', { name: e.productName }) : errorMessage(t, e, {}));
      setBusy(false);
    }
  };

  return (
    <Screen
      header={
        <TopBar
          title={t('basket.title')}
          right={
            rows.length ? (
              <Pressable accessibilityRole="button" onPress={basket.clear} hitSlop={10}>
                <Text variant="label" color={colors.danger}>
                  {t('basket.clear')}
                </Text>
              </Pressable>
            ) : undefined
          }
        />
      }
      footer={
        rows.length ? (
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text variant="bodyStrong" color={colors.inkMuted}>
                {t('basket.total')}
              </Text>
              <Text variant="title">{formatTsh(total)}</Text>
            </View>
            <Button label={t('basket.confirm')} loadingLabel={t('basket.confirming')} loading={busy} size="lg" icon="check" onPress={confirm} block />
          </View>
        ) : null
      }>
      {error ? <Banner tone="danger" message={error} /> : null}

      {rows.length === 0 ? (
        <EmptyState
          icon="basket"
          title={t('basket.empty')}
          message={t('basket.emptyBody')}
          action={<Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />}
        />
      ) : (
        rows.map((r) => {
          const step = r.kind === 'unit' && basket.tapQty < 1 ? basket.tapQty : 1;
          return (
            <Card key={`${r.productId}-${r.kind}`} style={styles.line}>
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {r.product.name}
                </Text>
                <Text variant="caption" color={colors.inkMuted}>
                  {t(r.kind === 'carton' ? 'sell.carton' : 'sell.unit')} · {t('basket.each', { price: formatTsh(r.price) })}
                </Text>
                <Text variant="bodyStrong" style={styles.lineTotal}>
                  {formatTsh(r.price * r.quantity)}
                </Text>
              </View>
              <QuantityStepper
                label={r.product.name}
                value={r.quantity}
                step={step}
                min={0}
                max={available(r.product, r.kind)}
                onChange={(q) => basket.setQuantity(r.productId, r.kind, q)}
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  lineTotal: {
    marginTop: space.xs,
  },
  footer: {
    gap: space.md,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
