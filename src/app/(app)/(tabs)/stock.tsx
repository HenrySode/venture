import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanBanner, UpgradeSheet } from '@/components/access';
import { ProductRow } from '@/components/stock/product-row';
import { Banner, Chip, Divider, EmptyState, Icon, ListRow, SearchField, SegmentedControl, Sheet, Text } from '@/components/ui';
import { useT, type TranslationKey } from '@/i18n';
import { daysUntil, formatTsh, productMatches } from '@/lib/format';
import { stockValue, totalUnits } from '@/lib/stock';
import { isLowStock, isOutOfStock } from '@/mocks/products';
import { canManageStock, planAccess } from '@/state/access';
import { useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { colors, radius, space } from '@/theme';
import type { HubModule, Product } from '@/types/domain';

type Filter = 'all' | 'low' | 'out' | 'expiring';
type SortKey = 'mostSold' | 'name' | 'price' | 'date' | 'category' | 'stock';
type View_ = 'list' | 'category';

const sortLabels: Record<SortKey, TranslationKey> = {
  mostSold: 'stock.sortMostSold',
  name: 'stock.sortName',
  price: 'stock.sortPrice',
  date: 'stock.sortDate',
  category: 'stock.sortCategory',
  stock: 'stock.sortStock',
};

const isExpiring = (p: Product) => p.expiresAt !== null && daysUntil(p.expiresAt) <= 7;

/** Products list for Admin, Stock (manage) and Supervisor (view only). */
export default function StockScreen() {
  const t = useT();
  const router = useRouter();
  const session = useCurrentSession();
  const access = planAccess(session);
  const canEdit = canManageStock(session.user.role);
  const { products, sales } = useData();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [desc, setDesc] = useState(false);
  const [view, setView] = useState<View_>('list');
  const [sortOpen, setSortOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [upgrade, setUpgrade] = useState(false);

  const sold = new Map<number, number>();
  for (const s of sales) {
    const p = products.find((x) => x.id === s.productId);
    sold.set(s.productId, (sold.get(s.productId) ?? 0) + s.quantity * (s.kind === 'carton' ? (p?.unitsPerCarton ?? 1) : 1));
  }

  const lowCount = products.filter((p) => !isOutOfStock(p) && isLowStock(p)).length;
  const outCount = products.filter(isOutOfStock).length;
  const value = products.reduce((sum, p) => sum + stockValue(p), 0);

  const compare = (a: Product, b: Product): number => {
    switch (sortKey) {
      case 'mostSold':
        return (sold.get(a.id) ?? 0) - (sold.get(b.id) ?? 0);
      case 'price':
        return a.sellPriceUnit - b.sellPriceUnit;
      case 'date':
        return a.createdAt.localeCompare(b.createdAt);
      case 'category':
        return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      case 'stock':
        return totalUnits(a) - totalUnits(b);
      default:
        return a.name.localeCompare(b.name);
    }
  };

  const list = products
    .filter((p) => productMatches(p, query))
    .filter((p) => (filter === 'low' ? !isOutOfStock(p) && isLowStock(p) : filter === 'out' ? isOutOfStock(p) : filter === 'expiring' ? isExpiring(p) : true))
    .sort((a, b) => (desc ? -compare(a, b) : compare(a, b)));

  const sections =
    view === 'category'
      ? [...new Set(list.map((p) => p.category))].sort().map((c) => ({ title: c, data: list.filter((p) => p.category === c) }))
      : [{ title: '', data: list }];

  const gated = (module: HubModule, go: () => void) => () => {
    setToolsOpen(false);
    if (access.hasModule(module)) go();
    else setUpgrade(true);
  };

  const tools: { icon: 'activity' | 'swap' | 'purchases' | 'suppliers'; label: TranslationKey; module: HubModule; go: () => void }[] = [
    { icon: 'activity', label: 'stock.count', module: 'stock', go: () => router.push('/stock-count') },
    { icon: 'swap', label: 'stock.merge', module: 'stock', go: () => router.push('/merge') },
    { icon: 'purchases', label: 'stock.purchases', module: 'stock', go: () => router.push('/all-purchases') },
    { icon: 'suppliers', label: 'stock.suppliers', module: 'suppliers', go: () => router.push('/all-suppliers') },
  ];
  // The Stock role already has Purchases and Suppliers as tabs.
  const visibleTools = session.user.role === 'stock' ? tools.slice(0, 2) : tools;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header" style={styles.flex}>
          {t('stock.title')}
        </Text>
        {canEdit ? (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel={t('stock.tools')} onPress={() => setToolsOpen(true)} style={styles.iconBtn}>
              <Icon name="tools" size={20} color={colors.ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('stock.add')}
              onPress={() => router.push('/product/edit')}
              style={({ pressed }) => [styles.add, pressed && { backgroundColor: colors.brandStrong }]}>
              <Icon name="add" size={18} color={colors.ink} />
              <Text variant="label">{t('stock.add')}</Text>
            </Pressable>
          </>
        ) : null}
      </View>

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
            {!canEdit ? <Banner tone="info" icon="eye" message={t('stock.readOnly')} /> : null}
            {products.length ? (
              <View style={styles.summary}>
                <Summary label={t('stock.products', { count: products.length })} value={formatTsh(value)} hint={t('stock.value')} />
              </View>
            ) : null}
            <SearchField value={query} onChangeText={setQuery} placeholder={t('stock.search')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label={t('stock.filterAll')} selected={filter === 'all'} onPress={() => setFilter('all')} />
              <Chip label={`${t('stock.filterLow')} · ${lowCount}`} icon="warning" selected={filter === 'low'} onPress={() => setFilter('low')} />
              <Chip label={`${t('stock.filterOut')} · ${outCount}`} selected={filter === 'out'} onPress={() => setFilter('out')} />
              <Chip label={t('stock.filterExpiring')} icon="clock" selected={filter === 'expiring'} onPress={() => setFilter('expiring')} />
            </ScrollView>
            <View style={styles.toolbar}>
              <Pressable accessibilityRole="button" onPress={() => setSortOpen(true)} style={styles.sortBtn} hitSlop={6}>
                <Icon name="sliders" size={16} color={colors.inkMuted} />
                <Text variant="label" color={colors.inkMuted}>
                  {t(sortLabels[sortKey])} {desc ? '↓' : '↑'}
                </Text>
              </Pressable>
              <View style={styles.viewToggle}>
                <SegmentedControl<View_>
                  value={view}
                  onChange={setView}
                  options={[
                    { value: 'list', label: t('stock.viewList') },
                    { value: 'category', label: t('stock.viewCategory') },
                  ]}
                />
              </View>
            </View>
          </View>
        }
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text variant="overline" color={colors.inkMuted} style={styles.sectionTitle}>
              {section.title.toUpperCase()} · {section.data.length}
            </Text>
          ) : null
        }
        ItemSeparatorComponent={Gap}
        ListEmptyComponent={
          products.length === 0 ? (
            <EmptyState icon="stock" title={t('stock.empty')} message={t('stock.emptyBody')} />
          ) : (
            <EmptyState icon="search" title={t('stock.noMatch')} />
          )
        }
        renderItem={({ item }) => (
          <ProductRow product={item} showExpiry={filter === 'expiring'} onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(item.id) } })} />
        )}
      />

      {/* Sort */}
      <Sheet visible={sortOpen} onClose={() => setSortOpen(false)} title={t('stock.sortTitle')}>
        <View style={styles.sortChips}>
          {(Object.keys(sortLabels) as SortKey[]).map((k) => (
            <Chip key={k} label={t(sortLabels[k])} selected={sortKey === k} onPress={() => setSortKey(k)} />
          ))}
        </View>
        <SegmentedControl<'asc' | 'desc'>
          value={desc ? 'desc' : 'asc'}
          onChange={(v) => setDesc(v === 'desc')}
          options={[
            { value: 'asc', label: t('stock.ascending') },
            { value: 'desc', label: t('stock.descending') },
          ]}
        />
      </Sheet>

      {/* Tools */}
      <Sheet visible={toolsOpen} onClose={() => setToolsOpen(false)} title={t('stock.tools')}>
        <View style={styles.menu}>
          {visibleTools.map((tool, i) => (
            <View key={tool.label}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                icon={tool.icon}
                title={t(tool.label)}
                trailing={access.hasModule(tool.module) ? undefined : <Icon name="lock" size={16} color={colors.inkSubtle} />}
                onPress={gated(tool.module, tool.go)}
              />
            </View>
          ))}
        </View>
      </Sheet>

      <UpgradeSheet visible={upgrade} onClose={() => setUpgrade(false)} />
    </SafeAreaView>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.flex}>
        <Text variant="label">{label}</Text>
        <Text variant="caption" color={colors.inkMuted}>
          {hint}
        </Text>
      </View>
      <Text variant="heading">{value}</Text>
    </View>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  list: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
  },
  top: {
    gap: space.md,
    marginBottom: space.md,
  },
  summary: {
    flexDirection: 'row',
    gap: space.md,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandSoft,
  },
  chips: {
    gap: space.sm,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    flexShrink: 1,
  },
  viewToggle: {
    flex: 1,
    maxWidth: 220,
    marginLeft: 'auto',
  },
  sectionTitle: {
    marginTop: space.md,
    marginBottom: space.sm,
  },
  gap: { height: space.sm },
  sortChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  menu: {
    marginHorizontal: -space.xl,
  },
});
