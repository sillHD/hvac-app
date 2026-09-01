/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Al login exitoso, redirige al dashboard.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 */
import { useRouter } from 'next/router';
import React from 'react';
import LoginForm from '../components/LoginForm';
import { useI18n } from '../i18n/I18nProvider';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();

  const handleSuccess = () => {
    // after successful login the backend should set a secure cookie/session
    router.replace('/dashboard');
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#171717]">
      <div className="p-6 premium-section w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-center premium-gradient-text">{t('login.title')}</h2>
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
