import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { en, type Dictionary } from './en';
import { sw } from './sw';

export type Locale = 'sw' | 'en';

const dictionaries: Record<Locale, Dictionary> = { en, sw };

/** Dot-separated paths to every string in the dictionary, e.g. "auth.signIn". */
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TranslationKey = Leaves<Dictionary>;
export type TranslationParams = Record<string, string | number>;
export type TFunction = (key: TranslationKey, params?: TranslationParams) => string;

function lookup(dict: Dictionary, key: string): string {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  return typeof node === 'string' ? node : key;
}

function interpolate(text: string, params?: TranslationParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
};

const I18nContext = createContext<I18nContextValue | null>(null);

/** Kiswahili is the default language (PRD §8 default). */
export function I18nProvider({ children, initialLocale = 'sw' }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  const t = useCallback<TFunction>(
    (key, params) => interpolate(lookup(dictionaries[locale], key), params),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Shorthand for the translate function. */
export function useT(): TFunction {
  return useI18n().t;
}
