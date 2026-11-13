import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PasswordMeter } from '@/components/password-meter';
import { Badge, Banner, Button, Card, EmptyState, ErrorState, Logo, Screen, Skeleton, Text, TextField, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { isAcceptablePassword } from '@/lib/password';
import { authService, type InviteStatus } from '@/services/auth';
import { useData } from '@/state/data';
import { useSession } from '@/state/session';
import { colors, space } from '@/theme';

type LoadState = { kind: 'loading' } | { kind: 'error' } | { kind: 'loaded'; invite: InviteStatus };

/** Accept a team invite: venture://set-password?token=… */
export default function SetPasswordScreen() {
  const t = useT();
  const router = useRouter();
  const { token = '' } = useLocalSearchParams<{ token?: string }>();
  const { signIn } = useSession();
  const { setEmptyShop } = useData();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    authService
      .inviteStatus(token)
      .then((invite) => !cancelled && setState({ kind: 'loaded', invite }))
      .catch(() => !cancelled && setState({ kind: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  const retry = () => {
    setState({ kind: 'loading' });
    setAttempt((a) => a + 1);
  };

  const submit = async () => {
    const next: typeof errors = {};
    if (!isAcceptablePassword(password)) next.password = t('register.passwordRule');
    if (confirm !== password) next.confirm = t('forgot.mismatch');
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    setFormError(null);
    try {
      const session = await authService.setPassword({ token, password });
      setEmptyShop(false);
      signIn(session);
      router.replace('/hub');
    } catch (e) {
      setFormError(errorMessage(t, e, { inviteInvalid: 'invite.invalidBody' }));
      setBusy(false);
    }
  };

  const invite = state.kind === 'loaded' && state.invite.valid ? state.invite : null;

  return (
    <Screen
      header={<TopBar onBack={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />}
      footer={
        invite ? (
          <Button label={t('invite.submit')} loadingLabel={t('invite.submitting')} loading={busy} size="lg" onPress={submit} block />
        ) : state.kind === 'loaded' ? (
          <Button label={t('forgot.backToSignIn')} size="lg" variant="secondary" onPress={() => router.replace('/login')} block />
        ) : null
      }>
      {state.kind === 'loading' ? (
        <View style={styles.loading} accessibilityLabel={t('invite.checking')}>
          <Text variant="body" color={colors.inkMuted}>
            {t('invite.checking')}
          </Text>
          <Skeleton height={28} width="70%" />
          <Skeleton height={16} />
          <Skeleton height={52} />
          <Skeleton height={52} />
        </View>
      ) : null}

      {state.kind === 'error' ? <ErrorState onRetry={retry} /> : null}

      {state.kind === 'loaded' && !state.invite.valid ? (
        <EmptyState icon="warning" title={t('invite.invalidTitle')} message={t('invite.invalidBody')} />
      ) : null}

      {invite ? (
        <>
          <View style={styles.intro}>
            <Logo size={48} />
            <Text variant="title" accessibilityRole="header">
              {t('invite.title', { shop: invite.shopName })}
            </Text>
            <Text variant="body" color={colors.inkMuted}>
              {t('invite.lead', { inviter: invite.inviterName, role: t(`roles.${invite.role}`) })}
            </Text>
          </View>
          <Card style={styles.who}>
            <View style={styles.flex}>
              <Text variant="caption" color={colors.inkMuted}>
                {t('auth.email')}
              </Text>
              <Text variant="bodyStrong">{invite.email}</Text>
            </View>
            <Badge label={t(`roles.${invite.role}`)} tone="brand" />
          </Card>
          {formError ? <Banner tone="danger" message={formError} /> : null}
          <TextField
            label={t('forgot.newPassword')}
            icon="lock"
            password
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setErrors((e) => ({ ...e, password: undefined }));
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
              setErrors((e) => ({ ...e, confirm: undefined }));
            }}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={submit}
            error={errors.confirm}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    gap: space.md,
  },
  intro: {
    gap: space.sm,
  },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
});
