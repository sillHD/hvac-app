This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Project Structure & Architecture

This repository is structured with separation between the *frontend* and *backend* logic to support a secure, scalable HVAC reporting web app.

```
hvac-app/
├── public/               # Static assets (images, icons, fonts)
├── src/
│   ├── components/       # UI components shared across pages
│   ├── styles/           # Tailwind and global styles
│   ├── pages/            # Next.js pages (frontend views)
│   │   ├── api/           # API routes (backend endpoints)
│   │   └── _app.tsx
│   ├── lib/              # Shared utilities, helpers, type definitions
│   ├── server/           # Backend-only code (eg. integrations, database)
│   │   ├── integrations/   # Gemini, QuickBooks handlers (server only)
│   │   └── auth/           # authentication & authorization logic
│   └── client/           # Client-specific logic (hooks, contexts)
├── .env.local            # Environment variables (never commit)
├── next.config.ts
└── package.json
```

Each folder has a clear responsibility: frontend pages and components live under `src/pages` and `src/components`; backend APIs and integrations are placed in `src/pages/api` and `src/server`.  This ensures API keys and third-party clients (Gemini, QuickBooks) remain on the server side.  The `src/lib` directory is useful for shared types and helpers while `src/client` may hold custom React hooks or contexts that are isolated from server code.

### Folder descriptions

