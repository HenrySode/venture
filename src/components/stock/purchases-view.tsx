import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { PlanBanner, PlanGate } from '@/components/access';
import { Button, Card, Divider, EmptyState, Icon, SearchField, SegmentedControl, Sheet, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate, formatQty, formatTime, formatTsh, matchesAllWords } from '@/lib/format';
import { bucketKey, bucketLabel, type Bucket } from '@/lib/periods';
import { stockValue } from '@/lib/stock';
import { canManageStock } from '@/state/access';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, radius, space } from '@/theme';
import type { Purchase } from '@/types/domain';

type Group = Bucket;

const qtyText = (p: Purchase) => [p.cartons ? `${p.cartons} C` : '', p.units ? `${formatQty(p.units)} U` : ''].filter(Boolean).join(' + ');

/** Purchase history: search, grouped by day/week/month, totals, remove (reverses stock and cash). */
export function PurchasesView({ header }: { header: ReactNode }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { user } = useCurrentSession();
  const canEdit = canManageStock(user.role);
  const { purchases, products, removePurchase } = useData();

  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Group>('day');
  const [selected, setSelected] = useState<Purchase | null>(null);

  const list = purchases
    .filter((p) => matchesAllWords(query, p.productName, p.supplierName, p.invoice, p.note))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = list.reduce((sum, p) => sum + p.cost, 0);
  const inventory = products.reduce((sum, p) => sum + stockValue(p), 0);

  const groups = new Map<string, Purchase[]>();
  for (const p of list) {
    const k = bucketKey(p.createdAt, group);
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  const sections = [...groups.entries()].map(([key, data]) => ({ key, data, total: data.reduce((s, p) => s + p.cost, 0) }));

  const label = (key: string) => bucketLabel(key, group, locale, (date) => t('purchases.weekOf', { date }));

  return (
    <View style={styles.root}>
      {header}
      <PlanGate module="stock">
        <SectionList
          sections={sections}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <View style={styles.top}>
              <PlanBanner />
              <View style={styles.stats}>
                <Card style={styles.stat}>
                  <Text variant="caption" color={colors.inkMuted}>
                    {t('purchases.total')}
                  </Text>
                  <Text variant="heading">{formatTsh(total)}</Text>
                  <Text variant="caption" color={colors.inkMuted}>
                    {t('purchases.count', { count: list.length })}
                  </Text>
                </Card>
                <Card style={styles.stat}>
                  <Text variant="caption" color={colors.inkMuted}>
                    {t('purchases.inventory')}
                  </Text>
                  <Text variant="heading">{formatTsh(inventory)}</Text>
                </Card>
              </View>
              <SearchField value={query} onChangeText={setQuery} placeholder={t('purchases.search')} />
              <SegmentedControl<Group>
                value={group}
                onChange={setGroup}
                options={[
                  { value: 'day', label: t('purchases.groupDay') },
                  { value: 'week', label: t('purchases.groupWeek') },
                  { value: 'month', label: t('purchases.groupMonth') },
                ]}
              />
            </View>
          }
          ListEmptyComponent={
            purchases.length === 0 ? (
              <EmptyState
                icon="purchases"
                title={t('purchases.empty')}
                message={t('purchases.emptyBody')}
                action={canEdit ? <Button label={t('purchases.add')} icon="add" onPress={() => router.push('/restock')} /> : undefined}
              />
            ) : (
              <EmptyState icon="search" title={t('sell.noResults', { query })} />
            )
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHead}>
              <Text variant="overline" color={colors.inkMuted}>
                {label(section.key).toUpperCase()}
              </Text>
              <Text variant="label">{formatTsh(section.total)}</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelected(item)}
              style={({ pressed }) => [
                styles.row,
                index === 0 && styles.rowFirst,
                index === section.data.length - 1 && styles.rowLast,
                index < section.data.length - 1 && styles.rowBorder,
                pressed && { backgroundColor: colors.surfaceMuted },
              ]}>
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
                  {[qtyText(item), item.supplierName, item.invoice].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text variant="bodyStrong">{formatTsh(item.cost)}</Text>
            </Pressable>
          )}
        />
      </PlanGate>

      {canEdit && purchases.length ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('purchases.add')} onPress={() => router.push('/restock')} style={({ pressed }) => [styles.fab, pressed && { backgroundColor: colors.brandStrong }]}>
          <Icon name="add" size={22} color={colors.ink} />
          <Text variant="bodyStrong">{t('purchases.add')}</Text>
        </Pressable>
      ) : null}

      <Sheet visible={selected !== null} onClose={() => setSelected(null)} title={selected?.productName ?? ''}>
        {selected ? (
          <View style={styles.sheet}>
            <Card padded={false}>
              <Detail label={t('receipt.date')} value={`${formatDate(selected.createdAt, locale)} · ${formatTime(selected.createdAt)}`} />
              <Divider />
              <Detail label={t('forgotten.quantity')} value={qtyText(selected)} />
              <Divider />
              <Detail label={t('restock.cost')} value={formatTsh(selected.cost)} />
              {selected.supplierName ? (
                <>
                  <Divider />
                  <Detail label={t('restock.supplier')} value={selected.supplierName} />
                </>
              ) : null}
              {selected.invoice ? (
                <>
                  <Divider />
                  <Detail label={t('restock.invoice')} value={selected.invoice} />
                </>
              ) : null}
              {selected.note ? (
                <>
                  <Divider />
                  <Detail label={t('restock.note')} value={selected.note} />
                </>
              ) : null}
            </Card>
            {canEdit ? (
              <>
                <Text variant="body" color={colors.inkMuted}>
                  {t('purchases.removeBody', { amount: formatTsh(selected.cost) })}
                </Text>
                <Button
                  label={t('purchases.remove')}
                  variant="danger"
                  icon="trash"
                  onPress={() => {
                    removePurchase(selected.id);
                    setSelected(null);
                    toast({ message: t('purchases.removed'), icon: 'undo' });
                  }}
                  block
                />
              </>
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text variant="body" color={colors.inkMuted} style={styles.flex}>
        {label}
      </Text>
      <Text variant="bodyStrong" style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: {
    paddingHorizontal: space.xl,
    paddingBottom: 96,
  },
  top: {
    gap: space.md,
  },
  stats: {
    flexDirection: 'row',
    gap: space.md,
  },
  stat: {
    flex: 1,
    gap: 2,
    padding: space.md,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  sheet: {
    gap: space.md,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
