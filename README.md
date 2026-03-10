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
- **src/components/** – presentational UI pieces reused across pages.
- **src/styles/** – Tailwind configuration and global CSS.
- **src/lib/** – utility functions, shared types, constants used by both front and back.
- **src/server/** – backend-only implementation (database access, external APIs, business logic).  This code never runs in the browser.
- **src/client/** – client-side only code (custom hooks, contexts, form state, etc.).

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
