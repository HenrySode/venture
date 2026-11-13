import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, Sheet, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate } from '@/lib/format';
import { planAccess } from '@/state/access';
import { useCurrentSession } from '@/state/session';
import { colors, space } from '@/theme';
import type { HubModule, Role } from '@/types/domain';

/** Grace / lapsed / trial notice shown at the top of signed-in screens. */
export function PlanBanner() {
  const { t, locale } = useI18n();
  const { entitlement, user } = useCurrentSession();
  const [showUpgrade, setShowUpgrade] = useState(false);
  if (entitlement.plan !== 'hub') return null;

  const date = entitlement.validUntil ? formatDate(entitlement.validUntil, locale) : '';
  const action = user.isOwner ? { label: t('plan.subscribe'), onPress: () => setShowUpgrade(true) } : undefined;

  let banner: ReactNode = null;
  if (entitlement.status === 'grace') {
    banner = <Banner tone="warning" icon="hourglass" message={t('plan.graceBanner', { date })} action={action} />;
  } else if (entitlement.status === 'lapsed') {
    banner = <Banner tone="danger" icon="lock" message={t('plan.lapsedBanner')} action={action} />;
  } else if (entitlement.status === 'trial') {
    banner = <Banner tone="info" icon="clock" message={t('plan.trialBanner', { date })} />;
  }

  return (
    <>
      {banner}
      <UpgradeSheet visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}

/** Explains a locked Hub tool. Payment itself is out of scope (PRD §2). */
export function UpgradeSheet({ visible, onClose, reason = 'lite' }: { visible: boolean; onClose: () => void; reason?: 'lite' | 'module' }) {
  const { t } = useI18n();
  const { user } = useCurrentSession();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('plan.subscribe')}>
      <View style={styles.sheetBody}>
        <Text variant="body">{reason === 'module' ? t('plan.moduleLocked') : t('plan.liteLocked')}</Text>
        <Text variant="body" color={colors.inkMuted}>
          {user.isOwner ? t('plan.liteUpgrade') : t('plan.ownerPays')}
        </Text>
        <Button label={user.isOwner ? t('plan.subscribe') : t('common.close')} onPress={onClose} block />
      </View>
    </Sheet>
  );
}

/** Renders children only if the Hub tool is available; otherwise a locked state. */
export function PlanGate({ module, children }: { module: HubModule; children: ReactNode }) {
  const { t } = useI18n();
  const session = useCurrentSession();
  const access = planAccess(session);
  const [showUpgrade, setShowUpgrade] = useState(false);
  if (access.hasModule(module)) return <>{children}</>;

  const reason = access.hubToolsOn ? 'module' : 'lite';
  return (
    <>
      <EmptyState
        icon="lock"
        title={reason === 'module' ? t('plan.moduleLocked') : t('plan.liteLocked')}
        message={session.user.isOwner ? t('plan.liteUpgrade') : t('plan.ownerPays')}
        action={<Button label={t('plan.subscribe')} onPress={() => setShowUpgrade(true)} />}
      />
      <UpgradeSheet visible={showUpgrade} onClose={() => setShowUpgrade(false)} reason={reason} />
    </>
  );
}

/** Renders children only for the given roles. */
export function RoleGate({ roles, children, fallback = null }: { roles: Role[]; children: ReactNode; fallback?: ReactNode }) {
  const { user } = useCurrentSession();
  return <>{roles.includes(user.role) ? children : fallback}</>;
}

const styles = StyleSheet.create({
  sheetBody: {
    gap: space.md,
  },
});
