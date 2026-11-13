import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { useT, type TranslationKey } from '@/i18n';
import { tabsByRole, type TabName } from '@/state/access';
import { useCurrentSession } from '@/state/session';
import { colors, radius } from '@/theme';

const tabMeta: Record<TabName, { title: TranslationKey; icon: IconName }> = {
  home: { title: 'tabs.home', icon: 'home' },
  sell: { title: 'tabs.sell', icon: 'sell' },
  'my-sales': { title: 'tabs.mySales', icon: 'receipt' },
  madeni: { title: 'tabs.madeni', icon: 'credit' },
  stock: { title: 'tabs.stock', icon: 'stock' },
  purchases: { title: 'tabs.purchases', icon: 'purchases' },
  suppliers: { title: 'tabs.suppliers', icon: 'suppliers' },
  money: { title: 'tabs.money', icon: 'money' },
  more: { title: 'tabs.more', icon: 'more' },
};

const ALL_TABS = Object.keys(tabMeta) as TabName[];

/**
 * Every tab route is declared once; tabs outside the current role's set are
 * hidden with `href: null`, so switching role (demo controls) re-renders the bar.
 */
export default function TabsLayout() {
  const t = useT();
  const { user } = useCurrentSession();
  const visible = new Set(tabsByRole[user.role]);
  const ordered = [...tabsByRole[user.role], ...ALL_TABS.filter((n) => !visible.has(n))];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkSubtle,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        sceneStyle: { backgroundColor: colors.background },
      }}>
      {ordered.map((name) => {
        const meta = tabMeta[name];
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: t(meta.title),
              href: visible.has(name) ? undefined : null,
              tabBarIcon: ({ focused, color }) => (
                <View style={[styles.iconPill, focused && styles.iconPillActive]}>
                  <Icon name={meta.icon} size={22} color={focused ? colors.ink : color} />
                </View>
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    minHeight: 64,
    paddingTop: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconPill: {
    width: 52,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: colors.brandSoft,
  },
});
