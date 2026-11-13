import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Divider, EmptyState, ListRow, Screen, Text, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate, formatQty, formatTsh, initials } from '@/lib/format';
import { orderTotal } from '@/lib/orders';
import { canManageStock } from '@/state/access';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { colors, radius, space } from '@/theme';

export default function SupplierScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user } = useCurrentSession();
  const canEdit = canManageStock(user.role);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { suppliers, purchases, orders } = useData();

  const s = suppliers.find((x) => String(x.id) === id);
  if (!s) {
    return (
      <Screen header={<TopBar />}>
        <EmptyState icon="suppliers" title={t('suppliers.empty')} />
      </Screen>
    );
  }

  const bought = purchases.filter((p) => p.supplierId === s.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = bought.reduce((sum, p) => sum + p.cost, 0);
  const theirOrders = orders.filter((o) => o.supplierId === s.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Screen
      header={<TopBar title={s.name} />}
      footer={
        canEdit ? (
          <View style={styles.actions}>
            <Button label={t('orders.edit')} variant="secondary" onPress={() => router.push({ pathname: '/supplier/edit', params: { id: String(s.id) } })} style={styles.flex} />
            <Button label={t('orders.new')} icon="add" onPress={() => router.push({ pathname: '/order/edit', params: { supplier: String(s.id) } })} style={styles.flex} />
          </View>
        ) : null
      }>
      <Card style={styles.head}>
        <View style={styles.avatar}>
          <Text variant="heading">{initials(s.name)}</Text>
        </View>
        <View style={styles.flex}>
          <Text variant="heading">{s.name}</Text>
          {s.place ? (
            <Text variant="caption" color={colors.inkMuted}>
              {s.place}
            </Text>
          ) : null}
          <Text variant="label" color={colors.brandStrong}>
            {t('suppliers.bought', { amount: formatTsh(total) })}
          </Text>
        </View>
      </Card>
      {s.phone ? <Button label={`${t('suppliers.call')} · ${s.phone}`} variant="secondary" icon="phone" onPress={() => Linking.openURL(`tel:${s.phone?.replace(/\s/g, '')}`)} block /> : null}
      {s.notes ? (
        <Card>
          <Text variant="caption" color={colors.inkMuted}>
            {t('suppliers.notes')}
          </Text>
          <Text variant="body">{s.notes}</Text>
        </Card>
      ) : null}

      <Text variant="overline" color={colors.inkMuted}>
        {t('suppliers.tabOrders').toUpperCase()}
      </Text>
      <Card padded={false} style={styles.clip}>
        {theirOrders.length === 0 ? (
          <Text variant="body" color={colors.inkMuted} style={styles.none}>
            {t('product.none')}
          </Text>
        ) : (
          theirOrders.map((o, i) => (
            <View key={o.id}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                title={`${t('orders.number', { id: o.id })} · ${formatTsh(orderTotal(o))}`}
                subtitle={`${t('orders.items', { count: o.lines.length })} · ${formatDate(o.createdAt, locale)}`}
                trailing={<Badge label={o.status === 'draft' ? t('orders.draft') : t('orders.received')} tone={o.status === 'draft' ? 'warning' : 'success'} />}
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: String(o.id) } })}
              />
            </View>
          ))
        )}
      </Card>

      <Text variant="overline" color={colors.inkMuted}>
        {t('stock.purchases').toUpperCase()}
      </Text>
      <Card padded={false} style={styles.clip}>
        {bought.length === 0 ? (
          <Text variant="body" color={colors.inkMuted} style={styles.none}>
            {t('product.none')}
          </Text>
        ) : (
          bought.slice(0, 10).map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.line}>
                <View style={styles.flex}>
                  <Text variant="label" numberOfLines={1}>
                    {p.productName}
                  </Text>
                  <Text variant="caption" color={colors.inkMuted}>
                    {formatDate(p.createdAt, locale)} · {[p.cartons ? `${p.cartons} C` : '', p.units ? `${formatQty(p.units)} U` : ''].filter(Boolean).join(' + ')}
                  </Text>
                </View>
                <Text variant="label">{formatTsh(p.cost)}</Text>
              </View>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  clip: { overflow: 'hidden' },
  head: {
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
  none: { padding: space.lg },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
});
