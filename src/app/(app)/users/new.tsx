import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PasswordMeter } from '@/components/password-meter';
import { Button, RadioCard, Screen, Text, TextField, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { isAcceptablePassword } from '@/lib/password';
import { mockRequest } from '@/services/client';
import { useManage } from '@/state/manage';
import { useToast } from '@/state/toast';
import { space } from '@/theme';
import type { Role } from '@/types/domain';

const roles: Role[] = ['seller', 'stock', 'supervisor', 'admin'];

type Errors = Partial<Record<'name' | 'login' | 'password', string>>;

/** Admin: add a person to the team with a role and a starting password. */
export default function NewUserScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { addMember, isLoginFree } = useManage();

  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [role, setRole] = useState<Role>('seller');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const clear = (k: keyof Errors) => setErrors((e) => ({ ...e, [k]: undefined }));

  const save = async () => {
    const next: Errors = {};
    if (!name.trim()) next.name = t('users.nameRequired');
    if (!login.trim()) next.login = t('users.loginRequired');
    else if (!isLoginFree(login)) next.login = t('users.loginTaken');
    if (!isAcceptablePassword(password)) next.password = t('register.passwordRule');
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    await mockRequest(() => addMember({ name, login, role, password }), 600).catch(() => undefined);
    toast({ message: t('users.added', { name: name.trim() }), icon: 'check' });
    router.back();
  };

  return (
    <Screen
      header={<TopBar title={t('users.newTitle')} />}
      footer={<Button label={t('users.save')} size="lg" icon="check" loading={busy} onPress={save} block />}>
      <TextField
        label={t('users.name')}
        icon="person"
        value={name}
        onChangeText={(v) => {
          setName(v);
          clear('name');
        }}
        placeholder={t('users.namePlaceholder')}
        autoCapitalize="words"
        autoComplete="name"
        error={errors.name}
      />
      <TextField
        label={t('users.login')}
        icon="mail"
        value={login}
        onChangeText={(v) => {
          setLogin(v);
          clear('login');
        }}
        hint={t('users.loginHint')}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        error={errors.login}
      />

      <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={t('users.role')}>
        <Text variant="label">{t('users.role')}</Text>
        {roles.map((r) => (
          <RadioCard key={r} title={t(`roles.${r}`)} subtitle={t(`roles.${r}Can`)} selected={r === role} onPress={() => setRole(r)} />
        ))}
      </View>

      <View style={styles.group}>
        <TextField
          label={t('users.password')}
          icon="lock"
          password
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            clear('password');
          }}
          hint={t('users.passwordHint')}
          autoComplete="new-password"
          textContentType="newPassword"
          error={errors.password}
        />
        <PasswordMeter password={password} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: space.sm,
  },
});
