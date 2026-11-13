import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme';

/**
 * App icon vocabulary. Each name maps to an SF Symbol (iOS) and a
 * Material Symbol (Android + web), so screens never reference platform names.
 */
const icons = {
  home: ['house.fill', 'home'],
  sell: ['cart.fill', 'point_of_sale'],
  receipt: ['list.bullet.rectangle.portrait.fill', 'receipt_long'],
  credit: ['person.crop.circle.badge.clock', 'credit_card'],
  stock: ['shippingbox.fill', 'inventory_2'],
  purchases: ['bag.fill', 'shopping_basket'],
  suppliers: ['truck.box.fill', 'local_shipping'],
  money: ['banknote.fill', 'payments'],
  wallet: ['wallet.bifold.fill', 'account_balance_wallet'],
  chart: ['chart.bar.fill', 'bar_chart'],
  more: ['ellipsis.circle.fill', 'more_horiz'],
  users: ['person.2.fill', 'group'],
  person: ['person.fill', 'person'],
  shop: ['storefront.fill', 'storefront'],
  lock: ['lock.fill', 'lock'],
  key: ['key.fill', 'key'],
  eye: ['eye', 'visibility'],
  eyeOff: ['eye.slash', 'visibility_off'],
  mail: ['envelope.fill', 'mail'],
  phone: ['phone.fill', 'call'],
  sms: ['message.fill', 'sms'],
  language: ['globe', 'language'],
  check: ['checkmark.circle.fill', 'check_circle'],
  error: ['exclamationmark.octagon.fill', 'error'],
  warning: ['exclamationmark.triangle.fill', 'warning'],
  info: ['info.circle.fill', 'info'],
  back: ['chevron.left', 'arrow_back'],
  chevronRight: ['chevron.right', 'chevron_right'],
  close: ['xmark', 'close'],
  add: ['plus', 'add'],
  logout: ['rectangle.portrait.and.arrow.right', 'logout'],
  swap: ['arrow.left.arrow.right', 'swap_horiz'],
  tools: ['wrench.and.screwdriver.fill', 'construction'],
  verified: ['checkmark.seal.fill', 'verified'],
  clock: ['clock.fill', 'schedule'],
  hourglass: ['hourglass', 'hourglass_top'],
  offline: ['wifi.slash', 'wifi_off'],
  apps: ['square.grid.2x2.fill', 'apps'],
  rocket: ['paperplane.fill', 'rocket_launch'],
  badge: ['person.text.rectangle.fill', 'badge'],
  activity: ['list.bullet.clipboard.fill', 'receipt_long'],
  restore: ['arrow.counterclockwise', 'history'],
  idea: ['lightbulb.fill', 'lightbulb'],
  sliders: ['slider.horizontal.3', 'tune'],
  search: ['magnifyingglass', 'search'],
  minus: ['minus', 'remove'],
  trash: ['trash', 'delete'],
  print: ['printer.fill', 'print'],
  calendar: ['calendar', 'calendar_today'],
  sync: ['icloud.and.arrow.up', 'cloud_upload'],
  online: ['wifi', 'wifi'],
  undo: ['arrow.uturn.backward', 'undo'],
  basket: ['basket.fill', 'shopping_basket'],
  cartAdd: ['cart.badge.plus', 'add_shopping_cart'],
  cash: ['banknote', 'payments'],
  book: ['book.closed.fill', 'menu_book'],
  share: ['square.and.arrow.up', 'share'],
} as const satisfies Record<string, readonly [SFSymbol, AndroidSymbol]>;

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  /** Accessibility label. Omit for decorative icons (the default). */
  label?: string;
};

export function Icon({ name, size = 22, color = colors.ink, label }: IconProps) {
  const [ios, material] = icons[name];
  return (
    <SymbolView
      name={{ ios, android: material, web: material }}
      size={size}
      tintColor={color}
      accessibilityLabel={label}
      accessible={Boolean(label)}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    />
  );
}
