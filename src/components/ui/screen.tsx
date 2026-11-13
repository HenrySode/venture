import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { colors, space, touch } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

type ScreenProps = {
  children: ReactNode;
  /** Rendered above the scroll area (e.g. <TopBar />). */
  header?: ReactNode;
  /** Sticky area at the bottom, kept above the keyboard (e.g. a primary button). */
  footer?: ReactNode;
  scroll?: boolean;
  /** Screens inside the tab bar should not pad the bottom safe area. */
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  background?: string;
};

export function Screen({
  children,
  header,
  footer,
  scroll = true,
  edges = ['top', 'left', 'right', 'bottom'],
  contentStyle,
  background = colors.background,
}: ScreenProps) {
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header}
        {body}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type TopBarProps = {
  title?: string;
  /** Defaults to router.back(). Pass `null` to hide the back button. */
  onBack?: (() => void) | null;
  right?: ReactNode;
};

export function TopBar({ title, onBack, right }: TopBarProps) {
  const router = useRouter();
  const t = useT();
  const handleBack = onBack === undefined ? () => router.back() : onBack;

  return (
    <View style={styles.topBar}>
      <View style={styles.topBarSide}>
        {handleBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={handleBack}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && { backgroundColor: colors.brandTint }]}>
            <Icon name="back" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
      <Text variant="bodyStrong" numberOfLines={1} style={styles.topBarTitle} accessibilityRole="header">
        {title ?? ''}
      </Text>
      <View style={[styles.topBarSide, styles.topBarRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
    gap: space.lg,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: space.sm,
  },
  topBar: {
    height: touch.min + 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
  },
  topBarSide: {
    minWidth: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarRight: {
    justifyContent: 'flex-end',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: touch.min,
    height: touch.min,
    borderRadius: touch.min / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
