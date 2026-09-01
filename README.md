# ANC HVAC

A web application for the operational management of an HVAC company. It enables technicians and administrative staff to create quotes and invoices, manage customers and users, review job history, and inspect audit events.

This project is part of my professional Upwork portfolio and demonstrates a scalable full-stack implementation with Next.js, TypeScript, role-based authentication, and external integrations.

## Key features

- Create invoices and quotes with a mobile-friendly interface.
- Manage customers, including multiple addresses per customer.
- Dashboard metrics for jobs, payments, and outstanding collections.
- Report history with permission-based editing and deletion.
- Technician, administrator, and root roles.
- User administration for authorized administrators.
- Audit logging for access and relevant operations.
- English-only interface.
- PWA support for mobile installation and limited offline use.
- Optional persistence of reports in Google Sheets and users in Upstash Redis.

## Technologies

- [Next.js](https://nextjs.org/) 16 with Pages Router
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zod](https://zod.dev/) for form validation
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) for password hashing
- [Upstash Redis](https://upstash.com/) for persistent user storage
- [Google Sheets API](https://developers.google.com/sheets/api) for report persistence

## Architecture

The repository separates the UI, HTTP routes, and server logic:

```text
src/
├── pages/          # Next.js views and API routes
│   ├── api/        # Authentication, reports, customers, users, and logs
│   └── _app.tsx    # Global entry point
├── components/     # Reusable UI components
├── client/         # Browser-only hooks and utilities
├── i18n/           # English localization context and catalog
├── lib/            # Shared types, mocks, validation, and utilities
├── server/         # Authentication, authorization, services, and integrations
│   ├── middleware/ # Route protection and role permissions
│   └── services/   # Users, jobs, auditing, Google Sheets, and AI
└── styles/         # Global styles
```

React pages use routes in `pages/api`. These routes apply authentication and authorization before delegating to services in `src/server`. Domain types for users, customers, jobs, quotes, and payment statuses are in `src/lib/types`.

## Main flow

1. A user signs in with an account configured through environment variables.
2. The application validates the session and displays navigation available to that role.
3. A technician creates an invoice or quote, which is automatically associated with the report.
4. Administrators and root users can view all reports; technicians can view only their own.
5. Reports remain in memory and synchronize with Google Sheets when configured.

## Local installation

### Requirements

- Node.js 20 or later
- npm

### Steps

```bash
npm install
```

Create `.env.local` with credentials for the test accounts:

```env
ROOT_USER_PASSWORD=...
ADMIN_CAROL_PASSWORD=...
TECH_ALICE_PASSWORD=...
TECH_BOB_PASSWORD=...
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
| --- | --- |
| `ROOT_USER_PASSWORD` | Password for the root test account. |
| `ADMIN_CAROL_PASSWORD` | Password for the administrator test account. |
| `TECH_ALICE_PASSWORD` / `TECH_BOB_PASSWORD` | Passwords for the technician test accounts. |
| `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` | Persistent user storage in Redis. Required on Vercel. |
| `GOOGLE_SHEET_ID` | Primary spreadsheet identifier. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google service-account JSON or path. |
| `GOOGLE_QUOTES_SHEET_ID` | Alternative spreadsheet for quotes, when used. |
| `AI_PROVIDER` | Intended AI provider; Gemini is currently the default. |
| `GEMINI_API_KEY` | Required when using the Gemini service. |

Do not include secrets or credential files in the repository. `.env*` and `keys/` are excluded by `.gitignore`.

## Available commands

```bash
npm run dev    # Development server
npm run build  # Production build
npm run start  # Production server
npm run lint   # ESLint static analysis
npm run test   # Server authorization tests
```

## Persistence and integrations

- **Users:** Stored in Upstash Redis when credentials are available. Local development uses `.data/users.json` as a fallback.
- **Reports:** Initialized with example data and can be written to and read from Google Sheets. Without a configured spreadsheet, in-memory data is lost when the process restarts.
- **Customers and auditing:** Currently use in-memory storage intended as a foundation for a database.
- **QuickBooks and AI:** The service structure is ready, but the current connectors are simulations that need further production implementation.

## Deploying to Vercel

1. Import the repository in [Vercel](https://vercel.com/new).
2. Select the **Next.js** framework.
3. Configure required environment variables, especially Redis and Google Sheets.
4. Deploy and verify sign-in, report reads/writes, and PWA installation on mobile devices.

See [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md) for additional instructions.

## Production considerations

The application includes route protection, roles, password hashing, and basic sign-in attempt limiting. Before production deployment, complete server-side data validation, use signed HttpOnly-cookie sessions, persist audits and customers in a database, and finalize the real QuickBooks and AI connectors.

## License

Private portfolio project.
