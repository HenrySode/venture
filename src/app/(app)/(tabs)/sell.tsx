import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanBanner, UpgradeSheet } from '@/components/access';
import { NetworkPill } from '@/components/sell/network-pill';
import { ProductCard } from '@/components/sell/product-card';
import { TapQtySheet } from '@/components/sell/tap-qty-sheet';
import { Chip, Divider, EmptyState, Icon, ListRow, SearchField, SegmentedControl, Sheet, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { formatQty, formatTsh, productMatches } from '@/lib/format';
import { priceOf } from '@/mocks/sales';
import { devNetwork } from '@/services/client';
import { planAccess } from '@/state/access';
import { useBasket } from '@/state/basket';
import { StockError, useData } from '@/state/data';
import { useCurrentSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, radius, space } from '@/theme';
import type { Product, SaleKind } from '@/types/domain';

type Mode = 'quick' | 'basket';

export default function SellScreen() {
  const t = useT();
  const router = useRouter();
  const session = useCurrentSession();
  const access = planAccess(session);
  const { products, sell, unsellReceipt } = useData();
  const basket = useBasket();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('quick');
  const [menuOpen, setMenuOpen] = useState(false);
  const [tapSheet, setTapSheet] = useState(false);
  const [upgrade, setUpgrade] = useState(false);

  const canCarton = access.hasModule('cartonPricing');
  const canBasket = access.hasModule('basket');
  const canCredit = access.hasModule('credit');
  // Basket mode falls back to quick sell if the plan changes underneath.
  const activeMode: Mode = canBasket ? mode : 'quick';

  const categories = [...new Set(products.map((p) => p.category))];
  const list = products.filter((p) => (!category || p.category === category) && productMatches(p, query));

  const basketCount = basket.lines.length;
  const basketTotal = basket.lines.reduce((sum, l) => {
    const p = products.find((x) => x.id === l.productId);
    return p ? sum + priceOf(p, l.kind) * l.quantity : sum;
  }, 0);

  const onSell = (p: Product, kind: SaleKind) => {
    const qty = basket.tapQty;
    if (activeMode === 'basket') {
      // The basket bar's count and total update right away; no toast needed.
      basket.add(p.id, kind, qty);
      return;
    }
    try {
      const receiptId = sell([{ productId: p.id, kind, quantity: qty }], session.user);
      const offline = devNetwork.get().offline;
      toast({
        message: `${t('sell.sold', { qty: formatQty(qty), name: p.name })} · ${formatTsh(priceOf(p, kind) * qty)}`,
        icon: offline ? 'sync' : 'check',
        action: {
          label: t('sell.undo'),
          onPress: () => {
            unsellReceipt(receiptId);
            toast({ message: t('sell.undone'), icon: 'undo', tone: 'info' });
          },
        },
      });
    } catch (e) {
      if (e instanceof StockError) toast({ message: t('sell.notEnough', { name: e.productName }), tone: 'danger' });
      else throw e;
    }
  };

  const openMenuItem = (go: () => void) => {
    setMenuOpen(false);
    go();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header" style={styles.flex}>
          {t('sell.title')}
        </Text>
        <NetworkPill />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('sell.perTapTitle')}
          onPress={() => setTapSheet(true)}
          style={styles.tapChip}>
          <Text variant="label">{t('sell.perTap', { qty: formatQty(basket.tapQty) })}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('tabs.more')} onPress={() => setMenuOpen(true)} hitSlop={6} style={styles.iconBtn}>
          <Icon name="more" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.controls}>
        <SearchField value={query} onChangeText={setQuery} placeholder={t('sell.searchPlaceholder')} />
        <SegmentedControl<Mode>
          value={activeMode}
          onChange={(m) => (m === 'basket' && !canBasket ? setUpgrade(true) : setMode(m))}
          options={[
            { value: 'quick', label: t('sell.quick') },
            { value: 'basket', label: canBasket ? t('sell.basketMode') : `🔒 ${t('sell.basketMode')}` },
          ]}
        />
      </View>

      {categories.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsBar}>
          <Chip label={t('sell.all')} selected={!category} onPress={() => setCategory(null)} />
          {categories.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c === category ? null : c)} />
          ))}
        </ScrollView>
      ) : null}

      <FlatList
        data={list}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={[styles.list, basketCount > 0 && activeMode === 'basket' && styles.listWithBar]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={<PlanBanner />}
        ListEmptyComponent={
          products.length === 0 ? (
            <EmptyState icon="stock" title={t('sell.noProductsTitle')} message={t('sell.noProductsBody')} />
          ) : (
            <EmptyState icon="search" title={t('sell.noResults', { query })} />
          )
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            tapQty={basket.tapQty}
            cartonUnlocked={canCarton}
            onSell={(kind) => onSell(item, kind)}
            onLocked={() => setUpgrade(true)}
          />
        )}
      />

      {/* Basket bar */}
      {activeMode === 'basket' && basketCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/basket')}
          style={({ pressed }) => [styles.basketBar, pressed && { backgroundColor: colors.brandStrong }]}>
          <View style={styles.basketIcon}>
            <Icon name="basket" size={20} color={colors.ink} />
          </View>
          <View style={styles.flex}>
            <Text variant="caption">{t('sell.basketBar', { count: basketCount })}</Text>
            <Text variant="heading">{formatTsh(basketTotal)}</Text>
          </View>
          <Text variant="bodyStrong">{t('sell.review')}</Text>
          <Icon name="chevronRight" size={18} color={colors.ink} />
        </Pressable>
      ) : null}

      {/* More actions */}
      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={t('sell.title')}>
        <View style={styles.menu}>
          <ListRow
            icon="credit"
            title={t('sell.creditSale')}
            trailing={canCredit ? undefined : <Icon name="lock" size={16} color={colors.inkSubtle} />}
            onPress={() => openMenuItem(() => (canCredit ? router.push('/credit-sale') : setUpgrade(true)))}
          />
          <Divider />
          <ListRow icon="clock" title={t('sell.forgottenSale')} onPress={() => openMenuItem(() => router.push('/forgotten-sale'))} />
          <Divider />
          <ListRow
            icon="sliders"
            title={t('sell.perTapTitle')}
            trailing={<Text variant="label">{t('sell.perTap', { qty: formatQty(basket.tapQty) })}</Text>}
            onPress={() => openMenuItem(() => setTapSheet(true))}
          />
        </View>
      </Sheet>

      <TapQtySheet visible={tapSheet} value={basket.tapQty} onClose={() => setTapSheet(false)} onChange={basket.setTapQty} />
      <UpgradeSheet visible={upgrade} onClose={() => setUpgrade(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  tapChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    gap: space.sm,
    paddingHorizontal: space.xl,
  },
  chipsBar: {
    flexGrow: 0,
  },
  chips: {
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  list: {
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
  },
  listWithBar: {
    paddingBottom: 110,
  },
  basketBar: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    shadowColor: '#7A4A00',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  basketIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    marginHorizontal: -space.xl,
  },
});
