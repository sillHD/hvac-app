import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { User } from '../lib/types';
import { canManageUsers, canViewLogs } from '../lib/utils/roles';

interface HeaderProps {
  user: User | null;
  loading: boolean;
}

export default function Header({ user, loading }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const toggleMenu = () => setMenuOpen((open) => !open);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      localStorage.removeItem('token');
      setMenuOpen(false);
      await router.replace('/login');
    }
  };

  // navigation items available to all authenticated users
  const commonLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/reports', label: 'Nueva factura' },
    { href: '/quotes', label: 'Nueva cotizacion' },
    { href: '/reports/status', label: 'Estado' },
    { href: '/history', label: 'Historial' },
  ];

  // admin-only
  const adminLinks = [{ href: '/logs', label: 'Logs' }];
  const rootLinks = [{ href: '/admin/users', label: 'Usuarios' }];

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') {
      return router.pathname === '/dashboard';
    }
    return router.pathname === href || router.pathname.startsWith(`${href}/`);
  };

  return (
    <header>
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center">
          <span className="block overflow-hidden">
            <Image
              src="/anc-logo.jpeg"
              alt="ANC HVAC"
              width={220}
              height={72}
              className="h-14 sm:h-[4.5rem] w-auto object-cover scale-[1.04]"
              style={{ clipPath: 'inset(1px 1px 1px 1px)' }}
            />
          </span>
        </Link>

        <button
          onClick={toggleMenu}
          className="sm:hidden text-white focus:outline-none rounded-full border border-amber-500/30 bg-white/5 p-2"
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
          } sm:flex sm:items-center sm:justify-end sm:flex-1 w-full sm:w-auto mt-3 sm:mt-0`}
        >
          {loading ? null : user ? (
            <div className="nav-shell-mobile sm:nav-shell flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-1 w-full sm:w-auto">
              {commonLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${isActiveLink(link.href) ? 'nav-link-active' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
              {canViewLogs(user.role) &&
                adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`nav-link ${isActiveLink(link.href) ? 'nav-link-active' : ''}`}
                  >
                    {link.label}
                  </Link>
                ))}
              {canManageUsers(user.role) &&
                rootLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`nav-link ${isActiveLink(link.href) ? 'nav-link-active' : ''}`}
                  >
                    {link.label}
                  </Link>
                ))}
              <button
                type="button"
                onClick={handleLogout}
                className="nav-link text-zinc-300 hover:text-amber-300 text-left"
              >
                Salir
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="nav-link text-amber-300 hover:text-amber-200"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
