import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { PasswordMeter } from '@/components/password-meter';
import { Badge, Banner, Button, Card, Icon, Screen, Text, TextField, TextLink, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatPhone, isValidEmail, isValidTzPhone } from '@/lib/format';
import { isAcceptablePassword } from '@/lib/password';
import { authService } from '@/services/auth';
import { ApiError } from '@/services/client';
import { useData } from '@/state/data';
import { useSession } from '@/state/session';
import { colors, radius, space } from '@/theme';
import type { Session } from '@/types/domain';

type Step = 'details' | 'verify' | 'password' | 'ready';
const STEP_NUMBER: Record<Exclude<Step, 'ready'>, number> = { details: 1, verify: 2, password: 3 };
const RESEND_SECONDS = 30;

type Details = { shopName: string; name: string; email: string; phone: string };
type DetailErrors = Partial<Record<keyof Details, string>>;

export default function RegisterScreen() {
  const t = useT();
  const router = useRouter();
  const { signIn } = useSession();
  const { setEmptyShop } = useData();

  const [step, setStep] = useState<Step>('details');
  const [details, setDetails] = useState<Details>({ shopName: '', name: '', email: '', phone: '' });
  const [detailErrors, setDetailErrors] = useState<DetailErrors>({});
  const [requestId, setRequestId] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [session, setSession] = useState<Session | null>(null);

  const nameRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const phoneRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const goTo = (next: Step) => {
    setFormError(null);
    setFieldError(null);
    setNotice(null);
    setStep(next);
  };

  const update = (key: keyof Details) => (value: string) => {
    setDetails((d) => ({ ...d, [key]: value }));
    setDetailErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submitDetails = async () => {
    const errors: DetailErrors = {};
    if (!details.shopName.trim()) errors.shopName = t('register.shopNameRequired');
    if (!details.name.trim()) errors.name = t('register.yourNameRequired');
    if (!isValidEmail(details.email)) errors.email = t('auth.emailInvalid');
    if (!isValidTzPhone(details.phone)) errors.phone = t('register.mobileInvalid');
    setDetailErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length) return;

    setBusy(true);
    try {
      const res = await authService.registerShop(details);
      setRequestId(res.requestId);
      setDemoCode(res.demoCode);
      setCode('');
      setResendIn(RESEND_SECONDS);
      goTo('verify');
    } catch (e) {
      const message = errorMessage(t, e, { emailTaken: 'register.emailTaken' });
      if (e instanceof ApiError && e.code === 'emailTaken') setDetailErrors({ email: message });
      else setFormError(message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!requestId) return;
    setFormError(null);
    try {
      const res = await authService.resendPhoneCode(requestId);
      setDemoCode(res.demoCode);
      setResendIn(RESEND_SECONDS);
      setNotice(t('register.codeResent'));
    } catch (e) {
      setFormError(errorMessage(t, e));
    }
  };

  const submitCode = async () => {
    if (!requestId) return;
    if (code.trim().length < 6) {
      setFieldError(t('register.codeInvalid'));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await authService.confirmPhone({ requestId, code });
      goTo('password');
    } catch (e) {
      const message = errorMessage(t, e, { invalidCode: 'register.codeInvalid' });
      if (e instanceof ApiError && e.code === 'invalidCode') setFieldError(message);
      else setFormError(message);
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async () => {
    if (!requestId) return;
    if (!isAcceptablePassword(password)) {
      setFieldError(t('register.passwordRule'));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const created = await authService.confirmShop({ requestId, password });
      setSession(created);
      goTo('ready');
    } catch (e) {
      setFormError(errorMessage(t, e, { registrationIncomplete: 'register.failed', registrationExpired: 'register.failed' }));
    } finally {
      setBusy(false);
    }
  };

  const enterShop = () => {
    if (!session) return;
    setEmptyShop(true);
    signIn(session);
    router.replace('/home');
  };

  const onBack = () => {
    if (step === 'verify') goTo('details');
    else if (step === 'password') goTo('verify');
    else router.back();
  };

  if (step === 'ready' && session) {
    return (
      <Screen footer={<Button label={t('register.goToShop')} size="lg" icon="shop" onPress={enterShop} block />}>
        <View style={styles.ready}>
          <View style={styles.readyIcon}>
            <Icon name="check" size={44} color={colors.success} />
          </View>
          <Text variant="title" align="center" accessibilityRole="header">
            {t('register.readyTitle')}
          </Text>
          <Text variant="body" align="center" color={colors.inkMuted}>
            {t('register.readyBody', { shop: session.shop.name })}
          </Text>
          <Card style={styles.readyCard}>
            <Badge label={t('plan.trial')} tone="info" icon="clock" />
            <Text variant="body">{t('register.readyTrial')}</Text>
          </Card>
        </View>
      </Screen>
    );
  }

  const stepNumber = STEP_NUMBER[step as Exclude<Step, 'ready'>];

  const footer =
    step === 'details' ? (
      <Button label={t('register.sendCode')} loadingLabel={t('register.sending')} loading={busy} size="lg" onPress={submitDetails} block />
    ) : step === 'verify' ? (
      <Button label={t('register.verify')} loadingLabel={t('register.verifying')} loading={busy} size="lg" onPress={submitCode} block />
    ) : (
      <Button label={t('register.openMyShop')} loadingLabel={t('register.opening')} loading={busy} size="lg" onPress={submitPassword} block />
    );

  return (
    <Screen header={<TopBar title={t('register.title')} onBack={onBack} />} footer={footer}>
      <StepIndicator current={stepNumber} total={3} label={t('register.step', { n: stepNumber, total: 3 })} />

      {formError ? <Banner tone="danger" message={formError} /> : null}
      {notice ? <Banner tone="success" message={notice} /> : null}

      {step === 'details' ? (
        <>
          <Text variant="body" color={colors.inkMuted}>
            {t('register.detailsLead')}
          </Text>
          <TextField
            label={t('register.shopName')}
            icon="shop"
            value={details.shopName}
            onChangeText={update('shopName')}
            placeholder={t('register.shopNamePlaceholder')}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => nameRef.current?.focus()}
            error={detailErrors.shopName}
          />
          <TextField
            ref={nameRef}
            label={t('register.yourName')}
            icon="person"
            value={details.name}
            onChangeText={update('name')}
            placeholder={t('register.yourNamePlaceholder')}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            error={detailErrors.name}
          />
          <TextField
            ref={emailRef}
            label={t('auth.email')}
            icon="mail"
            value={details.email}
            onChangeText={update('email')}
            placeholder={t('auth.emailPlaceholder')}
            hint={t('register.emailHint')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            error={detailErrors.email}
          />
          <TextField
            ref={phoneRef}
            label={t('register.mobile')}
            icon="phone"
            value={details.phone}
            onChangeText={update('phone')}
            placeholder="0712 345 678"
            hint={t('register.mobileHint')}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="done"
            onSubmitEditing={submitDetails}
            error={detailErrors.phone}
          />
          <Text variant="caption" color={colors.inkMuted}>
            {t('auth.terms')}
          </Text>
          <TextLink label={t('register.haveAccount')} onPress={() => router.replace('/login')} />
        </>
      ) : null}

      {step === 'verify' ? (
        <>
          <Text variant="heading" accessibilityRole="header">
            {t('register.confirmTitle')}
          </Text>
          <Text variant="body" color={colors.inkMuted}>
            {t('register.confirmLead', { phone: formatPhone(details.phone) })}
          </Text>
          {demoCode ? <Banner tone="info" icon="sms" message={t('register.demoCode', { code: demoCode })} /> : null}
          <TextField
            label={t('register.code')}
            icon="sms"
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, '').slice(0, 6));
              setFieldError(null);
            }}
            placeholder="••••••"
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={submitCode}
            error={fieldError}
          />
          <View style={styles.row}>
            {resendIn > 0 ? (
              <Text variant="caption" color={colors.inkMuted}>
                {t('register.resendIn', { s: resendIn })}
              </Text>
            ) : (
              <TextLink label={t('register.resend')} onPress={resend} />
            )}
            <TextLink label={t('register.changeNumber')} onPress={() => goTo('details')} />
          </View>
        </>
      ) : null}

      {step === 'password' ? (
        <>
          <Text variant="heading" accessibilityRole="header">
            {t('register.passwordTitle')}
          </Text>
          <Text variant="body" color={colors.inkMuted}>
            {t('register.passwordLead', { email: details.email.trim() })}
          </Text>
          <TextField
            label={t('auth.password')}
            icon="lock"
            password
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setFieldError(null);
            }}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={submitPassword}
            error={fieldError}
          />
          <PasswordMeter password={password} />
        </>
      ) : null}
    </Screen>
  );
}

function StepIndicator({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <View style={styles.steps} accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 1, max: total, now: current }}>
      <View style={styles.stepBars}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.stepBar, i < current && styles.stepBarDone]} />
        ))}
      </View>
      <Text variant="caption" color={colors.inkMuted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.md,
  },
  steps: {
    gap: space.xs,
  },
  stepBars: {
    flexDirection: 'row',
    gap: space.xs,
  },
  stepBar: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  stepBarDone: {
    backgroundColor: colors.brand,
  },
  ready: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.md,
  },
  readyIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  readyCard: {
    alignSelf: 'stretch',
    gap: space.sm,
    marginTop: space.md,
  },
});
