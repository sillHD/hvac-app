# Deploying to Vercel (ANC HVAC)

## 1) Requirements
- Vercel account
- GitHub repository containing this project
- Environment variables ready (see `.env.example`)

## 2) Create a Vercel project
1. Visit https://vercel.com/new
2. Import your GitHub repository
3. Framework: Next.js (automatically detected)
4. Root Directory: `hvac-app` (if the repository contains additional folders)
5. Deploy

## 3) Environment variables (required/recommended)
Configure these in Vercel: **Project → Settings → Environment Variables**:
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY` (complete JSON or secure string)

Optional:
- `GOOGLE_SHEETS_API_KEY` (fallback)
- `AI_PROVIDER`
- `GOOGLE_FORM_*` variables only when using the legacy bridge

## 4) CLI deployment (alternative)
From `hvac-app`:
1. `npx vercel login`
2. `npx vercel`
3. `npx vercel --prod`

## 5) Verify PWA and iPhone installation
1. Open the Vercel HTTPS URL in Safari on iPhone.
2. Select **Share → Add to Home Screen**.
3. Verify it opens in app mode, without the browser bar.

## 6) Business domain (recommended)
- Vercel → Settings → Domains
- Add a subdomain (for example, `app.yourcompany.com`)
- Configure DNS and wait for propagation

## 7) Final checklist
- Successful Vercel build
- Working sign-in
- Google Sheets read/write working
- iPhone and Android installation verified
