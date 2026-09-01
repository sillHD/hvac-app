/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 *  - I18nProvider: English localization context
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 */
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from 'react';
import Layout from '../components/Layout';
import { I18nProvider } from '../i18n/I18nProvider';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => registration.update())
      .catch((err) => {
        console.error('Service worker registration failed', err);
      });
  }, []);

  return (
    <I18nProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </I18nProvider>
  );
}
