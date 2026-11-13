import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { colors, radius, space, touch } from '@/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  /** Right-hand content (badge, value). A chevron is added when `onPress` is set. */
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

export function ListRow({ title, subtitle, icon, iconColor, trailing, onPress, disabled, destructive }: ListRowProps) {
  const fg = destructive ? colors.danger : colors.ink;
  const content = (
    <>
      {icon ? (
        <View style={[styles.rowIcon, destructive && { backgroundColor: colors.dangerSoft }]}>
          <Icon name={icon} size={18} color={iconColor ?? (destructive ? colors.danger : colors.brandStrong)} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text variant="bodyStrong" color={fg} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color={colors.inkMuted} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {onPress && !destructive ? <Icon name="chevronRight" size={16} color={colors.inkSubtle} /> : null}
    </>
  );

  if (!onPress) return <View style={[styles.row, disabled && styles.disabled]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }, disabled && styles.disabled]}>
      {content}
    </Pressable>
  );
}

type SegmentedOption<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && styles.segmentSelected]}>
            <Text variant="label" color={selected ? colors.ink : colors.inkMuted} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({ title, subtitle, value, onChange }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color={colors.inkMuted}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.brand, false: colors.borderStrong }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.min + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  segmented: {
    flexDirection: 'row',
    padding: space.xs,
    gap: space.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    minHeight: touch.min - 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
