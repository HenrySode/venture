import type { TFunction, TranslationKey } from '@/i18n';
import { ApiError } from '@/services/client';

/**
 * Turns a service error into a translated message.
 * `map` links ApiError codes to screen-specific keys; network errors and
 * anything unmapped fall back to generic messages.
 */
export function errorMessage(t: TFunction, error: unknown, map: Partial<Record<string, TranslationKey>> = {}): string {
  if (error instanceof ApiError) {
    const key = map[error.code];
    if (key) return t(key);
    if (error.code === 'network') return t('common.networkError');
  }
  return t('common.somethingWrong');
}
