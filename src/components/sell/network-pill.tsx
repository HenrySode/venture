import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { devNetwork } from '@/services/client';
import { useData } from '@/state/data';
import { colors, radius, space } from '@/theme';

/** Online / Offline · n waiting. Offline is simulated from Demo controls. */
export function NetworkPill() {
  const t = useT();
  const { offline } = useSyncExternalStore(devNetwork.subscribe, devNetwork.get);
  const { queued } = useData();

  return (
    <View style={[styles.pill, offline ? styles.offline : styles.online]} accessibilityRole="text">
      <Icon name={offline ? 'offline' : 'online'} size={14} color={offline ? colors.warning : colors.success} />
      <Text variant="caption" color={offline ? colors.warning : colors.success} style={styles.bold}>
        {offline ? (queued ? t('sell.queued', { count: queued }) : t('sell.offline')) : t('sell.online')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  online: { backgroundColor: colors.successSoft },
  offline: { backgroundColor: colors.warningSoft },
});
