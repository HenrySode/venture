import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip, ListRow, Sheet, Divider } from '@/components/ui';
import { useI18n, type TranslationKey } from '@/i18n';
import { formatDate } from '@/lib/format';
import { recentWorkdays, type Period, type PeriodKind } from '@/lib/periods';
import { workdayDate } from '@/lib/workday';
import { colors, space } from '@/theme';

const kinds: { kind: PeriodKind; label: TranslationKey }[] = [
  { kind: 'today', label: 'period.today' },
  { kind: 'week', label: 'period.week' },
  { kind: 'month', label: 'period.month' },
  { kind: 'year', label: 'period.year' },
  { kind: 'all', label: 'period.all' },
];

/** Period chips (Today … All time) plus "Pick a day" for one specific workday. */
export function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const days = recentWorkdays(14);

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.bar}>
        {kinds.map((k) => (
          <Chip key={k.kind} label={t(k.label)} selected={value.kind === k.kind} onPress={() => onChange({ kind: k.kind })} />
        ))}
        <Chip
          icon="calendar"
          label={value.kind === 'day' ? formatDate(workdayDate(value.key), locale) : t('period.pickDay')}
          selected={value.kind === 'day'}
          onPress={() => setOpen(true)}
        />
      </ScrollView>

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('period.pickDayTitle')}>
        <ScrollView style={styles.list}>
          <View style={styles.rows}>
            {days.map((key, i) => (
              <View key={key}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  icon="calendar"
                  iconColor={value.kind === 'day' && value.key === key ? colors.brandStrong : colors.inkMuted}
                  title={i === 0 ? `${t('period.today')} · ${formatDate(workdayDate(key), locale)}` : formatDate(workdayDate(key), locale)}
                  onPress={() => {
                    onChange({ kind: 'day', key });
                    setOpen(false);
                  }}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexGrow: 0 },
  chips: { gap: space.sm },
  list: { maxHeight: 440 },
  rows: { marginHorizontal: -space.xl },
});
