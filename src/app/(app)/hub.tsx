import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LanguageToggle } from '@/components/language-toggle';
import { Badge, Button, Card, Icon, Logo, Screen, Text, TextLink } from '@/components/ui';
import { useT } from '@/i18n';
import { homeHrefFor } from '@/state/access';
import { useCurrentSession, useSession } from '@/state/session';
import { colors, radius, space } from '@/theme';

/** "Your ventures" picker shown after sign-in (PRD §3). */
export default function HubScreen() {
  const t = useT();
  const router = useRouter();
  const session = useCurrentSession();
  const { signOut } = useSession();
  const firstName = session.user.name.split(' ')[0];

  const openShop = () => router.replace(homeHrefFor(session.user.role));

  return (
    <Screen
      header={
        <View style={styles.topBar}>
          <Logo size={34} wordmark subtitle={session.shop.name} />
          <LanguageToggle />
        </View>
      }>
      <View style={styles.intro}>
        <Text variant="title" accessibilityRole="header">
          {t('hub.greeting', { name: firstName })}
        </Text>
        <Text variant="body" color={colors.inkMuted}>
          {t('hub.lead')}
        </Text>
      </View>

      <Text variant="overline" color={colors.inkMuted}>
        {t('hub.heading').toUpperCase()}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('hub.moshiTitle')}, ${session.shop.name}. ${t('hub.open')}`}
        onPress={openShop}
        style={({ pressed }) => [styles.venture, pressed && styles.venturePressed]}>
        <View style={styles.ventureHeader}>
          <View style={styles.ventureIcon}>
            <Icon name="shop" size={26} color={colors.ink} />
          </View>
          <View style={styles.flex}>
            <Text variant="heading">{t('hub.moshiTitle')}</Text>
            <Text variant="caption" color={colors.inkMuted}>
              {session.shop.name}
            </Text>
          </View>
          <Badge label={t('hub.moshiBadge')} tone="success" />
        </View>
        <Text variant="body" color={colors.inkMuted}>
          {t('hub.moshiDesc')}
        </Text>
        <Button label={t('hub.open')} icon="chevronRight" iconPosition="end" onPress={openShop} block />
      </Pressable>

      <Card style={styles.next}>
        <View style={styles.ventureHeader}>
          <View style={[styles.ventureIcon, styles.nextIcon]}>
            <Icon name="tools" size={22} color={colors.inkSubtle} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong" color={colors.inkMuted}>
              {t('hub.nextTitle')}
            </Text>
          </View>
          <Badge label={t('common.comingSoon')} />
        </View>
        <Text variant="caption" color={colors.inkMuted}>
          {t('hub.nextDesc')}
        </Text>
      </Card>

      <View style={styles.footer}>
        <Text variant="caption" color={colors.inkMuted} align="center">
          {t('hub.footer')}
        </Text>
        <Text variant="caption" color={colors.inkMuted} align="center">
          {t('hub.signedInAs', { email: session.user.email })}
        </Text>
        <TextLink
          label={t('more.signOut')}
          onPress={() => {
            signOut();
            router.replace('/welcome');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
  },
  intro: {
    gap: space.xs,
    paddingTop: space.md,
  },
  venture: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: colors.surface,
  },
  venturePressed: {
    backgroundColor: colors.brandTint,
  },
  ventureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  ventureIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  next: {
    gap: space.sm,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  nextIcon: {
    backgroundColor: colors.surfaceMuted,
  },
  footer: {
    alignItems: 'center',
    gap: space.sm,
    marginTop: 'auto',
    paddingTop: space.xl,
  },
});
