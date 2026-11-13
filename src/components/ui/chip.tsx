import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, space } from '@/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

/** Pill used for filters (categories, days) and quick actions. */
export function Chip({ label, selected = false, icon, onPress }: { label: string; selected?: boolean; icon?: IconName; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && !selected && styles.pressed]}>
      {icon ? <Icon name={icon} size={16} color={selected ? colors.ink : colors.inkMuted} /> : null}
      <Text variant="label" color={selected ? colors.ink : colors.inkMuted} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 38,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
});
