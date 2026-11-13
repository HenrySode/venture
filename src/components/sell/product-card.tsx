import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Card, Icon, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { formatQty, formatTsh } from '@/lib/format';
import { available, sellsByCarton } from '@/lib/stock';
import { isLowStock, isOutOfStock } from '@/mocks/products';
import { colors, radius, space, touch } from '@/theme';
import type { Product, SaleKind } from '@/types/domain';

type Props = {
  product: Product;
  tapQty: number;
  /** Carton selling is a Hub tool; when false the button shows a lock. */
  cartonUnlocked: boolean;
  onSell: (kind: SaleKind) => void;
  onLocked: () => void;
  large?: boolean;
};

/** One product on the Sell screen: name, stock, and a big button per way of selling. */
export function ProductCard({ product: p, tapQty, cartonUnlocked, onSell, onLocked }: Props) {
  const t = useT();
  const out = isOutOfStock(p);
  const low = !out && isLowStock(p);
  const showCarton = sellsByCarton(p);

  return (
    <Card style={[styles.card, out && styles.out]}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {p.name}
          </Text>
          <Text variant="caption" color={colors.inkMuted}>
            {showCarton ? t('sell.stockLine', { cartons: p.stockCartons, units: formatQty(p.stockUnits) }) : `${formatQty(available(p, 'unit'))} ${t('sell.unit').toLowerCase()}`}
          </Text>
        </View>
        {out ? <Badge label={t('sell.out')} tone="danger" /> : low ? <Badge label={t('sell.low')} tone="warning" icon="warning" /> : null}
      </View>

      <View style={styles.actions}>
        <SellButton
          label={t('sell.unit')}
          price={formatTsh(p.sellPriceUnit)}
          qty={tapQty}
          primary
          disabled={out || available(p, 'unit') < tapQty}
          onPress={() => onSell('unit')}
        />
        {showCarton ? (
          <SellButton
            label={t('sell.carton')}
            price={formatTsh(p.sellPriceCarton)}
            qty={tapQty}
            locked={!cartonUnlocked}
            disabled={cartonUnlocked && available(p, 'carton') < tapQty}
            onPress={() => (cartonUnlocked ? onSell('carton') : onLocked())}
          />
        ) : null}
      </View>
    </Card>
  );
}

function SellButton({
  label,
  price,
  qty,
  primary,
  disabled,
  locked,
  onPress,
}: {
  label: string;
  price: string;
  qty: number;
  primary?: boolean;
  disabled?: boolean;
  locked?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${price}`}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sell,
        primary ? styles.sellPrimary : styles.sellSecondary,
        pressed && (primary ? styles.sellPrimaryPressed : styles.sellSecondaryPressed),
        disabled && styles.sellDisabled,
      ]}>
      <View style={styles.sellLabel}>
        <Icon name={locked ? 'lock' : 'add'} size={14} color={colors.ink} />
        <Text variant="caption" style={styles.bold}>
          {qty !== 1 ? `${formatQty(qty)} × ` : ''}
          {label}
        </Text>
      </View>
      <Text variant="label" numberOfLines={1} adjustsFontSizeToFit>
        {price}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  card: {
    gap: space.md,
    padding: space.md,
  },
  out: {
    opacity: 0.6,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
  },
  sell: {
    flex: 1,
    minHeight: touch.large,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    justifyContent: 'center',
    gap: 2,
  },
  sellPrimary: {
    backgroundColor: colors.brand,
  },
  sellPrimaryPressed: {
    backgroundColor: colors.brandStrong,
  },
  sellSecondary: {
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandSoft,
  },
  sellSecondaryPressed: {
    backgroundColor: colors.brandSoft,
  },
  sellDisabled: {
    opacity: 0.4,
  },
  sellLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
});
