import { useRouter } from 'expo-router';
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { Banner, Button, Card, ConfirmCodeDialog, Divider, Screen, SegmentedControl, Text, ToggleRow, TopBar } from '@/components/ui';
import { useI18n, type Locale } from '@/i18n';
import { daysFromNow } from '@/mocks/accounts';
import { devNetwork } from '@/services/client';
import { homeHrefFor } from '@/state/access';
import { useData } from '@/state/data';
import { useCurrentSession, useSession } from '@/state/session';
import { colors, space } from '@/theme';
import type { PlanStatus, Role } from '@/types/domain';

/**
 * Demo controls (UI-only build). Lets reviewers see every role, plan, and
 * network state without a backend. Developer-facing, so English only.
 */
export default function DemoControlsScreen() {
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const session = useCurrentSession();
  const { updateSession } = useSession();
  const { emptyShop, setEmptyShop, syncQueue } = useData();
  const network = useSyncExternalStore(devNetwork.subscribe, devNetwork.get);
  const [showCode, setShowCode] = useState(false);
  const [codeConfirmed, setCodeConfirmed] = useState(false);

  const { user, entitlement } = session;

  const setRole = (role: Role) => {
    updateSession((s) => ({ ...s, user: { ...s.user, role, isOwner: role === 'admin' } }));
    router.dismissTo(homeHrefFor(role));
  };

  const setPlan = (plan: 'lite' | 'hub') =>
    updateSession((s) => ({
      ...s,
      entitlement: plan === 'lite'
        ? { plan: 'lite', status: 'active', validUntil: null, modules: null }
        : { plan: 'hub', status: 'active', validUntil: daysFromNow(20), modules: null },
    }));

  const setStatus = (status: PlanStatus) => {
    const validUntil = { trial: daysFromNow(14), active: daysFromNow(20), grace: daysFromNow(3), lapsed: daysFromNow(-2) }[status];
    updateSession((s) => ({ ...s, entitlement: { ...s.entitlement, status, validUntil } }));
  };

  return (
    <Screen header={<TopBar title="Demo controls" />}>
      <Banner
        tone="info"
        message="These switches change this device's demo data only. They exist because this build has no backend."
      />

      <Section title="Role" hint="Changes the tabs and menus. Jumps to that role's home tab.">
        <SegmentedControl<Role>
          value={user.role}
          onChange={setRole}
          options={(['admin', 'seller', 'stock', 'supervisor'] as const).map((r) => ({ value: r, label: t(`roles.${r}`) }))}
        />
      </Section>

      <Section title="Plan" hint="Lite hides paid tools. Hub status drives the banners.">
        <SegmentedControl<'lite' | 'hub'>
          value={entitlement.plan}
          onChange={setPlan}
          options={[
            { value: 'lite', label: 'Lite' },
            { value: 'hub', label: 'Hub' },
          ]}
        />
        {entitlement.plan === 'hub' ? (
          <SegmentedControl<PlanStatus>
            value={entitlement.status}
            onChange={setStatus}
            options={(['trial', 'active', 'grace', 'lapsed'] as const).map((s) => ({ value: s, label: t(`plan.${s}`) }))}
          />
        ) : null}
      </Section>

      <Section title="Language">
        <SegmentedControl<Locale>
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'sw', label: 'Kiswahili' },
            { value: 'en', label: 'English' },
          ]}
        />
      </Section>

      <Card padded={false} style={styles.list}>
        <ToggleRow title="Empty shop" subtitle="Hide all demo records to review first-run and empty states." value={emptyShop} onChange={setEmptyShop} />
        <Divider />
        <ToggleRow
          title="Slow network"
          subtitle="Requests take ~4× longer, to review loading states."
          value={network.latency > 1}
          onChange={(on) => devNetwork.set({ latency: on ? 4 : 1 })}
        />
        <Divider />
        <ToggleRow
          title="Offline"
          subtitle="Sales still save and wait in a queue; the Sell screen shows the offline pill. Turning it off syncs the queue."
          value={network.offline}
          onChange={(on) => {
            devNetwork.set({ offline: on });
            if (!on) syncQueue();
          }}
        />
        <Divider />
        <ToggleRow
          title="Fail every request"
          subtitle="Every service call fails, to review error states. Try signing out and back in."
          value={network.failAll}
          onChange={(on) => devNetwork.set({ failAll: on })}
        />
      </Card>

      <Section title="Components" hint="Preview shared pieces that later milestones use.">
        <Button label="Show confirm-code dialog" variant="secondary" icon="lock" onPress={() => setShowCode(true)} />
        {codeConfirmed ? <Banner tone="success" message="Code matched — the destructive action would run now." /> : null}
      </Section>

      <ConfirmCodeDialog
        visible={showCode}
        title="Reset all business data"
        message="This will delete all business data including products, adjustments, and cash while keeping user accounts."
        confirmLabel="Confirm"
        codeLabel="Type this 6-character code to continue"
        mismatchLabel="The confirmation code does not match."
        onCancel={() => setShowCode(false)}
        onConfirm={() => {
          setShowCode(false);
          setCodeConfirmed(true);
        }}
      />
    </Screen>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card style={styles.section}>
      <Text variant="label">{title}</Text>
      {hint ? (
        <Text variant="caption" color={colors.inkMuted}>
          {hint}
        </Text>
      ) : null}
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.sm,
  },
  list: {
    overflow: 'hidden',
  },
});
