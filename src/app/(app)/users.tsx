import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PlanBanner, UpgradeSheet } from '@/components/access';
import { PasswordMeter } from '@/components/password-meter';
import { Badge, Banner, Button, Card, Divider, Icon, Screen, Sheet, Text, TextField, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate, formatPhone, initials } from '@/lib/format';
import { isAcceptablePassword } from '@/lib/password';
import { mockRequest } from '@/services/client';
import { planAccess } from '@/state/access';
import { useManage } from '@/state/manage';
import { useCurrentSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, radius, space, touch } from '@/theme';
import type { Role, TeamMember } from '@/types/domain';

const roleOrder: Role[] = ['admin', 'supervisor', 'stock', 'seller'];

type Mode = 'info' | 'reset' | 'remove';

/** Admin: the shop's team. Tap a person to reset their password or remove them. */
export default function UsersScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const session = useCurrentSession();
  const { team, removeMember, resetPassword } = useManage();
  const canAdd = planAccess(session).hasModule('team');

  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [mode, setMode] = useState<Mode>('info');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [upgrade, setUpgrade] = useState(false);

  const sorted = [...team].sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role) || a.name.localeCompare(b.name));

  const open = (m: TeamMember) => {
    setSelected(m);
    setMode('info');
    setPassword('');
    setError(null);
  };
  const close = () => setSelected(null);

  const add = () => (canAdd ? router.push('/users/new') : setUpgrade(true));

  const saveReset = async () => {
    if (!selected) return;
    if (!isAcceptablePassword(password)) {
      setError(t('register.passwordRule'));
      return;
    }
    setBusy(true);
    await mockRequest(() => resetPassword(selected.id), 500).catch(() => undefined);
    setBusy(false);
    toast({ message: t('users.resetDone', { name: selected.name }), icon: 'key' });
    close();
  };

  const confirmRemove = () => {
    if (!selected) return;
    removeMember(selected.id);
    toast({ message: t('users.removed', { name: selected.name }), icon: 'undo' });
    close();
  };

  const isSelf = selected?.id === session.user.id;
  const blockRemove = selected?.isOwner ? t('users.cantRemoveOwner') : isSelf ? t('users.cantRemoveSelf') : null;

  return (
    <Screen
      header={
        <TopBar
          title={t('users.title')}
          right={
            <Pressable accessibilityRole="button" accessibilityLabel={t('users.add')} onPress={add} hitSlop={8} style={styles.addBtn}>
              <Icon name="add" size={24} color={colors.ink} />
            </Pressable>
          }
        />
      }>
      <PlanBanner />
      <Text variant="overline" color={colors.inkMuted}>
        {t('users.count', { count: team.length }).toUpperCase()}
      </Text>
      <Card padded={false} style={styles.clip}>
        {sorted.map((m, i) => (
          <View key={m.id}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => open(m)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
              <View style={styles.avatar}>
                <Text variant="label">{initials(m.name)}</Text>
              </View>
              <View style={styles.flex}>
                <View style={styles.nameRow}>
                  <Text variant="bodyStrong" numberOfLines={1} style={styles.shrink}>
                    {m.name}
                  </Text>
                  {m.id === session.user.id ? <Badge label={t('users.you')} tone="info" /> : null}
                </View>
                <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
                  {m.lastActiveAt ? t('users.lastActive', { date: formatDate(m.lastActiveAt, locale) }) : t('users.neverActive')}
                </Text>
              </View>
              <Badge label={m.isOwner ? t('users.owner') : t(`roles.${m.role}`)} tone={m.isOwner ? 'brand' : 'neutral'} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Button label={t('users.add')} icon="add" variant="secondary" onPress={add} block />

      <Sheet
        visible={selected !== null}
        onClose={close}
        title={
          !selected ? '' : mode === 'reset' ? t('users.resetTitle', { name: selected.name }) : mode === 'remove' ? t('users.removeTitle', { name: selected.name }) : selected.name
        }>
        {selected && mode === 'info' ? (
          <View style={styles.sheet}>
            <Card padded={false}>
              <Detail label={t('users.login')} value={selected.email} />
              <Divider />
              <Detail label={t('users.role')} value={`${t(`roles.${selected.role}`)}${selected.isOwner ? ` · ${t('users.owner')}` : ''}`} />
              {selected.phone ? (
                <>
                  <Divider />
                  <Detail label={t('users.phone')} value={formatPhone(selected.phone)} />
                </>
              ) : null}
              <Divider />
              <Detail label={t('users.joined')} value={formatDate(selected.createdAt, locale)} />
            </Card>
            <Text variant="caption" color={colors.inkMuted}>
              {t(`roles.${selected.role}Can`)}
            </Text>
            <Button label={t('users.resetPassword')} icon="key" variant="secondary" onPress={() => setMode('reset')} block />
            {blockRemove ? (
              <Banner tone="info" message={blockRemove} />
            ) : (
              <Button label={t('users.remove')} icon="trash" variant="danger" onPress={() => setMode('remove')} block />
            )}
          </View>
        ) : null}

        {selected && mode === 'reset' ? (
          <View style={styles.sheet}>
            <Text variant="body" color={colors.inkMuted}>
              {t('users.resetBody')}
            </Text>
            <TextField
              label={t('users.password')}
              icon="lock"
              password
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError(null);
              }}
              autoComplete="new-password"
              textContentType="newPassword"
              error={error}
              autoFocus
            />
            <PasswordMeter password={password} />
            <View style={styles.actions}>
              <Button label={t('common.cancel')} variant="secondary" onPress={() => setMode('info')} style={styles.flex} />
              <Button label={t('users.resetSave')} loading={busy} onPress={saveReset} style={styles.flex} />
            </View>
          </View>
        ) : null}

        {selected && mode === 'remove' ? (
          <View style={styles.sheet}>
            <Text variant="body" color={colors.inkMuted}>
              {t('users.removeBody', { shop: session.shop.name })}
            </Text>
            <View style={styles.actions}>
              <Button label={t('common.cancel')} variant="secondary" onPress={() => setMode('info')} style={styles.flex} />
              <Button label={t('users.remove')} variant="danger" onPress={confirmRemove} style={styles.flex} />
            </View>
          </View>
        ) : null}
      </Sheet>

      <UpgradeSheet visible={upgrade} onClose={() => setUpgrade(false)} reason={planAccess(session).hubToolsOn ? 'module' : 'lite'} />
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text variant="body" color={colors.inkMuted}>
        {label}
      </Text>
      <Text variant="bodyStrong" numberOfLines={1} style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  clip: { overflow: 'hidden' },
  addBtn: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    gap: space.md,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
});
