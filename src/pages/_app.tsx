/**
 * _app.tsx — Punto de entrada global de la aplicación Next.js.
 *
 * Envuelve TODAS las páginas con:
 *  - I18nProvider: contexto de idioma (ES/EN), detecta locale guardado en localStorage
 *  - Layout: estructura base con Header y contenedor de página
 *
 * Además registra el Service Worker en producción para funcionalidad offline/PWA.
 * El archivo public/sw.js debe existir para que esto funcione.
 *
 * Para agregar un proveedor global nuevo (tema, notificaciones, etc.),
 * añádelo envolviendo <Layout> aquí.
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