- **public/** – assets served directly by Next.js. No sensitive info.
- **src/pages/** – page components; routing is file-based. Under `pages/api` are API routes executed on the server. Only minimal input from the client should be accepted here.
- **src/components/** – presentational UI pieces reused across pages. Includes layout components (`Header`, `Layout`, `Protected` guard) that enforce mobile‑first navigation and role‑based visibility.
- **src/styles/** – Tailwind configuration and global CSS.
- **src/lib/** – utility functions, shared types, constants used by both front and back.
- **src/server/** – backend-only implementation (database access, external APIs, business logic).  This code never runs in the browser.
- **src/client/** – client-side only code (custom hooks, contexts, form state, etc.).

### Login UI and modular AI architecture

#### Credenciales de prueba
Manejamos datos ficticios cargados en memoria, pero las contraseñas **no**
se guardan en el código. Para iniciar sesión debes configurar en
`.env.local`:

- `ROOT_USER_PASSWORD` (usuario root: `ismaelcorra@gmail.com`)
- `ADMIN_CAROL_PASSWORD` (usuario admin: `carol@hvac-example.com`)
- `TECH_ALICE_PASSWORD` (usuario técnico: `alice@hvac-example.com`)
- `TECH_BOB_PASSWORD` (usuario técnico: `bob@hvac-example.com`)

No publiques ni compartas esos valores fuera del entorno seguro.

Además definimos en `src/lib/mocks.ts`:

- `mockCustomers` con nombres, teléfonos, emails y **lista de direcciones** falsas (se usan para rellenar el formulario de trabajos)
- `mockJobs` que incluyen dos trabajos de ejemplo, logs sanitizados y estados

Todos los datos de negocio son inventados, pero las credenciales deben
tratarse como secretas y manejarse sólo mediante variables de entorno.


La autenticación devuelve un token simulado (`user:<id>`) que se almacena en
`localStorage`. En producción deberías usar cookies HttpOnly y una base de
datos real.

#### Modelos de datos
Los tipos compartidos se encuentran en `src/lib/types/index.ts`. Se definieron
las siguientes interfaces para representar el dominio:

- `User` – representa un usuario técnico, administrador o root con permisos.
- `Customer` – información básica del cliente (nombre, teléfono, email) y direcciones asociadas.
- `Job` – detalle completo de un trabajo, incluyendo cliente, dirección,
  descripción de factura, precio, depósitos, materiales, fotos y estatus.
- `InvoiceLog` – registro de facturación asociado a un trabajo, útil para
  integrar más adelante con QuickBooks o Gemini.

La estructura está pensada para escalar: al cambiar la persistencia sólo se
modifica la capa de servicios/backend, el frontend consume estos tipos sin
conocer detalles de implementación.

### Capa de servicios (solo servidor)

El directorio `src/server/services` agrupa los conectores a sistemas externos
o a la base de datos. Cada subcarpeta exporta una API pública limitada y toma
credenciales de `process.env`; nada de estas librerías se importa en el código
que se ejecuta en el navegador.  Las carpetas actuales son:

- `gemini` – llamadas a la API de Gemini / AI (mock por el momento).
- `quickbooks` – helpers para crear/fetch invoices y clientes.
- `jobs` – capa de persistencia para reportes (hoy en memoria, mañana SQL).
- `googleForm` – (antiguo) traducción de nuestros datos de trabajo a los campos
  exactos del formulario de Google heredado; aún existe para compatibilidad
  pero la app ya puede escribir directamente en la hoja.

### Clientes guardados
Los clientes con nombre, teléfono, correo y lista de direcciones se mantienen
en memoria (`src/lib/mocks.ts`) y se exponen como opciones en el formulario de
trabajo. Seleccionar un cliente rellena automáticamente el nombre, correo,
telefono y muestra sus direcciones disponibles para escoger; también se guarda
una dirección nueva si se introduce manualmente. Los nuevos clientes se
agregan dinámicamente al conjunto y aparecen en el desplegable para futuros
reportes durante esa sesión.  Esta solución facilita la introducción de
cliente recurrentes con múltiples propiedades sin tener que reescribir sus
datos cada vez.
- `googleSheets` – nueva capa que agrega una fila al spreadsheet usando la
  API de Google Sheets.  Reemplaza al envío vía formulario y mantiene el
  orden de columnas requerido por el flujo actual.  Requiere que el proyecto de
  Google Cloud tenga la Sheets API habilitada y una **API key** o credenciales
  de cuenta de servicio configuradas en el servidor.  En la práctica la
  aplicación intenta primero leer el JSON de la cuenta de servicio desde la
  variable `GOOGLE_SERVICE_ACCOUNT_KEY` (puede ser el contenido JSON o una
  ruta a un archivo); si la variable no existe buscará automáticamente
  `./keys/service-account.json` y usará ese fichero.  Por ello conviene crear
  una carpeta `keys` ignorada por Git y dejar allí la credencial descargada.
  La clave de API es sólo un fallback de prueba y la llamada fallará con 401
  si se usa en producción.

  **Nota sobre historial:** si `GOOGLE_SHEET_ID` está definido el servicio
  de jobs escribirá cada nuevo reporte directamente en la hoja y, al leer la
  lista de reportes, intentará cargarlos desde allí también.  De este modo la
  hoja se convierte en la "base de datos" para el historial de trabajos.  No
  se requiere ninguna migración especial: basta con fijar la variable de
  entorno y reiniciar el servidor.  Las filas existentes en memoria funcionan
  como respaldo si la lectura de la hoja falla.

Este patrón facilita:

1. mantener secretos fuera del bundle del frontend,
2. esconder detalles del proveedor detrás de funciones del dominio,
3. reemplazar implementaciones (p. ej. cambiar Gemini por OpenAI) sin
   tocar el resto de la aplicación.


### Security & Privacy Recommendations

The login screen is implemented in `src/components/LoginForm.tsx` and the
page in `src/pages/login.tsx`.  It's a mobile‑first, Tailwind‑styled form with
email/password and error handling.  No credentials are stored locally: the
component simply posts to `/api/auth/login` and waits for the server to set a
secure cookie or session.  The UI never assumes authentication; the `Header`
and `Protected` guard control access to content.  Error messages shown to the
user are generic to avoid leaking system details.

The architecture separates concerns so that future work (Gemini → OpenAI) is
invisible to the frontend.  The server contains an `aiProvider` service with a
simple interface (`AIRequest`/`AIResponse`).  API routes or backend logic call
`callAI()`, and the implementation is chosen at runtime based on configuration
(e.g. `process.env.AI_PROVIDER`).

Thus:

1. UI does **not** import any Gemini/OpenAI SDKs.
2. The provider switch happens entirely on the server side.
3. Frontend remains lean and unaffected by future provider changes.

This pattern can be duplicated for other external integrations (QuickBooks,
etc.), ensuring that the app is modular, testable, and secure.

### Security & Privacy Recommendations

1. **Environment variables**: store API keys and secrets in `.env.local` (gitignored).  Use `process.env` exclusively in API routes or server modules. Never expose them in frontend bundles.
2. **Zero-trust input**: validate and sanitize all data received from technicians before processing.  The frontend should only send the minimum fields required for a report.
3. **Authentication/Authorization**: plan for a secure auth system (e.g. NextAuth, JWTs, OAuth) on the backend.  Protect all API routes and pages according to user roles (technician, admin).
4. **Strict CORS & rate limits**: configure API routes to accept requests only from authorized origins and apply rate limiting to prevent abuse.
5. **Dependency auditing**: keep dependencies up-to-date and run `npm audit` regularly.
6. **HTTPS everywhere**: enforce SSL in production and use `secure` cookies for session tokens.
7. **Avoid leaking internals**: never log sensitive info; handle errors gracefully and return generic messages to clients.

```markdown

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
