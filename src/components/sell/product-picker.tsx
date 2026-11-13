import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Badge, SearchField, Sheet, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { formatQty, formatTsh, productMatches } from '@/lib/format';
import { available } from '@/lib/stock';
import { isOutOfStock } from '@/mocks/products';
import { useData } from '@/state/data';
import { colors, space } from '@/theme';
import type { Product } from '@/types/domain';

/** Bottom sheet to choose one product (credit sale, forgotten sale). */
export function ProductPicker({
  visible,
  onClose,
  onPick,
  title,
  includeOutOfStock = false,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (p: Product) => void;
  title: string;
  /** Restocking and orders can pick products that are sold out. */
  includeOutOfStock?: boolean;
}) {
  const t = useT();
  const { products } = useData();
  const [query, setQuery] = useState('');
  const list = products.filter((p) => productMatches(p, query));

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <SearchField value={query} onChangeText={setQuery} placeholder={t('sell.searchPlaceholder')} />
      <FlatList
        data={list}
        keyExtractor={(p) => String(p.id)}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={
          <Text variant="body" color={colors.inkMuted} style={styles.empty}>
            {t('sell.noResults', { query })}
          </Text>
        }
        renderItem={({ item: p }) => {
          const out = !includeOutOfStock && isOutOfStock(p);
          return (
            <Pressable
              accessibilityRole="button"
              disabled={out}
              onPress={() => {
                onPick(p);
                setQuery('');
              }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed, out && styles.disabled]}>
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {p.name}
                </Text>
                <Text variant="caption" color={colors.inkMuted}>
                  {formatTsh(p.sellPriceUnit)} · {formatQty(available(p, 'unit'))} {t('sell.unit').toLowerCase()}
                </Text>
              </View>
              {isOutOfStock(p) ? <Badge label={t('sell.out')} tone="danger" /> : null}
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}

function Separator() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { maxHeight: 420 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
    minHeight: 56,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  disabled: { opacity: 0.45 },
  empty: { paddingVertical: space.xl, textAlign: 'center' },
});
