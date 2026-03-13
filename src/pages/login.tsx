import { useRouter } from 'next/router';
import React from 'react';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
  const router = useRouter();

  const handleSuccess = () => {
    // after successful login the backend should set a secure cookie/session
    router.replace('/dashboard');
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#171717]">
      <div className="p-6 premium-section w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-center premium-gradient-text">Acceso técnicos</h2>
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
