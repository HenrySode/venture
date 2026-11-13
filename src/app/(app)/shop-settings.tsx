import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Icon, Screen, SegmentedControl, Sheet, Text, TextField, ToggleRow, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { initials } from '@/lib/format';
import { mockRequest } from '@/services/client';
import { useData } from '@/state/data';
import { useCurrentSession, useSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, radius, space } from '@/theme';
import type { Shop } from '@/types/domain';

const THEME_COLORS = ['#2563EB', '#0F766E', '#047857', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#F99F07'];
const PANEL_COLORS = ['#2C2419', '#1F2937', '#0F172A', '#134E4A', '#3B0764', '#7C2D12'];
const MINUTES = ['0', '15', '30', '45'] as const;

type Time = Shop['workdayOpen'];
const pad = (n: number) => String(n).padStart(2, '0');
const timeText = (x: Time) => `${pad(x.hour)}:${pad(x.minute)}`;

/** Admin: the shop's name, contact, look, tax, hours and voice. */
export default function ShopSettingsScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { shop } = useCurrentSession();
  const { updateSession } = useSession();
  const { logActivity } = useData();

  const [name, setName] = useState(shop.name);
  const [phone, setPhone] = useState(shop.phone);
  const [place, setPlace] = useState(shop.place);
  const [accent, setAccent] = useState(shop.accentColor);
  const [panel, setPanel] = useState(shop.panelColor);
  const [tax, setTax] = useState(shop.taxPercent ? String(shop.taxPercent) : '');
  const [opens, setOpens] = useState<Time>(shop.workdayOpen);
  const [closes, setCloses] = useState<Time>(shop.workdayClose);
  const [voice, setVoice] = useState(shop.voiceEnabled);
  const [picking, setPicking] = useState<'opens' | 'closes' | null>(null);
  const [errors, setErrors] = useState<{ name?: string; tax?: string }>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const taxValue = tax.trim() ? Number(tax.replace(',', '.')) : 0;
    const next: typeof errors = {};
    if (!name.trim()) next.name = t('shopSettings.nameRequired');
    if (!Number.isFinite(taxValue) || taxValue < 0 || taxValue > 100) next.tax = t('shopSettings.taxInvalid');
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    await mockRequest(() => undefined, 500).catch(() => undefined);
    updateSession((s) => ({
      ...s,
      shop: {
        ...s.shop,
        name: name.trim(),
        phone: phone.trim(),
        place: place.trim(),
        accentColor: accent,
        panelColor: panel,
        taxPercent: taxValue,
        workdayOpen: opens,
        workdayClose: closes,
        voiceEnabled: voice,
      },
    }));
    logActivity('settingsSaved', name.trim());
    toast({ message: t('shopSettings.saved'), icon: 'check' });
    router.back();
  };

  const picked = picking === 'opens' ? opens : closes;
  const setPicked = (x: Time) => (picking === 'opens' ? setOpens(x) : setCloses(x));

  return (
    <Screen
      header={<TopBar title={t('shopSettings.title')} />}
      footer={<Button label={t('shopSettings.save')} size="lg" icon="check" loading={busy} onPress={save} block />}>
      {/* Live preview of the shop's look */}
      <View style={[styles.preview, { backgroundColor: panel }]}>
        <View style={[styles.logo, { backgroundColor: accent }]}>
          <Text variant="heading" color={colors.inkInverse}>
            {initials(name || shop.name)}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="heading" color={colors.inkInverse} numberOfLines={1}>
            {name || shop.name}
          </Text>
          {place ? (
            <Text variant="caption" color="#FFFFFFB3" numberOfLines={1}>
              {place}
            </Text>
          ) : null}
        </View>
      </View>

      <Text variant="overline" color={colors.inkMuted}>
        {t('shopSettings.details').toUpperCase()}
      </Text>
      <TextField
        label={t('shopSettings.name')}
        icon="shop"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setErrors((e) => ({ ...e, name: undefined }));
        }}
        autoCapitalize="words"
        error={errors.name}
      />
      <TextField label={t('shopSettings.phone')} icon="phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label={t('shopSettings.place')} icon="language" value={place} onChangeText={setPlace} autoCapitalize="words" />

      <Text variant="overline" color={colors.inkMuted}>
        {t('shopSettings.look').toUpperCase()}
      </Text>
      <Card style={styles.card}>
        <Text variant="label">{t('shopSettings.themeColor')}</Text>
        <Swatches colors={THEME_COLORS} value={accent} onChange={setAccent} />
        <Text variant="label">{t('shopSettings.panelColor')}</Text>
        <Swatches colors={PANEL_COLORS} value={panel} onChange={setPanel} />
        <Text variant="caption" color={colors.inkMuted}>
          {t('shopSettings.logoHint')}
        </Text>
      </Card>

      <Text variant="overline" color={colors.inkMuted}>
        {t('shopSettings.hours').toUpperCase()}
      </Text>
      <Card style={styles.card}>
        <View style={styles.hours}>
          <TimeButton label={t('shopSettings.opens')} value={timeText(opens)} onPress={() => setPicking('opens')} />
          <Icon name="chevronRight" size={18} color={colors.inkSubtle} />
          <TimeButton label={t('shopSettings.closes')} value={timeText(closes)} onPress={() => setPicking('closes')} />
        </View>
        <Text variant="caption" color={colors.inkMuted}>
          {t('shopSettings.hoursHint')}
        </Text>
      </Card>

      <TextField
        label={t('shopSettings.tax')}
        value={tax}
        onChangeText={(v) => {
          setTax(v);
          setErrors((e) => ({ ...e, tax: undefined }));
        }}
        keyboardType="decimal-pad"
        placeholder="0"
        hint={t('shopSettings.taxHint')}
        error={errors.tax}
      />

      <Card padded={false}>
        <ToggleRow title={t('shopSettings.voiceTitle')} subtitle={t('shopSettings.voiceHint')} value={voice} onChange={setVoice} />
      </Card>

      <Sheet visible={picking !== null} onClose={() => setPicking(null)} title={picking === 'opens' ? t('shopSettings.opens') : t('shopSettings.closes')}>
        <Text variant="label">{t('shopSettings.hour')}</Text>
        <View style={styles.hourGrid}>
          {Array.from({ length: 24 }, (_, h) => (
            <View key={h} style={styles.hourCell}>
              <Chip label={pad(h)} selected={picked.hour === h} onPress={() => setPicked({ ...picked, hour: h })} />
            </View>
          ))}
        </View>
        <Text variant="label">{t('shopSettings.minute')}</Text>
        <SegmentedControl<(typeof MINUTES)[number]>
          value={String(picked.minute) as (typeof MINUTES)[number]}
          onChange={(m) => setPicked({ ...picked, minute: Number(m) })}
          options={MINUTES.map((m) => ({ value: m, label: `:${pad(Number(m))}` }))}
        />
        <Button label={`${t('common.done')} · ${timeText(picked)}`} onPress={() => setPicking(null)} block />
      </Sheet>
    </Screen>
  );
}

function Swatches({ colors: list, value, onChange }: { colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <View style={styles.swatches}>
      {list.map((c) => {
        const on = c.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={c}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={c}
            onPress={() => onChange(c)}
            style={[styles.swatch, on && styles.swatchOn]}>
            <View style={[styles.swatchFill, { backgroundColor: c }]}>{on ? <Icon name="check" size={18} color={colors.inkInverse} /> : null}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

function TimeButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.time, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <Text variant="caption" color={colors.inkMuted}>
        {label}
      </Text>
      <Text variant="title">{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    gap: space.md,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  swatch: {
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOn: {
    borderColor: colors.ink,
  },
  swatchFill: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  time: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  hourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -space.xs,
  },
  hourCell: {
    width: '16.66%',
    padding: space.xs,
  },
});
