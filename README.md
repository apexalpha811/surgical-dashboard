# Culver City Surgical Dashboard

Cloudflare Pages dashboard for DocuPipe intake, Stedi-shaped healthcare workflows, Supabase persistence, claim packets, and billing operations.

## Active Hosting

Production target: Cloudflare Pages + Pages Functions.

GitHub repo watched for production:

```txt
apexalpha811/surgical-dashboard.git
```

The app is mostly static HTML, CSS, and browser JavaScript. API routes are handled by Cloudflare Pages Functions under `functions/`. The legacy `server.js` Node server remains for local fallback only.

## Required Cloudflare Environment Variables

Set these in Cloudflare Pages project settings:

```env
APP_MODE=live
DOCUPIPE_API_KEY=your_docupipe_api_key_here
DOCUPIPE_BASE_URL=https://app.docupipe.ai
STEDI_API_KEY=your_stedi_api_key_here
STEDI_HEALTHCARE_BASE_URL=https://healthcare.us.stedi.com/2024-04-01
STEDI_CLAIMS_BASE_URL=https://claims.us.stedi.com/2025-03-07
STEDI_ENROLLMENTS_BASE_URL=https://enrollments.us.stedi.com/2024-09-01
STEDI_PAYERS_BASE_URL=https://payers.us.stedi.com/2024-04-01
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

In Cloudflare live mode, Supabase is required for durable module settings, imports, dashboard records, and delete tombstones. Without Supabase variables, live write routes return a clear setup error.

## Cloudflare Setup

1. In Cloudflare, create a Pages project connected to `apexalpha811/surgical-dashboard.git`.
2. Build command: leave blank, or use `echo "static dashboard"`.
3. Build output directory: `.`
4. Add the environment variables above.
5. Deploy the `main` branch.
6. Verify:
   - `/healthz`
   - `/api/modules`
   - dashboard home page
   - DocuPipe intake in mock mode first, then live mode after variables are confirmed.

## Local Development

Cloudflare local preview:

```bash
npm run cf:dev
```

Mock-only Cloudflare preview:

```bash
npm run cf:dev:mock
```

Legacy local Node fallback:

```bash
npm start
```

Static and syntax checks:

```bash
npm run check
```

The DocuPipe upload UI blocks files over 60 MB before upload so base64 JSON requests stay below Cloudflare request limits.

## API Surface

The browser uses relative API paths. These routes are preserved in Cloudflare:

```txt
GET  /api/modules
POST /api/modules
PUT  /api/modules/:id
DELETE /api/modules/:id
POST /api/docupipe/upload
POST /api/docupipe/standardize
GET  /api/docupipe/schemas
GET  /api/docupipe/schemas/:id
GET  /api/docupipe/jobs/:jobId
GET  /api/docupipe/documents/:documentId
GET  /api/docupipe/standardizations/:id
POST /api/stedi/preview
POST /api/stedi/submit
POST /api/imports
GET  /api/dashboard-records
POST /api/dashboard-records
POST /api/dashboard-records/delete
GET  /healthz
```

## Data And Safety

- Do not commit `.env`, logs, or API keys.
- Use Supabase service role key only as a server-side Cloudflare secret.
- Do not expose DocuPipe, Stedi, or Supabase service keys in browser JavaScript.
- Use mock mode for demos that should not call paid live APIs.

## Legacy Render Note

Render is no longer the intended production host. The previous Node `server.js` deployment path is retained only as a local fallback and for reference in Git history.
