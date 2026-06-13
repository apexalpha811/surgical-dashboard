# Culver City Surgical Billing Dashboard Mockup

## What changed (2026-06-11)
- Built `index.html`: single-page medical billing dashboard mockup covering every Stedi OpenAPI group (Healthcare 270/271, 276/277, 837P/I/D, 835/ERA, 275 attachments, COB, insurance discovery, payer directory, Eligibility Manager batch, Enrollment API providers/enrollments/documents/tasks, Core API transactions/executions/events).
- Each section displays the exact endpoint chips it would call.
- Providers and Locations are separate sidebar sections (provider records vs. service facility loop 2310C).
- Dark/light theme toggle: dark = Playa Vista ASCv3 palette verbatim (#0A0A0F bg, #B6C800 lime, #1D00C6 blue, #12121A cards, Inter, pill buttons, 10px radius); light = derived variant.
- Responsive: collapsible sidebar under 768px, auto-fit grids, scrollable tables, font scale-up at 1920px+.
- Added `ccs-dashboard` server entry to `~/.claude/launch.json` (npx serve, port 8741).

## Verified
- Served via preview on port 8741. Clicked Providers nav + Light toggle: both worked, zero console errors/warnings.
- One Tier 3 screenshot (light theme, Providers section): theme and section switching render correctly.
- Grep confirmed no em dashes as punctuation (placeholders in empty table cells only).

## Update (2026-06-11, later)
- Removed all dental content per user request: 837D endpoint chip and button, dental claim row, Dr. Nakamura provider, Westside Oral Surgery location, Delta Dental enrollment. Verified by grep: zero dental references remain.

## Appeals module (2026-06-11)
- New sidebar section "Appeals" in index.html: DenialSummaryStats (4 computed KPI cards), sortable AppealsTable (10 records, click headers), status badge map (Not Started=gray, In Progress=yellow, Submitted=blue, Won=green, Lost=red, Escalated=orange), NewAppealForm with purple "✨ Generate Appeal Letter with AI" button, drawer detail with full record, timeline log, letter editor (Accept/Regenerate/Edit), and mock Stedi actions that append timeline entries.
- New files: lib/data/appeals.js (10 records per spec), lib/ai/generateAppealLetter.js (3 letter variants + verbatim Claude API/Stedi MCP/HIPAA comment block), lib/stedi.js (6 mock async fns with TODO endpoints), .env.example, README.md.
- Deviation: no Next.js/vercel.json (user chose static-HTML integration; README notes static deploy).
- Verified (Tier 2 eval + console): nav switch to sec-appeals, crumb updates, 10 rows, stats Total=10 / $29,230 at risk / 67% win rate / 2 deadlines within 14 days, sort by amount works, drawer opens with letter + timeline, Regenerate changes text, AI button populates the new-appeal letter, Stedi mock returns and logs to timeline, zero console errors. preview_screenshot tool hung twice (tool issue, not page: page responds to eval), so no new image; section reuses previously verified visual components.

## 2026-06-11 (late)
- Wired mock onclick handlers to every detail drawer action button across all sections (eligibility, discovery, claims, status, ERA, attachments, COB, providers, payers, enrollments, transactions).
- Added toast notification system for section-level buttons (Search, Manage, Export, etc.) -- any button without a direct onclick gets a contextual toast on click.
- Added X12 viewer helpers: view271x12(), view277(), view835() that render realistic EDI segment mockups.
- Added drawerAct() and drawerX12() for action feedback inside the detail drawer.
- Fixed SyntaxError (missing closing paren in eligibility function body).
- Verified: JS parses clean, page loads with zero errors, all globals defined, MetaMask extension warnings only.

## Left
- Mockup only; no real API wiring. Forms are static placeholders.

## DocuPipe clone integration plan (2026-06-12)
- [x] Add dependency-free Node proxy server for static files, DocuPipe, Stedi preview, and guarded Stedi submit.
- [x] Add editable DocuPipe schema module data for claims, eligibility, ERA/denials, attachments, and provider enrollment.
- [x] Add DocuPipe intake UI to the cloned dashboard only.
- [x] Add Print Center UI for module schemas, extracted records, Stedi previews, appeal letters, and selected dashboard records.
- [x] Update clone-only environment example, launch config, and README setup notes.
- [x] Verify original dashboard remains unchanged.
- [x] Run syntax checks and mock workflow verification.

## DocuPipe clone implementation review (2026-06-12)
- Created the clone at `C:\Users\kv8n11\culver-city-surgical-dashboard-docupipe`; original dashboard git status stayed clean.
- Added `server.js`, `data/docupipe-modules.json`, `lib/docupipe.js`, `DOCUPIPE_SETUP.md`, updated clone `.env.example`, clone `.claude/launch.json`, clone `README.md`, and clone `index.html`.
- Verified `node --check server.js`, `node --check lib/docupipe.js`, and JSON parsing for `data/docupipe-modules.json`.
- Started clone server on `http://localhost:8742` in mock mode.
- Browser automation verified DocuPipe nav, Print Center nav, 5 loaded modules, mock upload, mock standardization, Stedi payload preview, dashboard claim insertion, Print Center popup, and zero console errors.
- Left: add real DocuPipe schema IDs and live API keys in `.env` before testing live DocuPipe or Stedi calls.

## DocuPipe API key setup (2026-06-12)
- Created clone-only `.env` with `APP_MODE=live` and the provided DocuPipe API key.
- Left `STEDI_API_KEY` blank, so Stedi live submission remains unavailable until a Stedi key is provided.
- Restarted `server.js`; server log reports `Mode: live`, `/api/modules` returns 200, and `server.err.log` is empty.

## Live DocuPipe PNG test (2026-06-12)
- Tested `C:\Users\kv8n11\Downloads\test.png` through the clone proxy in live mode.
- Initial live upload returned `422`; root cause was proxy payload shape. DocuPipe expects base64 content at `document.file.contents`, not `document.file.base64`.
- Patched `server.js` upload payload and added `GET /api/docupipe/documents/{documentId}`.
- Retest succeeded: document `QC3CFTsP`, job `lhDjlUD1`, both completed. DocuPipe parsed one PNG page, language `en`, file size about `0.043 MB`, 1 credit, processing time about `3.37s`, parsed result length `770`.

## Imported record panel (2026-06-12)
- Added a persistent `Imported record` panel in the DocuPipe screen.
- The panel now renders the imported target, import time, and full imported record snapshot after `Input to dashboard`.
- Browser DOM check confirmed the panel shows imported record data and the import state changes to `done: professionalClaim837P`.

## Create schema in DocuPipe module (2026-06-12)
- Added a `Create schema` button to the DocuPipe module editor.
- The action creates a fresh schema draft from the selected target preset, saves it into the clone, and switches the editor to the new module.
- Verified in Chrome: the schema state flips to `draft created`, the module selector points at the new draft, and the eligibility preset renders into the JSON schema textarea when the target is set to `eligibility270`.

## Partial DocuPipe imports (2026-06-12)
- Partial DocuPipe standardizations now auto-import into the dashboard instead of stopping at review.
- The imported record panel marks these as `partial` and shows the missing-field warnings alongside the extracted values.
- Verified in Chrome with a synthetic partial claim: the claims queue received `CLM-PARTIAL-002`, the import badge read `partial: professionalClaim837P`, and the dashboard remained error-free.

## Live DocuPipe claim mapping fix (2026-06-12)
- Live DocuPipe claim standardizations now map the flat payload shape (`claimId`, `patientName`, `renderingProvider`, `payer`, `billedAmount`, `paidAmount`, `serviceLines`, `diagnoses`) into the dashboard claim preview.
- Verified with `C:\Users\kv8n11\Downloads\Untitled.png` and schema `3CNrau0Z`: the imported record shows `Marcus Marquez`, `Anthem Blue Cross CA`, `Dr. Alejandro Reyes, MD`, billed `$20,408`, and the correct CPT line list.

## Record editability (2026-06-12)
- Added drawer-level edit support for claims, eligibility, providers, payers, enrollments, attachments, appeals, and COB.
- Claims and providers were verified in Chrome. Claim rows now save inline corrections for patient, billed, paid, CPT, and diagnosis fields. Provider rows now save name, specialty, NPI, taxonomy, and enrollment counts.
- The edit action is exposed from the record drawer and reopens the updated record after save.

## Derived dashboard target (2026-06-12)
- Changed the DocuPipe module editor so `dashboardTarget` is derived from `stediTarget`.
- The dashboard target field is now read-only in the UI, and the server normalizes loaded and saved modules to keep the mapping aligned.

## Imported data history (2026-06-12)
- Changed the DocuPipe "View all imported data" control to show the latest import plus a persistent history list of past imports.
- Imported records now persist in browser localStorage under `docupipe-import-history-v1`, so refreshes do not erase earlier imports.

## Hardening pass REVERTED (2026-06-12, Claude)
- User reported the hardening pass below broke DocuPipe parsing. All code changes from that pass were reversed: serveStatic guard, body size cap, callJson timeout, 127.0.0.1 binding, sanitizeForDashboard, and the history cap are all removed. server.js and lib/docupipe.js are back to pre-pass behavior (external edits made after the pass were preserved).
- Verified after revert: node --check passes on both files; server restarted on 8742 in live mode; live upload of Downloads/test.png succeeded (document bJwo4nVa, job SwcTKKz9, status completed); page loads with zero console errors.
- Root cause of the breakage was not identified before reverting; if hardening is reattempted, change one item at a time and run a live parse between each.

## Hardening pass after Codex handoff (2026-06-12, Claude) [REVERTED, see above]
- Fixed Windows path-guard bypasses in `serveStatic`: checks now run on the resolved path via `path.relative`, lowercased, with trailing dots/spaces stripped (Win32 strips them on open, so `/.env.` previously reached the real `.env`). Also blocks dotfiles anywhere, `data/`, `tasks/`, and server logs, case-insensitively.
- Added a 50 MB request body cap in `readJsonBody` (413 on overflow).
- Added a 60s timeout to all upstream DocuPipe/Stedi calls via `callJson` (502 with a clear message on timeout or network failure).
- Added `sanitizeForDashboard` in `lib/docupipe.js`: extracted document data is stripped of angle brackets at the import boundary before entering dashboard arrays (index.html renderers use innerHTML). History rendering was already escaped.
- Capped the import history ledger at 50 entries (`IMPORTED_HISTORY_LIMIT`) to prevent unbounded localStorage growth.
- Verified: `node --check` on both files; server restarted on 8742; HTTP probes confirm 403 for `/.env`, `/.env.`, `/.env%20`, `/DATA/...`, `/./data/...`, `/..%5C.env`, `/tasks/todo.md`, `/server.log` while `/`, `/lib/docupipe.js`, `/api/modules` return 200; page loads in browser with zero console errors and DocuPipe UI initialized.
- Preserved invariants: derived dashboardTarget mapping untouched, history ledger and collapse behavior untouched, original dashboard folder untouched.

## Collapsible import controls (2026-06-12)
- Converted imported record panels to explicit toggle buttons so the latest record and every historical record can be collapsed or expanded.
- Bound the toggle handler to both the top imported-record panel and the import-history list so the latest record does not get stuck open.

## Schema metadata cleanup (2026-06-12)
- Removed the fake "Create schema" action from the DocuPipe module editor.
- Moved the DocuPipe schema ID into advanced module metadata only.
- Opened the advanced metadata section by default so the schema ID can actually be edited and saved.

## DocuPipe standardization retry (2026-06-12)
- Made the live standardization lookup retry on 404 so transient "not found yet" responses do not break the import flow.
- Also made the live job poll retry on 404, since the job record itself can lag right after upload.
- Verified the PNG import completes end to end again with `C:\Users\kv8n11\Downloads\Untitled.png`.
- Fixed the retry branch so it reports `standardizationId waiting` instead of throwing on an undefined `jobId`.

## Claim parsing repair (2026-06-12)
- Restored the polluted `claim-intake-837p` module to Professional Claim Intake with schema `3CNrau0Z`, Stedi target `professionalClaim837P`, dashboard target `claims`, and the professional claim endpoint.
- Mapped DocuPipe `paidAmount` into dashboard claim `paid` instead of hardcoding zero.
- Verified the imported claim drawer shows Marcus Marquez, Anthem Blue Cross CA, payer claim `PC434188992`, billed `$20,408`, paid `$16,594`, four CPT lines, and ICD-10 diagnoses.

## DocuPipe module routing audit (2026-06-12)
- Removed five stale draft modules from active `data/docupipe-modules.json`; the clone now exposes only the five canonical modules.
- Updated claim intake to DocuPipe schema `kEMrIoXe` for the new DocuPipe API key; eligibility, ERA or denial, claim attachment, and provider enrollment keep their configured schemas or blank IDs as module metadata requires.
- Changed live standardization payloads so `schemaId` is sent only when present instead of blocking auto selection.
- Verified `/api/modules` returns exactly five modules and all dashboard targets, Stedi targets, and endpoints align.
- Verified `/api/stedi/preview` for claims, eligibility, appeals, attachments, and providers returns dashboard-shaped records with the expected values.
- Verified live claim import from `C:\Users\kv8n11\Downloads\Untitled.png` parses Marcus Marquez, Anthem Blue Cross CA, billed `$20,408`, paid `$16,594`, four CPT lines, and ICD-10 diagnoses with no API failures.

## Render deployment prep (2026-06-12)
- Added `package.json` with `npm start` and `npm run check`.
- Added `.gitignore` so `.env`, logs, and `node_modules` are not committed.
- Added `render.yaml` for a Node web service with `npm install`, `npm start`, `/healthz`, and secret environment variables marked `sync: false`.
- Added `/healthz` to `server.js`.
- Verified `npm run check`, `package.json` parsing, Render YAML smoke check, `/healthz`, `/api/modules`, and `/` locally.

## Supabase persistence (2026-06-13)
- Added server-side Supabase REST storage using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- `/api/modules` now reads from Supabase when configured and seeds from `data/docupipe-modules.json` if the table is empty.
- Module create/update/delete routes write to Supabase when configured, with file fallback for local runs.
- Added `/api/imports` to persist imported DocuPipe records into `docupipe_imports`.
- The browser import flow posts reviewed imports to `/api/imports` after adding them to the dashboard.
