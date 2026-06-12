# DocuPipe Clone Setup

This folder is a standalone clone of the original Culver City Surgical dashboard. The original project at `C:\Users\kv8n11\culver-city-surgical-dashboard` is not modified by this integration.

## Run Locally

```powershell
cd C:\Users\kv8n11\culver-city-surgical-dashboard-docupipe
node server.js
```

Open:

```txt
http://localhost:8742
```

## Environment

Copy `.env.example` to `.env` inside this clone folder only.

```env
DOCUPIPE_API_KEY=your_docupipe_api_key_here
STEDI_API_KEY=your_stedi_api_key_here
DOCUPIPE_BASE_URL=https://app.docupipe.ai
STEDI_HEALTHCARE_BASE_URL=https://healthcare.us.stedi.com/2024-04-01
STEDI_CLAIMS_BASE_URL=https://claims.us.stedi.com/2025-03-07
STEDI_ENROLLMENTS_BASE_URL=https://enrollments.us.stedi.com/2024-09-01
STEDI_PAYERS_BASE_URL=https://payers.us.stedi.com/2024-04-01
APP_MODE=mock
```

Default mode is `mock`. In mock mode, uploads, standardizations, Stedi previews, and Stedi submissions are simulated locally.

Live mode requires:

```env
APP_MODE=live
DOCUPIPE_API_KEY=...
STEDI_API_KEY=...
```

Live Stedi submission still requires a server request with `confirmLiveSubmit=true`. The browser UI inserts reviewed records into the dashboard, but does not silently submit live payer transactions.

## What Was Added

- `server.js`: dependency-free Node server that serves the clone and proxies DocuPipe and Stedi requests.
- `data/docupipe-modules.json`: editable module definitions and schemas.
- `lib/docupipe.js`: browser UI for intake, schema editing, Stedi preview, dashboard insertion, and printing.
- `DOCUPIPE_SETUP.md`: this setup file.

## Local API

- `GET /api/modules`
- `POST /api/modules`
- `PUT /api/modules/:id`
- `POST /api/docupipe/upload`
- `POST /api/docupipe/standardize`
- `GET /api/docupipe/jobs/:jobId`
- `GET /api/docupipe/documents/:documentId`
- `GET /api/docupipe/standardizations/:standardizationId`
- `POST /api/stedi/preview`
- `POST /api/stedi/submit`

## Live Upload Payload

The proxy sends local files to DocuPipe as JSON base64:

```json
{
  "document": {
    "file": {
      "contents": "base64-file-content"
    },
    "fileExtension": "png"
  },
  "parseVersion": 3
}
```

Do not use `document.file.base64`. DocuPipe rejects that shape with a `422` validation error.

## Dashboard Modules

The clone includes five starter DocuPipe modules:

- Professional Claim Intake
- Eligibility Card Intake
- ERA or Denial PDF
- Claim Attachment Packet
- Provider Enrollment Document

Each module has:

- a DocuPipe schema
- extraction guidelines
- a Stedi target
- a dashboard target
- field mapping hints

Edit modules from the `DocuPipe intake` sidebar section. Use `Save module` to update the current module, or `Duplicate as new` to create a new editable module.

## Workflow

1. Open `DocuPipe intake`.
2. Pick a schema module.
3. Upload a source document.
4. Click `Upload`.
5. Click `Standardize`.
6. Review DocuPipe JSON and the Stedi payload preview.
7. Click `Input to dashboard` to add the mapped record to the cloned dashboard.

## Print Center

Open `Print center` to print:

- module catalog
- last DocuPipe extraction
- last Stedi preview
- appeals packet
- open detail drawer
- dashboard summary

The browser print dialog can save any packet as a PDF.

## Safety Notes

- API keys stay on the server and are never written into browser JavaScript.
- The module config file should not contain PHI.
- Uploaded files and extracted mock records are kept in memory by `server.js`.
- Use Stedi test keys first where supported.
