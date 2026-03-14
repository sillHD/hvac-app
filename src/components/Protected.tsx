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
