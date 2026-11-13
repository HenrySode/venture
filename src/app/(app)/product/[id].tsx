import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { UpgradeSheet } from '@/components/access';
import { Badge, Button, Card, Divider, EmptyState, Screen, Text, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { daysUntil, formatDate, formatQty, formatTsh } from '@/lib/format';
import { sellsByCarton, stockValue, totalUnits } from '@/lib/stock';
import { isLowStock, isOutOfStock } from '@/mocks/products';
import { canManageStock, planAccess } from '@/state/access';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { colors, space } from '@/theme';

export default function ProductScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const session = useCurrentSession();
  const canEdit = canManageStock(session.user.role);
  const canRestock = planAccess(session).hasModule('stock');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, sales, purchases } = useData();
  const [upgrade, setUpgrade] = useState(false);

  const p = products.find((x) => String(x.id) === id);
  if (!p) {
    return (
      <Screen header={<TopBar />}>
        <EmptyState icon="stock" title={t('product.notFound')} />
      </Screen>
    );
  }

  const out = isOutOfStock(p);
  const low = !out && isLowStock(p);
  const productSales = sales.filter((s) => s.productId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const productPurchases = purchases.filter((x) => x.productId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const soldUnits = productSales.reduce((sum, s) => sum + s.quantity * (s.kind === 'carton' ? p.unitsPerCarton : 1), 0);
  const days = p.expiresAt ? daysUntil(p.expiresAt) : null;
  const byCarton = sellsByCarton(p);

  return (
    <Screen
      header={<TopBar title={p.name} />}
      footer={
        canEdit ? (
          <View style={styles.actions}>
            <Button
              label={t('product.edit')}
              variant="secondary"
              icon="sliders"
              onPress={() => router.push({ pathname: '/product/edit', params: { id: String(p.id) } })}
              style={styles.flex}
            />
            <Button
              label={t('product.restock')}
              icon="add"
              onPress={() => (canRestock ? router.push({ pathname: '/restock', params: { id: String(p.id) } }) : setUpgrade(true))}
              style={styles.flex}
            />
          </View>
        ) : null
      }>
      {/* Stock */}
      <Card style={styles.block}>
        <View style={styles.row}>
          <Text variant="label" color={colors.inkMuted} style={styles.flex}>
            {t('product.onShelf')}
          </Text>
          {out ? <Badge label={t('sell.out')} tone="danger" /> : low ? <Badge label={t('sell.low')} tone="warning" icon="warning" /> : <Badge label="OK" tone="success" />}
        </View>
        <View style={styles.stockRow}>
          {byCarton ? (
            <View style={styles.stockCell}>
              <Text variant="display">{p.stockCartons}</Text>
              <Text variant="caption" color={colors.inkMuted}>
                {t('product.cartons')}
              </Text>
            </View>
          ) : null}
          <View style={styles.stockCell}>
            <Text variant="display">{formatQty(p.stockUnits)}</Text>
            <Text variant="caption" color={colors.inkMuted}>
              {byCarton ? t('product.units') : t('sell.unit').toLowerCase()}
            </Text>
          </View>
        </View>
        {byCarton ? (
          <Text variant="caption" color={colors.inkMuted}>
            {t('product.totalUnits', { count: formatQty(totalUnits(p)) })} · {p.unitsPerCarton} / {t('sell.carton').toLowerCase()}
          </Text>
        ) : null}
        <Divider style={styles.divider} />
        <Line label={t('product.value')} value={formatTsh(stockValue(p))} />
        <Line label={t('product.soldTotal')} value={formatQty(soldUnits)} />
      </Card>

      {/* Prices */}
      <Text variant="overline" color={colors.inkMuted}>
        {t('product.prices').toUpperCase()}
      </Text>
      <Card padded={false}>
        <PriceHeader />
        <Divider />
        <PriceRow label={t('sell.unit')} buy={p.purchasePriceUnit} sell={p.sellPriceUnit} />
        {byCarton ? (
          <>
            <Divider />
            <PriceRow label={t('sell.carton')} buy={p.purchasePriceCarton} sell={p.sellPriceCarton} />
          </>
        ) : null}
      </Card>

      {/* Details */}
      <Text variant="overline" color={colors.inkMuted}>
        {t('product.details').toUpperCase()}
      </Text>
      <Card style={styles.block}>
        <Line label={t('product.category')} value={p.category} />
        {p.barcode ? <Line label={t('product.barcode')} value={p.barcode} /> : null}
        {days !== null && p.expiresAt ? (
          <Line
            label={t('product.expires')}
            value={`${formatDate(p.expiresAt, locale)} · ${days < 0 ? t('product.expired') : days === 0 ? t('product.expiresToday') : t('product.expiresIn', { days })}`}
            color={days <= 2 ? colors.danger : days <= 7 ? colors.warning : undefined}
          />
        ) : null}
        {p.taxPercent ? <Line label={t('product.tax')} value={`${p.taxPercent}%`} /> : null}
        {p.reorderQty ? <Line label={t('product.reorder')} value={String(p.reorderQty)} /> : null}
        {p.discountPrice ? <Line label={t('product.discount')} value={formatTsh(p.discountPrice)} /> : null}
        {p.aliases.length ? <Line label={t('product.aliases')} value={p.aliases.join(', ')} /> : null}
      </Card>

      {/* History */}
      <Text variant="overline" color={colors.inkMuted}>
        {t('product.recentSales').toUpperCase()}
      </Text>
      <Card style={styles.block}>
        {productSales.length === 0 ? (
          <Text variant="body" color={colors.inkMuted}>
            {t('product.none')}
          </Text>
        ) : (
          productSales.slice(0, 5).map((s) => (
            <Line
              key={s.id}
              label={`${formatDate(s.createdAt, locale)} · ${formatQty(s.quantity)} × ${t(s.kind === 'carton' ? 'sell.carton' : 'sell.unit')}`}
              value={formatTsh(s.total)}
            />
          ))
        )}
      </Card>

      <Text variant="overline" color={colors.inkMuted}>
        {t('product.recentPurchases').toUpperCase()}
      </Text>
      <Card style={styles.block}>
        {productPurchases.length === 0 ? (
          <Text variant="body" color={colors.inkMuted}>
            {t('product.none')}
          </Text>
        ) : (
          productPurchases.slice(0, 5).map((x) => (
            <Line
              key={x.id}
              label={`${formatDate(x.createdAt, locale)} · ${x.cartons ? `${x.cartons} C` : ''}${x.cartons && x.units ? ' + ' : ''}${x.units ? `${formatQty(x.units)} U` : ''}${x.supplierName ? ` · ${x.supplierName}` : ''}`}
              value={formatTsh(x.cost)}
            />
          ))
        )}
      </Card>

      <UpgradeSheet visible={upgrade} onClose={() => setUpgrade(false)} />
    </Screen>
  );
}

function Line({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Text variant="body" color={colors.inkMuted} style={styles.flex} numberOfLines={2}>
        {label}
      </Text>
      <Text variant="bodyStrong" color={color ?? colors.ink} style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

function PriceHeader() {
  const { t } = useI18n();
  return (
    <View style={styles.priceRow}>
      <Text variant="caption" color={colors.inkMuted} style={styles.flex} />
      <Text variant="caption" color={colors.inkMuted} style={styles.priceCell}>
        {t('product.buy')}
      </Text>
      <Text variant="caption" color={colors.inkMuted} style={styles.priceCell}>
        {t('product.sell')}
      </Text>
      <Text variant="caption" color={colors.inkMuted} style={styles.priceCell}>
        {t('product.profit')}
      </Text>
    </View>
  );
}

function PriceRow({ label, buy, sell }: { label: string; buy: number; sell: number }) {
  const profit = sell - buy;
  return (
    <View style={styles.priceRow}>
      <Text variant="label" style={styles.flex}>
        {label}
      </Text>
      <Text variant="caption" style={styles.priceCell}>
        {formatTsh(buy).replace('TSH ', '')}
      </Text>
      <Text variant="label" style={styles.priceCell}>
        {formatTsh(sell).replace('TSH ', '')}
      </Text>
      <Text variant="label" color={profit >= 0 ? colors.success : colors.danger} style={styles.priceCell}>
        {formatTsh(profit).replace('TSH ', '')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  value: {
    textAlign: 'right',
    flexShrink: 1,
  },
  stockRow: {
    flexDirection: 'row',
    gap: space.xxl,
  },
  stockCell: {
    gap: 0,
  },
  divider: {
    marginVertical: space.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.sm,
  },
  priceCell: {
    width: 72,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
});
