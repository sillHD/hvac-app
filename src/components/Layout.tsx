/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 *  - Fondo oscuro y color de texto base
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Uso: Envuelto en _app.tsx alrededor de cada <Component>
 * Internal implementation detail.
 */
import { ReactNode } from 'react';
import { useAuth } from '../client/hooks/useAuth';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#171717] text-zinc-100">
      <Header user={user} loading={loading} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        {/* pages will render here; they can decide to require auth */}
        {children}
      </main>
    </div>
  );
}
