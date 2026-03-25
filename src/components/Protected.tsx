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
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

interface ProtectedProps {
  children: ReactNode;
}

export default function Protected({ children }: ProtectedProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const hasToken = useMemo(() => {
    if (!isMounted) return false;
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  }, [isMounted]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!hasToken) {
      void router.replace('/login');
    }
  }, [isMounted, hasToken, router]);

  if (!isMounted || !hasToken) return <div className="p-4 text-sm text-zinc-400">Cargando...</div>;

  return <>{children}</>;
}
