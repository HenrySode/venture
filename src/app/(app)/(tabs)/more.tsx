import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PlanBanner, RoleGate } from '@/components/access';
import { Badge, Button, Card, Divider, Icon, ListRow, Screen, SegmentedControl, Sheet, Text } from '@/components/ui';
import { useI18n, type Locale, type TranslationKey } from '@/i18n';
import { formatPhone, initials } from '@/lib/format';
import { authService } from '@/services/auth';
import { useCurrentSession, useSession } from '@/state/session';
import { colors, radius, space } from '@/theme';
import type { IconName } from '@/components/ui';

type ManageHref = '/users' | '/shop-settings' | '/activity' | '/reset-restore' | '/request-feature';

/** Admin tools (PRD §4.8). */
const manageItems: { key: TranslationKey; icon: IconName; href: ManageHref }[] = [
  { key: 'more.users', icon: 'users', href: '/users' },
  { key: 'more.shopSettings', icon: 'shop', href: '/shop-settings' },
  { key: 'more.activity', icon: 'activity', href: '/activity' },
  { key: 'more.resetRestore', icon: 'restore', href: '/reset-restore' },
  { key: 'more.requestFeature', icon: 'idea', href: '/request-feature' },
];

export default function MoreScreen() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const session = useCurrentSession();
  const { signOut } = useSession();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { user, shop, entitlement } = session;

  const doSignOut = async () => {
    setSigningOut(true);
    await authService.logout().catch(() => undefined);
    setConfirmSignOut(false);
    signOut();
    router.replace('/welcome');
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Text variant="title" accessibilityRole="header" style={styles.title}>
        {t('more.title')}
      </Text>
      <PlanBanner />

      {/* Profile */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${user.name}. ${t('more.editProfile')}`}
        onPress={() => router.push('/account')}
        style={({ pressed }) => pressed && styles.pressed}>
        <Card style={styles.profile}>
          <View style={styles.avatar}>
            <Text variant="heading">{initials(user.name)}</Text>
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {user.name}
            </Text>
            <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
              {user.email}
            </Text>
            {user.phone ? (
              <Text variant="caption" color={colors.inkMuted}>
                {formatPhone(user.phone)}
              </Text>
            ) : null}
            <View style={styles.badges}>
              <Badge label={t(`roles.${user.role}`)} tone="brand" />
              <Badge label={`${t(`plan.${entitlement.plan}`)} · ${t(`plan.${entitlement.status}`)}`} tone={entitlement.status === 'lapsed' ? 'danger' : 'neutral'} />
            </View>
          </View>
          <Icon name="chevronRight" size={18} color={colors.inkSubtle} />
        </Card>
      </Pressable>

      {/* Language */}
      <Card style={styles.section}>
        <Text variant="label">{t('common.language')}</Text>
        <SegmentedControl<Locale>
          accessibilityLabel={t('common.language')}
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'sw', label: t('common.swahili') },
            { value: 'en', label: t('common.english') },
          ]}
        />
      </Card>

      {/* Shop & account */}
      <Card padded={false} style={styles.list}>
        <ListRow icon="apps" title={t('more.allVentures')} subtitle={shop.name} onPress={() => router.push('/hub')} />
        <Divider />
        <RoleGate roles={['seller', 'admin']}>
          <ListRow icon="book" title={t('more.closeBooks')} onPress={() => router.push('/shift')} />
          <Divider />
        </RoleGate>
        {user.isOwner ? (
          <>
            <ListRow
              icon="wallet"
              title={t('more.subscription')}
              trailing={<Badge label={t(`plan.${entitlement.status}`)} tone={entitlement.status === 'lapsed' ? 'danger' : entitlement.status === 'grace' ? 'warning' : 'neutral'} />}
              onPress={() => router.push('/subscription')}
            />
            <Divider />
          </>
        ) : null}
        <ListRow icon="key" title={t('more.changePassword')} onPress={() => router.push('/account/password')} />
      </Card>

      <RoleGate roles={['admin']}>
        <Text variant="overline" color={colors.inkMuted}>
          {t('more.manage').toUpperCase()}
        </Text>
        <Card padded={false} style={styles.list}>
          {manageItems.map((item, i) => (
            <View key={item.key}>
              {i > 0 ? <Divider /> : null}
              <ListRow icon={item.icon} title={t(item.key)} onPress={() => router.push(item.href)} />
            </View>
          ))}
        </Card>
      </RoleGate>

      {/* Demo controls — UI-only build */}
      <Card padded={false} style={[styles.list, styles.demo]}>
        <ListRow
          icon="sliders"
          iconColor={colors.info}
          title={t('more.demoControls')}
          subtitle={t('more.demoControlsHint')}
          trailing={<Badge label={t('common.demo')} tone="info" />}
          onPress={() => router.push('/demo')}
        />
      </Card>

      <Card padded={false} style={styles.list}>
        <ListRow icon="logout" title={t('more.signOut')} destructive onPress={() => setConfirmSignOut(true)} />
      </Card>

      <Sheet visible={confirmSignOut} onClose={() => setConfirmSignOut(false)} title={t('more.signOutTitle')}>
        <Text variant="body" color={colors.inkMuted}>
          {t('more.signOutBody')}
        </Text>
        <View style={styles.actions}>
          <Button label={t('common.cancel')} variant="secondary" onPress={() => setConfirmSignOut(false)} style={styles.flex} />
          <Button label={t('more.signOut')} variant="danger" loading={signingOut} onPress={doSignOut} style={styles.flex} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: {
    paddingTop: space.sm,
  },
  profile: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.xs,
  },
  section: {
    gap: space.sm,
  },
  list: {
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.7,
  },
  demo: {
    borderColor: colors.info + '55',
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
});
