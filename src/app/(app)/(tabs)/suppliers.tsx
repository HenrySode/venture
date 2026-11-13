import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SuppliersView } from '@/components/stock/suppliers-view';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, space } from '@/theme';

/** Suppliers and orders tab (Stock role). */
export default function SuppliersTab() {
  const t = useT();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <SuppliersView
        header={
          <View style={styles.header}>
            <Text variant="title" accessibilityRole="header">
              {t('suppliers.title')}
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
