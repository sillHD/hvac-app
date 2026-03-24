/**
 * Header.tsx — Barra de navegación principal de la aplicación.
 *
 * Responsabilidades:
 *  - Mostrar el logo de ANC HVAC (vinculado a la home)
 *  - Renderizar los enlaces de navegación según el rol del usuario:
 *      - Todos:       Dashboard, Clientes, Nueva Factura, Nueva Cotización, Estado, Historial
 *      - admin/root:  + Logs de auditoría
 *      - root:        + Gestión de usuarios
 *  - Menú hamburguesa en móvil (toggle con estado `menuOpen`)
 *  - Selector de idioma ES/EN
 *  - Botón de Logout (llama a /api/auth/logout, borra token de localStorage)
 *
 * Props:
 *  user    — Usuario autenticado o null
 *  loading — Si true, no muestra los enlaces (previene flash de navegación)
 *
 * NOTA: La visibilidad por rol se controla en el componente directamente.
 * Si en el futuro necesitas agregar una nueva ruta protegida, añádela a la lista
 * correcta: commonLinks/adminLinks/rootLinks.
 */
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { User } from '../lib/types';
import { useI18n } from '../i18n/I18nProvider';

interface HeaderProps {
  user: User | null;
  loading: boolean;
}

export default function Header({ user, loading }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const toggleMenu = () => {
    if (isNavigating) return;
    setMenuOpen((open) => !open);
  };

  const performLogout = async () => {
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

  const onClickLogout = () => {
    setShowLogoutConfirm(true);
  };

  const onConfirmLogout = async () => {
    try {
      setLogoutLoading(true);
      await performLogout();
    } finally {
      setLogoutLoading(false);
      setShowLogoutConfirm(false);
    }
  };

  const onCancelLogout = () => {
    if (logoutLoading) return;
    setShowLogoutConfirm(false);
  };

  // navigation items available to all authenticated users
  const commonLinks = [
    { href: '/dashboard', label: t('nav.dashboard') },
    { href: '/customers', label: t('nav.customers') },
    { href: '/reports', label: t('nav.newInvoice') },
    { href: '/quotes', label: t('nav.newQuote') },
    { href: '/reports/status', label: t('nav.status') },
    { href: '/history', label: t('nav.history') },
  ];

  // admin-only
  const adminLinks = [{ href: '/logs', label: t('nav.logs') }];
  const rootLinks = [{ href: '/admin/users', label: t('nav.users') }];
  const canSeeLogs = user?.role === 'admin' || user?.role === 'root';
  const canSeeUsers = user?.role === 'root';

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') {
      return router.pathname === '/dashboard';
    }
    return router.pathname === href || router.pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    const onDone = () => setIsNavigating(false);
    router.events.on('routeChangeComplete', onDone);
    router.events.on('routeChangeError', onDone);
    return () => {
      router.events.off('routeChangeComplete', onDone);
      router.events.off('routeChangeError', onDone);
    };
  }, [router.events]);

  const handleNavTap = (e: React.MouseEvent) => {
    if (isNavigating) {
      e.preventDefault();
      return;
    }
    setIsNavigating(true);
    setMenuOpen(false);
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
          disabled={isNavigating}
          className="sm:hidden text-white focus:outline-none rounded-full border border-amber-500/30 bg-white/5 p-2 disabled:opacity-50"
          aria-label={t('ui.menu')}
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
                  onClick={handleNavTap}
                  className={`nav-link ${isActiveLink(link.href) ? 'nav-link-active' : ''} ${
                    isNavigating ? 'pointer-events-none opacity-70' : ''
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {canSeeLogs &&
                adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleNavTap}
                    className={`nav-link ${isActiveLink(link.href) ? 'nav-link-active' : ''} ${
                      isNavigating ? 'pointer-events-none opacity-70' : ''
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              {canSeeUsers &&
                rootLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleNavTap}
                    className={`nav-link ${isActiveLink(link.href) ? 'nav-link-active' : ''} ${
                      isNavigating ? 'pointer-events-none opacity-70' : ''
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              <div className="flex items-center gap-1 px-2 py-1">
                <span className="text-xs text-zinc-400">{t('ui.language')}</span>
                <button
                  type="button"
                  onClick={() => setLocale('es')}
                  className={`rounded-full px-2 py-0.5 text-xs border transition-colors ${
                    locale === 'es'
                      ? 'border-amber-400/70 text-amber-300 bg-amber-500/10'
                      : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t('lang.es')}
                </button>
                <button
                  type="button"
                  onClick={() => setLocale('en')}
                  className={`rounded-full px-2 py-0.5 text-xs border transition-colors ${
                    locale === 'en'
                      ? 'border-amber-400/70 text-amber-300 bg-amber-500/10'
                      : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t('lang.en')}
                </button>
              </div>
              <button
                type="button"
                onClick={onClickLogout}
                disabled={isNavigating}
                className="nav-link text-zinc-300 hover:text-amber-300 text-left disabled:opacity-60"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={handleNavTap}
              className={`nav-link text-amber-300 hover:text-amber-200 ${
                isNavigating ? 'pointer-events-none opacity-70' : ''
              }`}
            >
              {t('auth.login')}
            </Link>
          )}
        </nav>
      </div>

      {/* Reemplaza el onClick del botón/link "Salir" */}
      {/* Antes: onClick={performLogout} */}
      {/* Ahora: */}
      {/* <button onClick={onClickLogout}>Salir</button> */}

      {/* Modal inline de confirmación */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-zinc-900 text-zinc-100 p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-amber-300">
              ¿Seguro que quieres salir de la cuenta?
            </h2>
            <p className="mt-2 text-sm text-zinc-300">
              Se cerrará la sesión actual en este dispositivo.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCancelLogout}
                disabled={logoutLoading}
                className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirmLogout}
                disabled={logoutLoading}
                className="rounded-xl border border-amber-400/60 bg-amber-500/15 px-4 py-3 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/25 disabled:opacity-60"
              >
                {logoutLoading ? 'Saliendo...' : 'Sí, salir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
