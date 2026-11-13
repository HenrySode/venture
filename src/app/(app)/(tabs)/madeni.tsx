import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanBanner, PlanGate } from '@/components/access';
import { Card, EmptyState, Icon, SearchField, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { debtors, type Debtor } from '@/lib/credits';
import { formatDate, formatTsh, initials, matchesAllWords } from '@/lib/format';
import { useData } from '@/state/data';
import { colors, radius, space } from '@/theme';

/** Seller's Madeni: customers who owe, biggest first. */
export default function MadeniScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { credits } = useData();
  const [query, setQuery] = useState('');

  const all = debtors(credits);
  const list = all.filter((d) => matchesAllWords(query, d.name, d.phone));
  const total = all.reduce((s, d) => s + d.owed, 0);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header" style={styles.flex}>
          {t('madeni.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('madeni.newCredit')}
          onPress={() => router.push('/credit-sale')}
          style={({ pressed }) => [styles.add, pressed && { backgroundColor: colors.brandStrong }]}>
          <Icon name="add" size={18} color={colors.ink} />
          <Text variant="label">{t('madeni.newCredit')}</Text>
        </Pressable>
      </View>

      <PlanGate module="credit">
        <FlatList
          data={list}
          keyExtractor={(d) => d.key}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <View style={styles.top}>
              <PlanBanner />
              <Card style={styles.summary}>
                <Text variant="label" color={colors.inkMuted}>
                  {t('madeni.totalOwed')}
                </Text>
                <Text variant="display" color={total ? colors.danger : colors.ink}>
                  {formatTsh(total)}
                </Text>
                <Text variant="caption" color={colors.inkMuted}>
                  {t('madeni.customers', { count: all.length })}
                </Text>
              </Card>
              {all.length > 3 ? <SearchField value={query} onChangeText={setQuery} placeholder={t('madeni.search')} /> : null}
            </View>
          }
          ListEmptyComponent={
            all.length === 0 ? (
              <EmptyState icon="credit" title={t('madeni.empty')} message={t('madeni.emptyBody')} />
            ) : (
              <EmptyState icon="search" title={t('sell.noResults', { query })} />
            )
          }
          renderItem={({ item }) => <DebtorRow debtor={item} onPress={() => router.push({ pathname: '/madeni/[key]', params: { key: item.key } })} />}
        />
      </PlanGate>
    </SafeAreaView>
  );
}

function DebtorRow({ debtor: d, onPress }: { debtor: Debtor; onPress: () => void }) {
  const { t, locale } = useI18n();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <View style={styles.avatar}>
        <Text variant="label">{initials(d.name)}</Text>
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {d.name}
        </Text>
        <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
          {t('madeni.since', { date: formatDate(d.since, locale) })} · {t('madeni.openItems', { count: d.openLines })}
        </Text>
      </View>
      <Text variant="bodyStrong" color={colors.danger}>
        {formatTsh(d.owed)}
      </Text>
      <Icon name="chevronRight" size={16} color={colors.inkSubtle} />
    </Pressable>
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
    paddingVertical: space.sm,
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
    gap: space.sm,
  },
  top: {
    gap: space.md,
    marginBottom: space.sm,
  },
  summary: {
    gap: space.xs,
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
});
