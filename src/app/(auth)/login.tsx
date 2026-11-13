import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { Button, Logo, Screen, Text, TextField, TextLink, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { isValidEmail } from '@/lib/format';
import { authService } from '@/services/auth';
import { useData } from '@/state/data';
import { useSession } from '@/state/session';
import { colors, space } from '@/theme';

export default function LoginScreen() {
  const t = useT();
  const router = useRouter();
  const { signIn } = useSession();
  const { setEmptyShop } = useData();
  const passwordRef = useRef<TextInputInstance>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!isValidEmail(email)) next.email = t('auth.emailInvalid');
    if (!password) next.password = t('auth.passwordRequired');
    setErrors(next);
    if (next.email || next.password) return;

    setSubmitting(true);
    try {
      const session = await authService.login({ email, password });
      setEmptyShop(false);
      signIn(session);
      router.replace('/hub');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      header={<TopBar />}
      footer={
        <View style={styles.register}>
          <Text variant="body" color={colors.inkMuted}>
            {t('auth.noAccount')}
          </Text>
          <TextLink label={t('auth.openShop')} onPress={() => router.replace('/register')} />
        </View>
      }>
      <View style={styles.intro}>
        <Logo size={64} />
        <Text variant="title" align="center" accessibilityRole="header">
          {t('auth.signInTitle')}
        </Text>
        <Text variant="body" align="center" color={colors.inkMuted}>
          {t('auth.signInLead')}
        </Text>
      </View>

      <TextField
        label={t('auth.email')}
        icon="mail"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setErrors((e) => ({ ...e, email: undefined }));
        }}
        placeholder={t('auth.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={errors.email}
      />
      <TextField
        ref={passwordRef}
        label={t('auth.password')}
        icon="lock"
        password
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setErrors((e) => ({ ...e, password: undefined }));
        }}
        placeholder={t('auth.passwordPlaceholder')}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={errors.password}
      />

      <View style={styles.forgot}>
        <TextLink label={t('auth.forgotPassword')} onPress={() => router.push({ pathname: '/forgot-password', params: { email } })} />
      </View>

      <Button
        label={t('auth.signIn')}
        loadingLabel={t('auth.signingIn')}
        loading={submitting}
        size="lg"
        onPress={submit}
        block
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.lg,
    marginBottom: space.lg,
  },
  forgot: {
    alignItems: 'flex-end',
    marginTop: -space.xs,
  },
  register: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.xs,
    flexWrap: 'wrap',
  },
});
