import { StyleSheet, View } from 'react-native';

import { Badge, Icon, Text, type IconName } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, radius, space } from '@/theme';

const labels = {
  sw: { profit: 'Faida ya leo', receipt: 'Risiti #0142', total: 'Jumla', credit: 'Madeni', stock: 'Stoo', low: 'Inakwisha' },
  en: { profit: 'Today’s profit', receipt: 'Receipt #0142', total: 'Total', credit: 'Credit', stock: 'Stock', low: 'Low' },
};
type Labels = (typeof labels)['sw'];

/**
 * Decorative illustrations for the onboarding slides: a mini "screen" card
 * floating on a soft orange blob. Purely visual — hidden from screen readers.
 */
export type ArtKind = 'profit' | 'sale' | 'credit' | 'stock';

export function OnboardingArt({ kind, size }: { kind: ArtKind; size: number }) {
  const { locale } = useI18n();
  const l = labels[locale];
  const Card = { profit: ProfitCard, sale: SaleCard, credit: CreditCard, stock: StockCard }[kind];
  return (
    <View
      style={[styles.stage, { width: size, height: size }]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden>
      <View style={[styles.blob, { width: size * 0.92, height: size * 0.92, borderRadius: size }]} />
      <View style={[styles.blobInner, { width: size * 0.62, height: size * 0.62, borderRadius: size }]} />
      <View style={[styles.card, { width: Math.min(size * 0.86, 300) }]}>
        <Card l={l} />
      </View>
    </View>
  );
}

function CardHeader({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.cardIcon}>
        <Icon name={icon} size={16} color={colors.brandStrong} />
      </View>
      <Text variant="label" color={colors.inkMuted}>
        {title}
      </Text>
    </View>
  );
}

function ProfitCard({ l }: { l: Labels }) {
  const bars = [0.35, 0.55, 0.45, 0.7, 0.6, 0.85, 1];
  return (
    <>
      <View style={styles.row}>
        <CardHeader icon="chart" title={l.profit} />
        <Badge label="+12%" tone="success" />
      </View>
      <Text variant="display">TSH 48,500</Text>
      <View style={styles.bars}>
        {bars.map((h, i) => (
          <View
            key={i}
            style={[styles.bar, { height: 64 * h, backgroundColor: i === bars.length - 1 ? colors.brand : colors.brandSoft }]}
          />
        ))}
      </View>
    </>
  );
}

function SaleCard({ l }: { l: Labels }) {
  const lines: [string, string, string][] = [
    ['Sukari 1kg', '× 6', '22,800'],
    ['Mchele 5kg', '× 2', '37,000'],
    ['Soda 500ml', '× 12', '11,400'],
  ];
  return (
    <>
      <CardHeader icon="receipt" title={l.receipt} />
      {lines.map(([name, qty, total]) => (
        <View key={name} style={styles.row}>
          <Text variant="caption" style={styles.flex} numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" color={colors.inkMuted}>
            {qty}
          </Text>
          <Text variant="label" style={styles.amount}>
            {total}
          </Text>
        </View>
      ))}
      <View style={styles.dash} />
      <View style={styles.row}>
        <Text variant="bodyStrong" style={styles.flex}>
          {l.total}
        </Text>
        <Text variant="heading" color={colors.brandStrong}>
          TSH 71,200
        </Text>
      </View>
    </>
  );
}

function CreditCard({ l }: { l: Labels }) {
  const people: [string, string, string][] = [
    ['MN', 'Mama Neema', '12,000'],
    ['JK', 'John Kimaro', '4,500'],
    ['HS', 'Halima Saidi', '8,000'],
  ];
  return (
    <>
      <CardHeader icon="credit" title={l.credit} />
      {people.map(([ini, name, amount], i) => (
        <View key={name} style={styles.row}>
          <View style={[styles.avatar, i === 0 && { backgroundColor: colors.brand }]}>
            <Text variant="caption" style={styles.bold}>
              {ini}
            </Text>
          </View>
          <Text variant="label" style={styles.flex} numberOfLines={1}>
            {name}
          </Text>
          <Text variant="label" color={colors.danger}>
            {amount}
          </Text>
        </View>
      ))}
    </>
  );
}

function StockCard({ l }: { l: Labels }) {
  const items: [string, number, boolean][] = [
    ['Mafuta 1L', 0.8, false],
    ['Unga 2kg', 0.55, false],
    ['Sukari 1kg', 0.12, true],
  ];
  return (
    <>
      <CardHeader icon="stock" title={l.stock} />
      {items.map(([name, level, low]) => (
        <View key={name} style={styles.stockItem}>
          <View style={styles.row}>
            <Text variant="caption" style={styles.flex}>
              {name}
            </Text>
            {low ? <Badge label={l.low} tone="danger" icon="warning" /> : null}
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${level * 100}%`, backgroundColor: low ? colors.danger : colors.success }]} />
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    backgroundColor: colors.brandTint,
  },
  blobInner: {
    position: 'absolute',
    backgroundColor: colors.brandSoft,
    opacity: 0.6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.lg,
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#7A4A00',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flex: 1,
  },
  cardIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  amount: {
    minWidth: 56,
    textAlign: 'right',
  },
  dash: {
    borderTopWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    height: 64,
  },
  bar: {
    flex: 1,
    borderRadius: radius.sm / 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockItem: {
    gap: space.xs,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
