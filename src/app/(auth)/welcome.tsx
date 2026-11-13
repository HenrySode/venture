import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageToggle } from '@/components/language-toggle';
import { OnboardingArt, type ArtKind } from '@/components/onboarding-art';
import { Button, Logo, Text, TextLink } from '@/components/ui';
import { useT, type TranslationKey } from '@/i18n';
import { colors, radius, space } from '@/theme';

const slides: { art: ArtKind; title: TranslationKey; body: TranslationKey }[] = [
  { art: 'profit', title: 'welcome.s1Title', body: 'welcome.s1Body' },
  { art: 'sale', title: 'welcome.s2Title', body: 'welcome.s2Body' },
  { art: 'credit', title: 'welcome.s3Title', body: 'welcome.s3Body' },
  { art: 'stock', title: 'welcome.s4Title', body: 'welcome.s4Body' },
];

/** First screen for signed-out users: a short swipeable onboarding, no long page. */
export default function WelcomeScreen() {
  const t = useT();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const pager = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);

  const last = slides.length - 1;
  const isLast = index === last;
  const artSize = Math.min(width - space.xxxl * 2, height * 0.38, 340);

  const goTo = (i: number) => {
    pager.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <Logo size={32} wordmark />
        <View style={styles.topRight}>
          <LanguageToggle />
          {!isLast ? (
            <Pressable accessibilityRole="button" onPress={() => goTo(last)} hitSlop={10} style={styles.skip}>
              <Text variant="label" color={colors.inkMuted}>
                {t('welcome.skip')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.flex}>
        {slides.map((s) => (
          <View key={s.art} style={[styles.slide, { width }]}>
            <OnboardingArt kind={s.art} size={artSize} />
            <View style={styles.copy}>
              <Text variant="display" align="center" accessibilityRole="header">
                {t(s.title)}
              </Text>
              <Text variant="body" align="center" color={colors.inkMuted}>
                {t(s.body)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityRole="adjustable" accessibilityLabel={`${index + 1} / ${slides.length}`}>
          {slides.map((s, i) => (
            <Pressable key={s.art} onPress={() => goTo(i)} hitSlop={6}>
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        {isLast ? (
          <Button label={t('welcome.openShop')} size="lg" icon="shop" onPress={() => router.push('/register')} block />
        ) : (
          <Button label={t('welcome.next')} size="lg" onPress={() => goTo(index + 1)} block />
        )}

        <View style={styles.signIn}>
          <Text variant="body" color={colors.inkMuted}>
            {t('welcome.haveAccount')}
          </Text>
          <TextLink label={t('welcome.signIn')} onPress={() => router.push('/login')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  skip: {
    paddingVertical: space.xs,
    paddingHorizontal: space.xs,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxl,
    paddingHorizontal: space.xxl,
  },
  copy: {
    gap: space.sm,
    maxWidth: 420,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
    gap: space.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.brand,
  },
  signIn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.xs,
    flexWrap: 'wrap',
  },
});
