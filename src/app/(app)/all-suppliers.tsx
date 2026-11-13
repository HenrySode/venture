import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SuppliersView } from '@/components/stock/suppliers-view';
import { TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { colors } from '@/theme';

/** Suppliers and orders for Admin and Supervisor, opened from Stock tools. */
export default function AllSuppliersScreen() {
  const t = useT();
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.root}>
      <SuppliersView header={<TopBar title={t('stock.suppliers')} />} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
