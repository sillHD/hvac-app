import Link from 'next/link';
import { useState } from 'react';
import { User } from '../lib/types';

interface HeaderProps {
  user: User | null;
  loading: boolean;
}

export default function Header({ user, loading }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((open) => !open);

  // navigation items available to all authenticated users
  const commonLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/reports', label: 'Reportar' },
    { href: '/history', label: 'Historial' },
  ];

  // admin-only
  const adminLinks = [{ href: '/logs', label: 'Logs' }];

  return (
    <header className="bg-slate-800 shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold text-white">
          HVAC App
        </Link>

        <button
          onClick={toggleMenu}
          className="sm:hidden text-gray-700 focus:outline-none"
          aria-label="Menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <nav
          className={`${
            menuOpen ? 'block' : 'hidden'
          } sm:flex sm:items-center w-full sm:w-auto`}
        >
          {!loading && user ? (
            <>
              {commonLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block mt-2 sm:mt-0 sm:ml-4 text-slate-200 hover:text-indigo-300 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {user.role === 'admin' &&
                adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block mt-2 sm:mt-0 sm:ml-4 text-slate-200 hover:text-indigo-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              <Link
                href="/api/auth/logout"
                className="block mt-2 sm:mt-0 sm:ml-4 text-red-400 hover:text-red-600 transition-colors"
              >
                Salir
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="block mt-2 sm:mt-0 sm:ml-4 text-indigo-300 hover:text-indigo-200 transition-colors"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
