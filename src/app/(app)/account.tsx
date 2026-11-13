import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, ListRow, Screen, Text, TextField, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { formatPhone, initials, isValidTzPhone } from '@/lib/format';
import { mockRequest } from '@/services/client';
import { useData } from '@/state/data';
import { useManage } from '@/state/manage';
import { useCurrentSession, useSession } from '@/state/session';
import { useToast } from '@/state/toast';
import { colors, radius, space } from '@/theme';

/** "255712…" for storage, from what the person typed. */
const toIntl = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('0') ? `255${digits.slice(1)}` : digits;
};

/** The signed-in person's profile: name and phone; email, role and plan are shown read-only. */
export default function AccountScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { user, entitlement } = useCurrentSession();
  const { updateSession } = useSession();
  const { updateMember } = useManage();
  const { logActivity } = useData();

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ? formatPhone(user.phone) : '');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [busy, setBusy] = useState(false);

  const dirty = name.trim() !== user.name || toIntl(phone) !== (user.phone ?? '');

  const save = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = t('account.nameRequired');
    if (phone.trim() && !isValidTzPhone(phone)) next.phone = t('account.phoneInvalid');
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    await mockRequest(() => undefined, 500).catch(() => undefined);
    const updated = { ...user, name: name.trim(), phone: phone.trim() ? toIntl(phone) : null };
    updateSession((s) => ({ ...s, user: updated }));
    updateMember(updated);
    logActivity('profileEdited', updated.name);
    setBusy(false);
    toast({ message: t('account.saved'), icon: 'check' });
  };

  return (
    <Screen
      header={<TopBar title={t('account.title')} />}
      footer={dirty ? <Button label={t('account.save')} size="lg" icon="check" loading={busy} onPress={save} block /> : null}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text variant="title">{initials(name || user.name)}</Text>
        </View>
        <View style={styles.badges}>
          <Badge label={t(`roles.${user.role}`)} tone="brand" />
          <Badge label={`${t(`plan.${entitlement.plan}`)} · ${t(`plan.${entitlement.status}`)}`} tone={entitlement.status === 'lapsed' ? 'danger' : 'neutral'} />
        </View>
      </View>

      <TextField
        label={t('account.name')}
        icon="person"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setErrors((e) => ({ ...e, name: undefined }));
        }}
        autoCapitalize="words"
        autoComplete="name"
        error={errors.name}
      />
      <TextField
        label={`${t('account.phone')} · ${t('common.optional')}`}
        icon="phone"
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          setErrors((e) => ({ ...e, phone: undefined }));
        }}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="0712 345 678"
        error={errors.phone}
      />
      <TextField label={t('account.email')} icon="mail" value={user.email} editable={false} hint={t('account.emailHint')} />

      <Text variant="overline" color={colors.inkMuted}>
        {t('account.security').toUpperCase()}
      </Text>
      <Card padded={false} style={styles.clip}>
        <ListRow icon="key" title={t('account.changePassword')} onPress={() => router.push('/account/password')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  hero: {
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.xs,
  },
});
