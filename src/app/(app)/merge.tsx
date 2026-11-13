import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PlanGate } from '@/components/access';
import { Banner, Button, Card, Chip, Icon, Screen, SearchField, Text, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { formatQty, productMatches } from '@/lib/format';
import { sellsByCarton, totalUnits } from '@/lib/stock';
import { mockRequest } from '@/services/client';
import { useData } from '@/state/data';
import { useToast } from '@/state/toast';
import { colors, radius, space } from '@/theme';
import type { Product } from '@/types/domain';

/** Pick 2+ products → choose which to keep → stock is combined, other names become search aliases. */
export default function MergeScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { products, mergeProducts } = useData();

  const [step, setStep] = useState<'pick' | 'keep'>('pick');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [keepId, setKeepId] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const chosen = products.filter((p) => selected.includes(p.id));
  const keep = chosen.find((p) => p.id === keepId) ?? chosen[0];
  const categories = [...new Set(products.map((p) => p.category))].sort();
  const combined = chosen.reduce((sum, p) => sum + totalUnits(p), 0);

  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const merge = async () => {
    if (!keep) return;
    setBusy(true);
    await mockRequest(() => mergeProducts(keep.id, selected, category), 600).catch(() => undefined);
    toast({ message: t('merge.merged') });
    router.back();
  };

  if (step === 'keep' && keep) {
    return (
      <Screen
        header={<TopBar title={t('merge.title')} onBack={() => setStep('pick')} />}
        footer={<Button label={t('merge.confirm', { count: chosen.length })} size="lg" icon="swap" loading={busy} onPress={merge} block />}>
        <Text variant="label">{t('merge.keep')}</Text>
        {chosen.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: p.id === keep.id }}
            onPress={() => setKeepId(p.id)}
            style={[styles.option, p.id === keep.id && styles.optionOn]}>
            <View style={[styles.radio, p.id === keep.id && styles.radioOn]}>{p.id === keep.id ? <View style={styles.radioDot} /> : null}</View>
            <View style={styles.flex}>
              <Text variant="bodyStrong">{p.name}</Text>
              <Text variant="caption" color={colors.inkMuted}>
                {p.category} · {stockText(p, t)}
              </Text>
            </View>
          </Pressable>
        ))}

        <Text variant="label">{t('merge.category')}</Text>
        <View style={styles.chips}>
          <Chip label={`${t('merge.keepCategory')} · ${keep.category}`} selected={category === null} onPress={() => setCategory(null)} />
          {categories
            .filter((c) => c !== keep.category)
            .map((c) => (
              <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
            ))}
        </View>

        <Card style={styles.result}>
          <Text variant="overline" color={colors.inkMuted}>
            {t('merge.result').toUpperCase()}
          </Text>
          <Text variant="heading">{keep.name}</Text>
          <Text variant="body">{t('product.totalUnits', { count: formatQty(combined) })}</Text>
          <Text variant="caption" color={colors.inkMuted}>
            {t('product.aliases')}: {chosen.filter((p) => p.id !== keep.id).map((p) => p.name).join(', ')}
          </Text>
        </Card>
        <Banner tone="info" message={t('merge.aliasesNote')} />
      </Screen>
    );
  }

  const list = products.filter((p) => productMatches(p, query));

  return (
    <Screen
      scroll={false}
      header={<TopBar title={t('merge.title')} />}
      footer={
        <Button
          label={`${t('merge.next')} · ${t('merge.selected', { count: selected.length })}`}
          size="lg"
          disabled={selected.length < 2}
          onPress={() => {
            setKeepId(selected[0]);
            setStep('keep');
          }}
          block
        />
      }>
      <PlanGate module="stock">
        <Text variant="body" color={colors.inkMuted}>
          {t('merge.lead')}
        </Text>
        <SearchField value={query} onChangeText={setQuery} placeholder={t('stock.search')} />
        <FlatList
          data={list}
          keyExtractor={(p) => String(p.id)}
          style={styles.flex}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: p }) => {
            const on = selected.includes(p.id);
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggle(p.id)}
                style={[styles.option, on && styles.optionOn]}>
                <View style={[styles.check, on && styles.checkOn]}>{on ? <Icon name="check" size={16} color={colors.ink} /> : null}</View>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text variant="caption" color={colors.inkMuted}>
                    {p.category} · {stockText(p, t)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </PlanGate>
    </Screen>
  );
}

function stockText(p: Product, t: ReturnType<typeof useT>) {
  return sellsByCarton(p) ? t('sell.stockLine', { cartons: p.stockCartons, units: formatQty(p.stockUnits) }) : `${formatQty(p.stockUnits)} ${t('sell.unit').toLowerCase()}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    gap: space.sm,
    paddingBottom: space.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionOn: {
    borderColor: colors.brand,
    backgroundColor: colors.brandTint,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: colors.brandStrong,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.brandStrong,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  result: {
    gap: space.xs,
  },
});
