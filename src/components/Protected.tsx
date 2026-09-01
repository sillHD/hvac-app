/**
 * Internal implementation detail.
 *
 * Comportamiento:
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * IMPORTANTE:
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *    proteger rutas a nivel de servidor/CDN.
 *
 * Uso:
 *   <Protected>
 *     <MiContenidoProtegido />
 *   </Protected>
 */
import { ReactNode, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/router';

interface ProtectedProps {
  children: ReactNode;
}

// useSyncExternalStore: server snapshot = false, client snapshot = true.
// React hydrates matching the server (false → loading screen), then immediately
// switches to the client value without a hydration mismatch warning.
const subscribeNoop = () => () => {};

export default function Protected({ children }: ProtectedProps) {
  const router = useRouter();
  const isMounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const hasToken = isMounted ? !!localStorage.getItem('token') : false;

  useEffect(() => {
    if (!isMounted) return;
    if (!hasToken) {
      void router.replace('/login');
    }
  }, [isMounted, hasToken, router]);

  if (!isMounted || !hasToken) {
    return <div className="p-4 text-sm text-zinc-400">Cargando...</div>;
  }

  return <>{children}</>;
}
