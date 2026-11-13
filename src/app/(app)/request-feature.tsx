import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Divider, EmptyState, Screen, Text, TextField, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate } from '@/lib/format';
import { mockRequest } from '@/services/client';
import { useManage } from '@/state/manage';
import { colors, space } from '@/theme';

/** "What do you need?" → Send. Requests stay on this device in the demo. */
export default function RequestFeatureScreen() {
  const { t, locale } = useI18n();
  const { requests, sendRequest } = useManage();
  const [need, setNeed] = useState('');
  const [how, setHow] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!need.trim()) {
      setError(t('feature.needRequired'));
      return;
    }
    setBusy(true);
    await mockRequest(() => sendRequest({ need, how }), 700).catch(() => undefined);
    setBusy(false);
    setNeed('');
    setHow('');
    setSent(true);
  };

  return (
    <Screen
      header={<TopBar title={t('feature.title')} />}
      footer={
        sent ? (
          <Button label={t('feature.another')} variant="secondary" onPress={() => setSent(false)} block />
        ) : (
          <Button label={t('feature.send')} icon="rocket" size="lg" loading={busy} onPress={send} block />
        )
      }>
      {sent ? (
        <EmptyState icon="check" title={t('feature.sentTitle')} message={t('feature.sentBody')} />
      ) : (
        <>
          <Text variant="body" color={colors.inkMuted}>
            {t('feature.lead')}
          </Text>
          <TextField
            label={t('feature.need')}
            icon="idea"
            value={need}
            onChangeText={(v) => {
              setNeed(v);
              setError(null);
            }}
            placeholder={t('feature.needPlaceholder')}
            error={error}
          />
          <TextField
            label={`${t('feature.how')} · ${t('common.optional')}`}
            value={how}
            onChangeText={setHow}
            placeholder={t('feature.howPlaceholder')}
            multiline
          />
        </>
      )}

      {requests.length ? (
        <>
          <Text variant="overline" color={colors.inkMuted}>
            {t('feature.yours').toUpperCase()}
          </Text>
          <Card padded={false}>
            {requests.map((r, i) => (
              <View key={r.id}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.row}>
                  <Text variant="bodyStrong">{r.need}</Text>
                  {r.how ? (
                    <Text variant="caption" color={colors.inkMuted} numberOfLines={2}>
                      {r.how}
                    </Text>
                  ) : null}
                  <Text variant="caption" color={colors.inkSubtle}>
                    {formatDate(r.createdAt, locale)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: space.xxs,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
