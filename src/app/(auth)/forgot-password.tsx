import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PasswordMeter } from '@/components/password-meter';
import { Banner, Button, Icon, Screen, Text, TextField, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { isValidEmail } from '@/lib/format';
import { isAcceptablePassword } from '@/lib/password';
import { authService } from '@/services/auth';
import { ApiError } from '@/services/client';
import { colors, radius, space } from '@/theme';

type Step = 'email' | 'reset' | 'done';
type Errors = { email?: string; code?: string; password?: string; confirm?: string };

export default function ForgotPasswordScreen() {
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clear = (key: keyof Errors) => setErrors((e) => ({ ...e, [key]: undefined }));

  const requestCode = async () => {
    if (!isValidEmail(email)) {
      setErrors({ email: t('auth.emailInvalid') });
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const res = await authService.forgotPassword({ email });
      setDemoCode(res.demoCode);
      setStep('reset');
    } catch (e) {
      const message = errorMessage(t, e, { notFound: 'forgot.notFound' });
      if (e instanceof ApiError && e.code === 'notFound') setErrors({ email: message });
      else setFormError(message);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    const next: Errors = {};
    if (code.trim().length < 6) next.code = t('forgot.codeInvalid');
    if (!isAcceptablePassword(password)) next.password = t('register.passwordRule');
    if (confirm !== password) next.confirm = t('forgot.mismatch');
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    setFormError(null);
    try {
      await authService.confirmForgotPassword({ email, code, password });
      setStep('done');
    } catch (e) {
      const message = errorMessage(t, e, { invalidCode: 'forgot.codeInvalid' });
      if (e instanceof ApiError && e.code === 'invalidCode') setErrors({ code: message });
      else setFormError(message);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'done') {
    return (
      <Screen footer={<Button label={t('forgot.backToSignIn')} size="lg" onPress={() => router.replace('/login')} block />}>
        <View style={styles.done}>
          <View style={styles.doneIcon}>
            <Icon name="verified" size={44} color={colors.success} />
          </View>
          <Text variant="title" align="center" accessibilityRole="header">
            {t('forgot.doneTitle')}
          </Text>
          <Text variant="body" align="center" color={colors.inkMuted}>
            {t('forgot.doneBody')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={<TopBar onBack={step === 'reset' ? () => setStep('email') : undefined} />}
      footer={
        step === 'email' ? (
          <Button label={t('forgot.sendCode')} loadingLabel={t('forgot.sending')} loading={busy} size="lg" onPress={requestCode} block />
        ) : (
          <Button label={t('forgot.save')} loadingLabel={t('forgot.saving')} loading={busy} size="lg" onPress={resetPassword} block />
        )
      }>
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <Icon name="key" size={26} color={colors.brandStrong} />
        </View>
        <Text variant="title" accessibilityRole="header">
          {step === 'email' ? t('forgot.title') : t('forgot.codeTitle')}
        </Text>
        <Text variant="body" color={colors.inkMuted}>
          {step === 'email' ? t('forgot.lead') : t('forgot.codeLead', { email: email.trim() })}
        </Text>
      </View>

      {formError ? <Banner tone="danger" message={formError} /> : null}

      {step === 'email' ? (
        <TextField
          label={t('auth.email')}
          icon="mail"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            clear('email');
          }}
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={requestCode}
          error={errors.email}
        />
      ) : (
        <>
          {demoCode ? <Banner tone="info" icon="mail" message={t('register.demoCode', { code: demoCode })} /> : null}
          <TextField
            label={t('forgot.code')}
            icon="sms"
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, '').slice(0, 6));
              clear('code');
            }}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            error={errors.code}
          />
          <TextField
            label={t('forgot.newPassword')}
            icon="lock"
            password
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              clear('password');
            }}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            error={errors.password}
          />
          <PasswordMeter password={password} />
          <TextField
            label={t('forgot.confirmPassword')}
            icon="lock"
            password
            value={confirm}
            onChangeText={(v) => {
              setConfirm(v);
              clear('confirm');
            }}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={resetPassword}
            error={errors.confirm}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: space.sm,
  },
  introIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  done: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.md,
  },
  doneIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
