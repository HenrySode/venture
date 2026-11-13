import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PurchasesView } from '@/components/stock/purchases-view';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, space } from '@/theme';

/** Purchases tab (Stock role). */
export default function PurchasesTab() {
  const t = useT();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <PurchasesView
        header={
          <View style={styles.header}>
            <Text variant="title" accessibilityRole="header">
              {t('purchases.title')}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
  },
});
