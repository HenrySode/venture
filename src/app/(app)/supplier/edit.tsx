import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Button, Screen, TextField, TopBar } from '@/components/ui';
import { useT } from '@/i18n';
import { mockRequest } from '@/services/client';
import { useData } from '@/state/data';
import { useToast } from '@/state/toast';

/** Add (no id) or edit (?id=) a supplier. */
export default function SupplierFormScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { suppliers, saveSupplier } = useData();
  const existing = id ? suppliers.find((s) => String(s.id) === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [place, setPlace] = useState(existing?.place ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      setError(t('suppliers.nameRequired'));
      return;
    }
    setBusy(true);
    await mockRequest(
      () => saveSupplier({ name: name.trim(), phone: phone.trim() || null, place: place.trim() || null, notes: notes.trim() || null }, existing?.id),
      400,
    ).catch(() => undefined);
    toast({ message: t('suppliers.saved') });
    router.back();
  };

  return (
    <Screen
      header={<TopBar title={existing ? t('suppliers.editTitle') : t('suppliers.newTitle')} />}
      footer={<Button label={t('suppliers.save')} size="lg" icon="check" loading={busy} onPress={save} block />}>
      <TextField
        label={t('suppliers.name')}
        icon="suppliers"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        autoCapitalize="words"
        error={error}
      />
      <TextField label={`${t('suppliers.phone')} · ${t('common.optional')}`} icon="phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label={`${t('suppliers.place')} · ${t('common.optional')}`} icon="shop" value={place} onChangeText={setPlace} autoCapitalize="words" />
      <TextField label={`${t('suppliers.notes')} · ${t('common.optional')}`} value={notes} onChangeText={setNotes} multiline />
    </Screen>
  );
}
