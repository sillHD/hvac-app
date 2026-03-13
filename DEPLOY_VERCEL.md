# Deploy en Vercel (ANC HVAC)

## 1) Requisitos
- Cuenta en Vercel
- Repositorio en GitHub con este proyecto
- Variables de entorno listas (ver `.env.example`)

## 2) Crear proyecto en Vercel
1. Entra a https://vercel.com/new
2. Importa tu repositorio de GitHub
3. Framework: Next.js (detecta automatico)
4. Root Directory: `hvac-app` (si tu repo contiene carpetas adicionales)
5. Deploy

## 3) Variables de entorno (obligatorias recomendadas)
Configura en Vercel -> Project -> Settings -> Environment Variables:
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON completo o string segura)

Opcional:
- `GOOGLE_SHEETS_API_KEY` (fallback)
- `AI_PROVIDER`
- Variables `GOOGLE_FORM_*` solo si usaras el puente legacy

## 4) Despliegue por CLI (alternativa)
Desde `hvac-app`:
1. `npx vercel login`
2. `npx vercel`
3. `npx vercel --prod`

## 5) Verificar PWA e instalacion iPhone
1. Abre la URL HTTPS de Vercel en Safari (iPhone)
2. Compartir -> Anadir a pantalla de inicio
3. Verifica que abre en modo app (sin barra de navegador)

## 6) Dominio empresarial (recomendado)
- Vercel -> Settings -> Domains
- Agrega subdominio (ejemplo: `app.tuempresa.com`)
- Configura DNS y espera propagacion

## 7) Checklist final
- Build exitoso en Vercel
- Login funcional
- Escritura/lectura en Google Sheets OK
- Instalacion en iPhone y Android verificada
