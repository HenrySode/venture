import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';

import { Text } from './text';

const mark = require('@/assets/images/venture-hub-logo.png');

/** The Venture Hub "V" mark, optionally with the wordmark beside it. */
export function Logo({ size = 40, wordmark = false, subtitle }: { size?: number; wordmark?: boolean; subtitle?: string }) {
  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel="Venture Hub">
      <Image source={mark} style={{ width: size, height: size }} contentFit="contain" />
      {wordmark ? (
        <View>
          <Text variant="heading" style={{ fontSize: size * 0.48, lineHeight: size * 0.6 }}>
            Venture Hub
          </Text>
          {subtitle ? (
            <Text variant="caption" color={colors.inkMuted}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
});
