import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, type Locale, translations } from './translations';

interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = 'anc-hvac-locale';

export function I18nProvider({ children }: { children: ReactNode }) {
  // Keep the first render identical on server and client to avoid hydration mismatch.
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const initializedFromStorageRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (initializedFromStorageRef.current) return;

    initializedFromStorageRef.current = true;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== 'en') return;
    if (saved === locale) return;

    // Defer state update until after hydration commit.
    const timer = window.setTimeout(() => {
      setLocale(saved);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [locale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!initializedFromStorageRef.current) return;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string) => {
      return translations[locale][key] || translations[DEFAULT_LOCALE][key] || key;
    };

    return {
      locale,
      setLocale,
      t,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
