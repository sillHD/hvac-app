export type Locale = 'es' | 'en';

export const DEFAULT_LOCALE: Locale = 'es';

export const translations: Record<Locale, Record<string, string>> = {
  es: {
    'nav.dashboard': 'Dashboard',
    'nav.newInvoice': 'Nueva factura',
    'nav.newQuote': 'Nueva cotización',
    'nav.status': 'Estado',
    'nav.history': 'Historial',
    'nav.logs': 'Logs',
    'nav.users': 'Usuarios',
    'nav.logout': 'Salir',
    'auth.login': 'Iniciar sesión',
    'ui.menu': 'Menú',
    'ui.language': 'Idioma',
    'lang.es': 'ES',
    'lang.en': 'EN',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.newInvoice': 'New invoice',
    'nav.newQuote': 'New quote',
    'nav.status': 'Status',
    'nav.history': 'History',
    'nav.logs': 'Logs',
    'nav.users': 'Users',
    'nav.logout': 'Log out',
    'auth.login': 'Sign in',
    'ui.menu': 'Menu',
    'ui.language': 'Language',
    'lang.es': 'ES',
    'lang.en': 'EN',
  },
};
