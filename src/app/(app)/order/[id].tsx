import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Divider, EmptyState, Screen, Sheet, Text, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate, formatQty, formatTsh } from '@/lib/format';
import { lineCost, orderTotal } from '@/lib/orders';
import { mockRequest } from '@/services/client';
import { canManageStock } from '@/state/access';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, space } from '@/theme';

/** Purchase order: draft (edit / delete / receive) or received (read only). */
export default function OrderScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { user } = useCurrentSession();
  const canEdit = canManageStock(user.role);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, suppliers, products, receiveOrder, deleteOrder } = useData();
  const [confirm, setConfirm] = useState<'receive' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);

  const order = orders.find((o) => String(o.id) === id);
  if (!order) {
    return (
      <Screen header={<TopBar />}>
        <EmptyState icon="receipt" title={t('orders.empty')} />
      </Screen>
    );
  }

  const supplier = suppliers.find((s) => s.id === order.supplierId);
  const total = orderTotal(order);
  const draft = order.status === 'draft';

  const receive = async () => {
    setBusy(true);
    await mockRequest(() => receiveOrder(order.id, user), 600).catch(() => undefined);
    setBusy(false);
    setConfirm(null);
    toast({ message: t('orders.receivedToast') });
  };

  const remove = () => {
    setConfirm(null);
    deleteOrder(order.id);
    toast({ message: t('orders.deleted'), icon: 'trash' });
    router.back();
  };

  return (
    <Screen
      header={<TopBar title={t('orders.number', { id: order.id })} />}
      footer={
        canEdit && draft ? (
          <View style={styles.footer}>
            <Button label={t('orders.receive')} size="lg" icon="check" onPress={() => setConfirm('receive')} block />
            <View style={styles.actions}>
              <Button label={t('orders.edit')} variant="secondary" onPress={() => router.push({ pathname: '/order/edit', params: { id: String(order.id) } })} style={styles.flex} />
              <Button label={t('orders.delete')} variant="ghost" onPress={() => setConfirm('delete')} style={styles.flex} />
            </View>
          </View>
        ) : null
      }>
      <Card style={styles.head}>
        <View style={styles.row}>
          <Text variant="heading" style={styles.flex}>
            {supplier?.name ?? '—'}
          </Text>
          <Badge label={draft ? t('orders.draft') : t('orders.received')} tone={draft ? 'warning' : 'success'} />
        </View>
        <Text variant="caption" color={colors.inkMuted}>
          {t('orders.createdOn', { date: formatDate(order.createdAt, locale) })}
          {order.receivedAt ? ` · ${t('orders.receivedOn', { date: formatDate(order.receivedAt, locale) })}` : ''}
        </Text>
      </Card>

      <Card padded={false}>
        {order.lines.map((l, i) => {
          const p = products.find((x) => x.id === l.productId);
          return (
            <View key={`${l.productId}-${i}`}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.line}>
                <View style={styles.flex}>
                  <Text variant="label">{p?.name ?? '—'}</Text>
                  <Text variant="caption" color={colors.inkMuted}>
                    {[l.cartons ? `${l.cartons} C × ${formatTsh(l.costCarton)}` : '', l.units ? `${formatQty(l.units)} U × ${formatTsh(l.costUnit)}` : ''].filter(Boolean).join(' + ')}
                  </Text>
                </View>
                <Text variant="label">{formatTsh(lineCost(l))}</Text>
              </View>
            </View>
          );
        })}
        <Divider />
        <View style={styles.line}>
          <Text variant="heading" style={styles.flex}>
            {t('orders.total')}
          </Text>
          <Text variant="heading">{formatTsh(total)}</Text>
        </View>
      </Card>

      {order.notes ? (
        <Card>
          <Text variant="caption" color={colors.inkMuted}>
            {t('orders.notes')}
          </Text>
          <Text variant="body">{order.notes}</Text>
        </Card>
      ) : null}

      <Sheet visible={confirm === 'receive'} onClose={() => setConfirm(null)} title={t('orders.receiveTitle')}>
        <Text variant="body" color={colors.inkMuted}>
          {t('orders.receiveBody', { amount: formatTsh(total) })}
        </Text>
        <View style={styles.actions}>
          <Button label={t('common.cancel')} variant="secondary" onPress={() => setConfirm(null)} style={styles.flex} />
          <Button label={t('orders.receive')} loading={busy} onPress={receive} style={styles.flex} />
        </View>
      </Sheet>

      <Sheet visible={confirm === 'delete'} onClose={() => setConfirm(null)} title={t('orders.delete')}>
        <View style={styles.actions}>
          <Button label={t('common.cancel')} variant="secondary" onPress={() => setConfirm(null)} style={styles.flex} />
          <Button label={t('orders.delete')} variant="danger" onPress={remove} style={styles.flex} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { gap: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  footer: { gap: space.sm },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
});
