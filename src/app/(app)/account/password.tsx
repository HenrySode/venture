import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PasswordMeter } from '@/components/password-meter';
import { Button, Screen, TextField, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { isAcceptablePassword } from '@/lib/password';
import { mockRequest } from '@/services/client';
import { useToast } from '@/state/toast';
import { space } from '@/theme';

type Errors = Partial<Record<'current' | 'next' | 'confirm', string>>;

/** Change my password. UI-only build: the form is checked, nothing is stored. */
export default function ChangePasswordScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const clear = (k: keyof Errors) => setErrors((e) => ({ ...e, [k]: undefined }));

  const save = async () => {
    const e: Errors = {};
    if (!current) e.current = t('account.password.currentRequired');
    if (!isAcceptablePassword(next)) e.next = t('register.passwordRule');
    else if (next === current) e.next = t('account.password.sameAsOld');
    if (!e.next && confirm !== next) e.confirm = t('account.password.mismatch');
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    await mockRequest(() => undefined, 600).catch(() => undefined);
    toast({ message: t('account.password.done'), icon: 'check' });
    router.back();
  };

  return (
    <Screen
      header={<TopBar title={t('account.changePassword')} />}
      footer={<Button label={t('account.password.save')} size="lg" icon="key" loading={busy} onPress={save} block />}>
      <TextField
        label={t('account.password.current')}
        icon="lock"
        password
        value={current}
        onChangeText={(v) => {
          setCurrent(v);
          clear('current');
        }}
        autoComplete="current-password"
        textContentType="password"
        error={errors.current}
      />
      <View style={styles.group}>
        <TextField
          label={t('account.password.new')}
          icon="key"
          password
          value={next}
          onChangeText={(v) => {
            setNext(v);
            clear('next');
          }}
          autoComplete="new-password"
          textContentType="newPassword"
          error={errors.next}
        />
        <PasswordMeter password={next} />
      </View>
      <TextField
        label={t('account.password.confirm')}
        icon="key"
        password
        value={confirm}
        onChangeText={(v) => {
          setConfirm(v);
          clear('confirm');
        }}
        autoComplete="new-password"
        textContentType="newPassword"
        error={errors.confirm}
        onSubmitEditing={save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: space.sm,
  },
});
