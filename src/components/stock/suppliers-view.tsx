import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PlanBanner, PlanGate } from '@/components/access';
import { Badge, EmptyState, Icon, SegmentedControl, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate, formatTsh, initials } from '@/lib/format';
import { orderTotal } from '@/lib/orders';
import { canManageStock } from '@/state/access';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { colors, radius, space } from '@/theme';

type Tab = 'suppliers' | 'orders';

/** Suppliers list and purchase orders (draft → received). */
export function SuppliersView({ header }: { header: ReactNode }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user } = useCurrentSession();
  const canEdit = canManageStock(user.role);
  const { suppliers, purchases, orders } = useData();
  const [tab, setTab] = useState<Tab>('suppliers');

  const bought = (id: number) => purchases.filter((p) => p.supplierId === id).reduce((s, p) => s + p.cost, 0);
  const sortedOrders = [...orders].sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === 'draft' ? -1 : 1));
  const supplierName = (id: number) => suppliers.find((s) => s.id === id)?.name ?? '—';

  const tabs = (
    <View style={styles.top}>
      <PlanBanner />
      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'suppliers', label: `${t('suppliers.tabSuppliers')} · ${suppliers.length}` },
          { value: 'orders', label: `${t('suppliers.tabOrders')} · ${orders.length}` },
        ]}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      {header}
      <PlanGate module="suppliers">
        {tab === 'suppliers' ? (
          <FlatList
            data={suppliers}
            keyExtractor={(s) => String(s.id)}
            contentContainerStyle={styles.list}
            ListHeaderComponent={tabs}
            ListEmptyComponent={<EmptyState icon="suppliers" title={t('suppliers.empty')} message={t('suppliers.emptyBody')} />}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/supplier/[id]', params: { id: String(item.id) } })}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
                <View style={styles.avatar}>
                  <Text variant="label">{initials(item.name)}</Text>
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
                    {[item.place, item.phone].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Text variant="caption" color={colors.inkMuted}>
                  {formatTsh(bought(item.id))}
                </Text>
                <Icon name="chevronRight" size={16} color={colors.inkSubtle} />
              </Pressable>
            )}
          />
        ) : (
          <FlatList
            data={sortedOrders}
            keyExtractor={(o) => String(o.id)}
            contentContainerStyle={styles.list}
            ListHeaderComponent={tabs}
            ListEmptyComponent={<EmptyState icon="receipt" title={t('orders.empty')} message={t('orders.emptyBody')} />}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: String(item.id) } })}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
                <View style={[styles.avatar, item.status === 'received' && { backgroundColor: colors.successSoft }]}>
                  <Icon name={item.status === 'draft' ? 'receipt' : 'check'} size={18} color={item.status === 'draft' ? colors.brandStrong : colors.success} />
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {supplierName(item.supplierId)}
                  </Text>
                  <Text variant="caption" color={colors.inkMuted}>
                    {t('orders.number', { id: item.id })} · {t('orders.items', { count: item.lines.length })} · {formatDate(item.createdAt, locale)}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text variant="label">{formatTsh(orderTotal(item))}</Text>
                  <Badge label={item.status === 'draft' ? t('orders.draft') : t('orders.received')} tone={item.status === 'draft' ? 'warning' : 'success'} />
                </View>
              </Pressable>
            )}
          />
        )}
      </PlanGate>

      {canEdit ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(tab === 'suppliers' ? '/supplier/edit' : '/order/edit')}
          style={({ pressed }) => [styles.fab, pressed && { backgroundColor: colors.brandStrong }]}>
          <Icon name="add" size={22} color={colors.ink} />
          <Text variant="bodyStrong">{tab === 'suppliers' ? t('suppliers.add') : t('orders.new')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  top: {
    gap: space.md,
    marginBottom: space.sm,
  },
  list: {
    paddingHorizontal: space.xl,
    paddingBottom: 96,
    gap: space.sm,
  },
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    alignItems: 'flex-end',
    gap: space.xs,
  },
  fab: {
    position: 'absolute',
    right: space.xl,
    bottom: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    shadowColor: '#7A4A00',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
