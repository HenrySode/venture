import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PlanBanner } from '@/components/access';
import { Badge, Card, EmptyState, Screen, Text, type IconName } from '@/components/ui';
import { useT } from '@/i18n';
import { space } from '@/theme';

type ComingSoonProps = {
  title: string;
  icon: IconName;
  /** Which PRD milestone delivers this screen, e.g. "M2". */
  milestone: string;
  children?: ReactNode;
};

/** Tab placeholder for screens built in later milestones. */
export function ComingSoon({ title, icon, milestone, children }: ComingSoonProps) {
  const t = useT();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header" style={styles.flex}>
          {title}
        </Text>
        <Badge label={milestone} tone="brand" />
      </View>
      <PlanBanner />
      {children}
      <Card>
        <EmptyState icon={icon} title={t('common.comingSoon')} message={t('placeholder.body', { milestone })} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.sm,
  },
});
