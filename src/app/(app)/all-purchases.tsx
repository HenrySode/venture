import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PurchasesView } from '@/components/stock/purchases-view';
import { TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { colors } from '@/theme';

/** Purchases for Admin and Supervisor, opened from Stock tools. */
export default function AllPurchasesScreen() {
  const t = useT();
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.root}>
      <PurchasesView header={<TopBar title={t('purchases.title')} />} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
