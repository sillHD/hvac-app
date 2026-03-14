import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from 'react';
import Layout from '../components/Layout';

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
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
