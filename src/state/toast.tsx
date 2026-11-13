import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text, type IconName } from '@/components/ui';
import { colors, radius, space } from '@/theme';

type ToastInput = {
  message: string;
  icon?: IconName;
  tone?: 'success' | 'info' | 'danger';
  action?: { label: string; onPress: () => void };
};
type Toast = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

let nextId = 1;

/**
 * Snackbar shown above the tab bar (e.g. "Sold 1 × Sukari — Undo").
 * Disappears after a few seconds; one at a time.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((current) => (current?.id === toast.id ? null : current)), toast.action ? 4500 : 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const tone = toast?.tone ?? 'success';
  const iconColor = tone === 'danger' ? '#FCA5A5' : tone === 'info' ? '#93C5FD' : '#6EE7B7';

  return (
    <ToastContext.Provider value={(t) => setToast({ ...t, id: nextId++ })}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 84 }]}>
          <View style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Icon name={toast.icon ?? (tone === 'danger' ? 'error' : tone === 'info' ? 'info' : 'check')} size={20} color={iconColor} />
            <Text variant="label" color={colors.inkInverse} style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
            {toast.action ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  toast.action?.onPress();
                  setToast(null);
                }}
                style={styles.action}>
                <Text variant="label" color={colors.brand}>
                  {toast.action.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  message: { flex: 1 },
  action: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
});
