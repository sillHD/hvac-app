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
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="p-4">{t('ui.loading')}</div>;
  }

  return <>{children}</>;
}
