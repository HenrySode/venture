import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useT } from '@/i18n';
import { colors, radius, space, toneColors, type Tone } from '@/theme';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export function Card({ style, children, padded = true, ...rest }: ViewProps & { padded?: boolean }) {
  return (
    <View {...rest} style={[styles.card, padded && styles.cardPadded, style]}>
      {children}
    </View>
  );
}

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const c = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {icon ? <Icon name={icon} size={12} color={c.fg} /> : null}
      <Text variant="caption" color={c.fg} style={styles.badgeText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const toneIcon: Record<Tone, IconName> = {
  neutral: 'info',
  brand: 'info',
  info: 'info',
  success: 'check',
  warning: 'warning',
  danger: 'error',
};

type BannerProps = {
  tone?: Tone;
  title?: string;
  message: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
};

export function Banner({ tone = 'info', title, message, icon, action, style }: BannerProps) {
  const c = toneColors[tone];
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      style={[styles.banner, { backgroundColor: c.bg, borderColor: c.fg + '33' }, style]}>
      <Icon name={icon ?? toneIcon[tone]} size={20} color={c.fg} />
      <View style={styles.bannerBody}>
        {title ? (
          <Text variant="label" color={c.fg}>
            {title}
          </Text>
        ) : null}
        <Text variant="caption" color={colors.ink}>
          {message}
        </Text>
        {action ? (
          <View style={styles.bannerAction}>
            <Button label={action.label} variant="secondary" onPress={action.onPress} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

type StateProps = {
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
};

export function EmptyState({ icon = 'apps', title, message, action }: StateProps) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Icon name={icon} size={30} color={colors.brandStrong} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="body" color={colors.inkMuted} align="center">
          {message}
        </Text>
      ) : null}
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <EmptyState
      icon="error"
      title={t('common.somethingWrong')}
      message={message ?? t('common.failedToLoad')}
      action={onRetry ? <Button label={t('common.retry')} variant="secondary" icon="restore" onPress={onRetry} /> : null}
    />
  );
}

/** Pulsing placeholder block for loading states. */
export function Skeleton({ width = '100%', height = 16, style }: { width?: ViewStyle['width']; height?: number; style?: StyleProp<ViewStyle> }) {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ width, height, opacity }, styles.skeleton, style]} />;
}

export function StatTile({ label, value, hint, tone = 'neutral', icon }: { label: string; value: string; hint?: string; tone?: Tone; icon?: IconName }) {
  const c = toneColors[tone];
  return (
    <Card style={styles.stat}>
      <View style={styles.statHeader}>
        {icon ? (
          <View style={[styles.statIcon, { backgroundColor: c.bg }]}>
            <Icon name={icon} size={16} color={c.fg} />
          </View>
        ) : null}
        <Text variant="caption" color={colors.inkMuted} style={styles.flex} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Text variant="title" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? (
        <Text variant="caption" color={colors.inkMuted}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPadded: {
    padding: space.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs + 1,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontWeight: '700',
  },
  banner: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  bannerBody: {
    flex: 1,
    gap: space.xxs,
  },
  bannerAction: {
    marginTop: space.sm,
    alignSelf: 'flex-start',
  },
  state: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xxxl,
    paddingHorizontal: space.xl,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  stateAction: {
    marginTop: space.md,
  },
  skeleton: {
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  stat: {
    flex: 1,
    gap: space.xs,
    minWidth: 140,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
