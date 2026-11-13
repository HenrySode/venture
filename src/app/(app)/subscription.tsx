import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Divider, Icon, Screen, Sheet, Text, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { daysUntil, formatDate, formatPhone } from '@/lib/format';
import { mockRequest } from '@/services/client';
import { planAccess } from '@/state/access';
import { useCurrentSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, radius, space } from '@/theme';
import type { HubModule, PlanStatus } from '@/types/domain';

const MODULES: HubModule[] = ['cartonPricing', 'basket', 'credit', 'stock', 'suppliers', 'expiry', 'team', 'reports'];

const statusTone: Record<PlanStatus, 'success' | 'info' | 'warning' | 'danger'> = {
  active: 'success',
  trial: 'info',
  grace: 'warning',
  lapsed: 'danger',
};

/** Owner: current plan, what is included, and how to get more. Payment itself is not built (PRD §2). */
export default function SubscriptionScreen() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const session = useCurrentSession();
  const { entitlement, user, shop } = session;
  const access = planAccess(session);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  const isHub = entitlement.plan === 'hub';
  const included = MODULES.filter((m) => access.hasModule(m));
  const missing = MODULES.filter((m) => !access.hasModule(m));
  const left = entitlement.validUntil ? daysUntil(entitlement.validUntil) : null;

  const requestCall = async () => {
    setBusy(true);
    await mockRequest(() => undefined, 600).catch(() => undefined);
    setBusy(false);
    setAsk(false);
    toast({ message: t('subscription.callRequested', { phone: formatPhone(user.phone ?? shop.phone) }), icon: 'phone' });
  };

  return (
    <Screen
      header={<TopBar title={t('subscription.title')} />}
      footer={missing.length || !isHub || entitlement.status !== 'active' ? <Button label={t('subscription.subscribe')} size="lg" onPress={() => setAsk(true)} block /> : null}>
      {/* Plan */}
      <View style={[styles.plan, isHub ? styles.planHub : styles.planLite]}>
        <View style={styles.planHead}>
          <Icon name={isHub ? 'verified' : 'shop'} size={26} color={colors.ink} />
          <Text variant="title" style={styles.flex}>
            {t(`plan.${entitlement.plan}`)}
          </Text>
          <Badge label={t(`plan.${entitlement.status}`)} tone={statusTone[entitlement.status]} />
        </View>
        {isHub && entitlement.validUntil ? (
          <View>
            <Text variant="body">
              {left !== null && left < 0
                ? t('subscription.ended', { date: formatDate(entitlement.validUntil, locale) })
                : t('subscription.validUntil', { date: formatDate(entitlement.validUntil, locale) })}
            </Text>
            {left !== null && left >= 0 ? (
              <Text variant="caption" color={colors.inkMuted}>
                {t('subscription.daysLeft', { count: left })}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text variant="caption" color={colors.inkMuted}>
          {shop.name}
        </Text>
      </View>

      {/* Included */}
      {included.length ? (
        <>
          <Text variant="overline" color={colors.inkMuted}>
            {t('subscription.included').toUpperCase()}
          </Text>
          <ModuleList modules={included} on />
        </>
      ) : null}

      {/* Can add */}
      {missing.length ? (
        <>
          <Text variant="overline" color={colors.inkMuted}>
            {t('subscription.canAdd').toUpperCase()}
          </Text>
          {!isHub ? (
            <Text variant="body" color={colors.inkMuted}>
              {t('subscription.liteNote')}
            </Text>
          ) : null}
          <ModuleList modules={missing} on={false} />
        </>
      ) : null}

      <Sheet visible={ask} onClose={() => setAsk(false)} title={t('subscription.subscribe')}>
        <Text variant="body" color={colors.inkMuted}>
          {t('subscription.subscribeBody')}
        </Text>
        <Button label={t('subscription.callMe')} icon="phone" loading={busy} onPress={requestCall} block />
      </Sheet>
    </Screen>
  );
}

function ModuleList({ modules, on }: { modules: HubModule[]; on: boolean }) {
  const { t } = useI18n();
  return (
    <Card padded={false} style={styles.clip}>
      {modules.map((m, i) => (
        <View key={m}>
          {i > 0 ? <Divider /> : null}
          <View style={styles.row}>
            <Icon name={on ? 'check' : 'lock'} size={20} color={on ? colors.success : colors.inkSubtle} />
            <Text variant="body" color={on ? colors.ink : colors.inkMuted} style={styles.flex}>
              {t(`subscription.modules.${m}`)}
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  clip: { overflow: 'hidden' },
  plan: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  planHub: {
    backgroundColor: colors.brandTint,
    borderColor: colors.brand,
  },
  planLite: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  planHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
