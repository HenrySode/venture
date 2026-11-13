import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Icon, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { daysUntil, formatQty, formatTsh } from '@/lib/format';
import { sellsByCarton } from '@/lib/stock';
import { isLowStock, isOutOfStock } from '@/mocks/products';
import { colors, radius, space } from '@/theme';
import type { Product } from '@/types/domain';

/** Compact product line for stock lists: name, price, cartons/units left, status. */
export function ProductRow({ product: p, onPress, trailing, showExpiry }: { product: Product; onPress?: () => void; trailing?: ReactNode; showExpiry?: boolean }) {
  const t = useT();
  const out = isOutOfStock(p);
  const low = !out && isLowStock(p);
  const days = p.expiresAt ? daysUntil(p.expiresAt) : null;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {p.name}
        </Text>
        <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
          {p.category} · {formatTsh(p.sellPriceUnit)}
        </Text>
        <View style={styles.badges}>
          {out ? <Badge label={t('sell.out')} tone="danger" /> : low ? <Badge label={t('sell.low')} tone="warning" /> : null}
          {showExpiry && days !== null ? (
            <Badge
              label={days < 0 ? t('product.expired') : days === 0 ? t('product.expiresToday') : t('product.expiresIn', { days })}
              tone={days <= 2 ? 'danger' : 'warning'}
              icon="clock"
            />
          ) : null}
        </View>
      </View>
      {trailing ?? (
        <View style={styles.stock}>
          {sellsByCarton(p) ? (
            <Text variant="bodyStrong" color={out ? colors.danger : colors.ink}>
              {p.stockCartons} <Text variant="caption" color={colors.inkMuted}>C</Text>
            </Text>
          ) : null}
          <Text variant={sellsByCarton(p) ? 'caption' : 'bodyStrong'} color={out ? colors.danger : sellsByCarton(p) ? colors.inkMuted : colors.ink}>
            {formatQty(p.stockUnits)} U
          </Text>
        </View>
      )}
      {onPress ? <Icon name="chevronRight" size={16} color={colors.inkSubtle} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badges: {
    flexDirection: 'row',
    gap: space.xs,
    flexWrap: 'wrap',
  },
  stock: {
    alignItems: 'flex-end',
    minWidth: 56,
  },
});
