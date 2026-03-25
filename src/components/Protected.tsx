/**
 * Protected.tsx — Guard de autenticación del lado del cliente.
 *
 * Comportamiento:
 *  - Si el usuario no está autenticado, redirige a /login
 *  - Mientras carga (loading=true), muestra indicador de carga
 *  - Si el usuario está autenticado, renderiza {children}
 *
 * IMPORTANTE:
 *  - Este guard es solo del lado cliente (JavaScript). No reemplaza la
 *    protección del servidor en las rutas API (withAuth).
 *  - En producción, añadir middleware de Next.js (middleware.ts) para
 *    proteger rutas a nivel de servidor/CDN.
 *
 * Uso:
 *   <Protected>
 *     <MiContenidoProtegido />
 *   </Protected>
 */
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../client/hooks/useAuth';
import { useI18n } from '../i18n/I18nProvider';

interface ProtectedProps {
  children: ReactNode;
}

// simple client-side guard; in production rely on server checks too
export default function Protected({ children }: ProtectedProps) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>('checking');
  const [message, setMessage] = useState<string>('');
  const inFlightRef = useRef(false);
  const redirectedRef = useRef(false);

  const validateSession = useCallback(async () => {
    if (inFlightRef.current || redirectedRef.current) return;
    inFlightRef.current = true;

    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);

      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: ctrl.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        setState('authorized');
        setMessage('');
        return;
      }

      // Solo logout forzado con 401/403 reales
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') localStorage.removeItem('token');
        setState('unauthorized');
        redirectedRef.current = true;
        await router.replace('/login');
        return;
      }

      // 5xx/otros => error temporal, NO expulsar
      setState((prev) => (prev === 'authorized' ? 'authorized' : 'soft-error'));
      setMessage('Conexión inestable. Se mantiene la sesión.');
    } catch {
      // timeout/offline => NO expulsar
      setState((prev) => (prev === 'authorized' ? 'authorized' : 'soft-error'));
      setMessage('Sin conexión temporal. Reintentando...');
    } finally {
      inFlightRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    void validateSession();

    const interval = window.setInterval(() => {
      void validateSession();
    }, 90000);

    const onOnline = () => void validateSession();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void validateSession();
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [validateSession]);

  if (state === 'checking') {
    return <div className="p-4 text-sm text-zinc-400">Validando sesión...</div>;
  }

  if (state === 'unauthorized') {
    return null;
  }

  return (
    <>
      {state === 'soft-error' && (
        <div className="mx-4 mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {message}
        </div>
      )}
      {children}
    </>
  );
}
