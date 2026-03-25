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

interface ProtectedProps {
  children: ReactNode;
}

export default function Protected({ children }: ProtectedProps) {
  const router = useRouter();
  const hasToken = typeof window !== 'undefined' ? !!localStorage.getItem('token') : false;

  useEffect(() => {
    if (!hasToken) {
      void router.replace('/login');
    }
  }, [hasToken, router]);

  if (!hasToken) return <div className="p-4 text-sm text-zinc-400">Cargando...</div>;

  return <>{children}</>;
}
