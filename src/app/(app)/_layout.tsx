import { Stack } from 'expo-router';

import { BasketProvider } from '@/state/basket';
import { ManageProvider } from '@/state/manage';
import { ToastProvider } from '@/state/toast';
import { colors } from '@/theme';

export default function AppLayout() {
  return (
    <ManageProvider>
      <BasketProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="hub" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="basket" />
            <Stack.Screen name="receipt/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="credit-sale" />
            <Stack.Screen name="forgotten-sale" />
            <Stack.Screen name="madeni/[key]" />
            <Stack.Screen name="shift" />
            <Stack.Screen name="demo" options={{ presentation: 'modal' }} />
          </Stack>
        </ToastProvider>
      </BasketProvider>
    </ManageProvider>
  );
}
