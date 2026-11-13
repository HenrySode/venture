import { useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { colors, radius, space } from '@/theme';

import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';
import { TextField } from './text-field';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/** Bottom sheet built on RN Modal (no extra native dependency). */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="heading" style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={12}>
              <Icon name="close" size={22} color={colors.inkMuted} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

type ConfirmCodeDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Labels are passed in so the dialog stays reusable across screens. */
  codeLabel: string;
  mismatchLabel: string;
};

/**
 * Guard for destructive actions (reset / restore): the user must retype a
 * random 6-character code, as on the web app.
 */
export function ConfirmCodeDialog({ visible, title, message, confirmLabel, onConfirm, onCancel, codeLabel, mismatchLabel }: ConfirmCodeDialogProps) {
  const t = useT();
  const code = useMemo(() => (visible ? makeCode() : ''), [visible]);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setTyped('');
    setError(null);
    onCancel();
  };

  const submit = () => {
    if (typed.trim().toUpperCase() !== code) {
      setError(mismatchLabel);
      return;
    }
    setTyped('');
    setError(null);
    onConfirm();
  };

  return (
    <Sheet visible={visible} onClose={close} title={title}>
      <View style={styles.body}>
        <Text variant="body" color={colors.inkMuted}>
          {message}
        </Text>
        <View style={styles.codeBox}>
          <Text variant="title" style={styles.code} selectable>
            {code}
          </Text>
        </View>
        <TextField
          label={codeLabel}
          value={typed}
          onChangeText={(v) => {
            setTyped(v);
            setError(null);
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          error={error}
          onSubmitEditing={submit}
        />
        <View style={styles.actions}>
          <Button label={t('common.cancel')} variant="secondary" onPress={close} style={styles.flex} />
          <Button label={confirmLabel} variant="danger" onPress={submit} style={styles.flex} />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    gap: space.md,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  title: {
    flex: 1,
  },
  body: {
    gap: space.lg,
  },
  codeBox: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  code: {
    letterSpacing: 4,
    color: colors.danger,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
});
