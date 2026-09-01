# ANC HVAC

Aplicación web para la gestión operativa de una empresa de climatización (HVAC). Permite a técnicos y personal administrativo crear presupuestos y facturas, gestionar clientes y usuarios, consultar el historial de trabajos y revisar eventos de auditoría.

Este proyecto forma parte de mi portafolio profesional para Upwork y muestra una implementación full-stack con Next.js, TypeScript, autenticación por roles e integraciones externas preparadas para crecer.

## Funcionalidades destacadas

- Creación de facturas y presupuestos desde una interfaz adaptada a móviles.
- Gestión de clientes, incluyendo varias direcciones por cliente.
- Panel con métricas de trabajos, pagos y cobros pendientes.
- Historial de reportes con edición y eliminación según permisos.
- Roles de técnico, administrador y root.
- Administración de usuarios para administradores autorizados.
- Registro de auditoría para accesos y operaciones relevantes.
- Interfaz bilingüe en español e inglés.
- Soporte PWA para instalación en dispositivos móviles y uso limitado sin conexión.
- Persistencia opcional de reportes en Google Sheets y de usuarios en Upstash Redis.

## Tecnologías

- [Next.js](https://nextjs.org/) 16 con Pages Router
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zod](https://zod.dev/) para validación de formularios
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) para hash de contraseñas
- [Upstash Redis](https://upstash.com/) para almacenamiento persistente de usuarios
- [Google Sheets API](https://developers.google.com/sheets/api) para persistencia de reportes

## Arquitectura

El repositorio separa la interfaz, las rutas HTTP y la lógica de servidor:

```text
src/
├── pages/          # Vistas y rutas API de Next.js
│   ├── api/        # Autenticación, reportes, clientes, usuarios y logs
│   └── _app.tsx    # Punto de entrada global
├── components/     # Componentes reutilizables de la interfaz
├── client/         # Hooks y utilidades exclusivas del navegador
├── i18n/           # Contexto y traducciones ES/EN
├── lib/            # Tipos, mocks, validaciones y utilidades compartidas
├── server/         # Autenticación, autorización, servicios e integraciones
│   ├── middleware/ # Protección de rutas y permisos por rol
│   └── services/   # Usuarios, trabajos, auditoría, Google Sheets e IA
└── styles/         # Estilos globales
```

Las páginas React consumen rutas en `pages/api`. Estas rutas aplican autenticación y autorización antes de delegar en los servicios de `src/server`. Los tipos del dominio —usuarios, clientes, trabajos, presupuestos y estados de pago— viven en `src/lib/types`.

## Flujo principal

1. El usuario inicia sesión con una cuenta configurada por variables de entorno.
2. La aplicación valida la sesión y muestra la navegación disponible para su rol.
3. Un técnico crea una factura o presupuesto y queda asociado automáticamente al reporte.
4. Los administradores y usuarios root pueden consultar todos los reportes; los técnicos solo ven los propios.
5. Los reportes se mantienen en memoria y, si se configura Google Sheets, se sincronizan con la hoja de cálculo.

## Instalación local

### Requisitos

- Node.js 20 o superior
- npm

### Pasos

```bash
npm install
```

Crea un archivo `.env.local` con las credenciales de las cuentas de prueba:

```env
ROOT_USER_PASSWORD=...
ADMIN_CAROL_PASSWORD=...
TECH_ALICE_PASSWORD=...
TECH_BOB_PASSWORD=...
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `ROOT_USER_PASSWORD` | Contraseña de la cuenta root de prueba. |
| `ADMIN_CAROL_PASSWORD` | Contraseña de la cuenta administradora de prueba. |
| `TECH_ALICE_PASSWORD` / `TECH_BOB_PASSWORD` | Contraseñas de las cuentas técnicas de prueba. |
| `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` | Almacenamiento persistente de usuarios en Redis. Obligatorio en Vercel. |
| `GOOGLE_SHEET_ID` | Identificador de la hoja de cálculo principal. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON o ruta de la cuenta de servicio de Google. |
| `GOOGLE_QUOTES_SHEET_ID` | Hoja alternativa para presupuestos, si se utiliza. |
| `AI_PROVIDER` | Proveedor de IA previsto; actualmente Gemini es la opción por defecto. |
| `GEMINI_API_KEY` | Clave necesaria al utilizar el servicio de Gemini. |

No incluyas secretos ni archivos de credenciales en el repositorio. `.env*` y `keys/` están excluidos mediante `.gitignore`.

## Comandos disponibles

```bash
npm run dev    # Servidor de desarrollo
npm run build  # Compilación de producción
npm run start  # Servidor de producción
npm run lint   # Análisis estático con ESLint
npm run test   # Pruebas de autorización del servidor
```

## Persistencia e integraciones

- **Usuarios:** se almacenan en Upstash Redis cuando hay credenciales disponibles. En desarrollo local existe un respaldo en `.data/users.json`.
- **Reportes:** se inicializan con datos de ejemplo y pueden escribirse y leerse desde Google Sheets. Si la hoja no está configurada, los datos en memoria se pierden al reiniciar el proceso.
- **Clientes y auditoría:** actualmente usan almacenamiento en memoria, pensado como base para sustituirse por una base de datos.
- **QuickBooks e IA:** la estructura de servicios está preparada, pero los conectores actuales son simulaciones y requieren implementación adicional para producción.

## Despliegue en Vercel

1. Importa el repositorio en [Vercel](https://vercel.com/new).
2. Selecciona el framework **Next.js**.
3. Configura las variables de entorno necesarias, especialmente Redis y Google Sheets.
4. Ejecuta el despliegue y verifica el inicio de sesión, la lectura/escritura de reportes y la instalación PWA en móviles.

Consulta [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md) para instrucciones adicionales.

## Consideraciones para producción

La aplicación incluye protección de rutas, roles, hash de contraseñas y limitación básica de intentos de acceso. Antes de una puesta en producción, conviene completar la validación de datos en el servidor, usar sesiones firmadas en cookies HttpOnly, persistir auditoría y clientes en una base de datos, y finalizar los conectores reales de QuickBooks e IA.

## Licencia

Proyecto privado de portafolio.
