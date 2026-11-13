import { useState } from 'react';
import { ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip, EmptyState, Icon, SearchField, Text, TopBar } from '@/components/ui';
import { useI18n, type TFunction } from '@/i18n';
import { activityKinds, isDestructive, kindIcon, kindOf, type ActivityKind } from '@/lib/activity';
import { formatDate, formatTime, formatTsh, isoDay, matchesAllWords } from '@/lib/format';
import { bucketKey } from '@/lib/periods';
import { useData } from '@/state/data';
import type { ResetScope } from '@/state/data';
import { colors, radius, space } from '@/theme';
import type { ActivityEntry, RestoreScope } from '@/types/domain';

/** Readable "what" for an entry; some actions store a code instead of a name. */
function entityText(e: ActivityEntry, t: TFunction): string {
  switch (e.action) {
    case 'stockCount':
      return t('activity.products', { count: e.entity });
    case 'cashSet':
      return formatTsh(Number(e.entity));
    case 'restore':
      return t(`backup.scopes.${e.entity as RestoreScope}`);
    case 'reset':
      return t(`backup.resetScopes.${e.entity as ResetScope}`);
    default:
      return e.entity;
  }
}

/** Admin: who did what, newest first, grouped by day. */
export default function ActivityScreen() {
  const { t, locale } = useI18n();
  const { activity } = useData();
  const [kind, setKind] = useState<ActivityKind | null>(null);
  const [query, setQuery] = useState('');

  const list = activity
    .filter((e) => (!kind || kindOf[e.action] === kind) && matchesAllWords(query, t(`activity.actions.${e.action}`), entityText(e, t), e.userName))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const groups = new Map<string, ActivityEntry[]>();
  for (const e of list) {
    const k = bucketKey(e.createdAt, 'day');
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const sections = [...groups.entries()].map(([key, data]) => ({ key, data }));

  const now = new Date();
  const today = isoDay(now);
  now.setDate(now.getDate() - 1);
  const yesterday = isoDay(now);
  const dayLabel = (key: string) =>
    key === today ? t('forgotten.today') : key === yesterday ? t('forgotten.yesterday') : formatDate(`${key}T12:00:00`, locale);

  return (
    <SafeAreaView style={styles.root}>
      <TopBar title={t('activity.title')} />
      <SectionList
        sections={sections}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={styles.top}>
            <SearchField value={query} onChangeText={setQuery} placeholder={t('activity.search')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label={t('activity.all')} selected={kind === null} onPress={() => setKind(null)} />
              {activityKinds.map((k) => (
                <Chip key={k} label={t(`activity.kinds.${k}`)} icon={kindIcon[k]} selected={kind === k} onPress={() => setKind(k)} />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          activity.length === 0 ? (
            <EmptyState icon="activity" title={t('activity.empty')} message={t('activity.emptyBody')} />
          ) : (
            <EmptyState icon="search" title={t('activity.noMatch')} />
          )
        }
        renderSectionHeader={({ section }) => (
          <Text variant="overline" color={colors.inkMuted} style={styles.sectionHead}>
            {dayLabel(section.key).toUpperCase()}
          </Text>
        )}
        renderItem={({ item, index, section }) => {
          const danger = isDestructive(item.action);
          const entity = entityText(item, t);
          return (
            <View
              style={[
                styles.row,
                index === 0 && styles.rowFirst,
                index === section.data.length - 1 && styles.rowLast,
                index < section.data.length - 1 && styles.rowBorder,
              ]}>
              <View style={[styles.icon, danger && { backgroundColor: colors.dangerSoft }]}>
                <Icon name={kindIcon[kindOf[item.action]]} size={18} color={danger ? colors.danger : colors.brandStrong} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {t(`activity.actions.${item.action}`)}
                </Text>
                {entity ? (
                  <Text variant="body" numberOfLines={1}>
                    {entity}
                  </Text>
                ) : null}
                <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
                  {t('activity.by', { name: item.userName })}
                </Text>
              </View>
              <Text variant="caption" color={colors.inkMuted}>
                {formatTime(item.createdAt)}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
  },
  top: {
    gap: space.md,
  },
  chips: {
    gap: space.sm,
  },
  sectionHead: {
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
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
