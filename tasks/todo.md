# Stedi Button Audit Implementation (2026-06-14)
- Added a shared `stediClient` facade in `index.html` for eligibility, insurance discovery, 837P/837I, CMS-1500 PDF, 276/277, ERA PDF/report, 275 attachments, COB, payers, providers, enrollments, transactions, and event retry artifacts.
- Replaced remaining fake success paths in button handlers so endpoint-labeled actions create, retrieve, print, download, or open endpoint-shaped artifacts with request, response, transaction ID, endpoint, and source object details.
- Updated DocuPipe preset endpoints to `/change/medicalnetwork/reports/v2/{transactionId}/835`, `/claim-attachments/file`, and `/providers`; `Print Stedi preview` now requires an actual preview payload.
- Verified with `npm run check`, inline `index.html` script parsing, Tier 2 browser endpoint audit across 101 visible buttons, and DocuPipe module/runtime checks.
- Left: no live Stedi writes were submitted. The dashboard still produces local endpoint-shaped artifacts unless real API credentials/proxy wiring are added.

## DocuPipe test3.png audit (2026-06-14)
- Verified `C:\Users\kv8n11\Downloads\test3.png` locally: source is claim `CLM-20559`, `837I`, Hannah Castillo, DOS `Apr 4`, Dr. Sunita Patel, Marina del Rey Clinic, Aetna, payer claim `PC999441613`, billed `$33,450`, four service lines, diagnoses `M75.101` and `K63.5`.
- Updated claim module schema ID from stale `kEMrIoXe` to an account-visible schema.
- Fixed DocuPipe claim mapping so extracted 837I data lands in Claims as `type: 837I`, routes to `/change/medicalnetwork/institutionalclaims/v1/submission`, keeps `Apr 4` as the visible DOS, normalizes `Pending` to `Pending payer`, and maps payer/provider/facility/amounts/service lines/diagnoses into the correct fields.
- Live DocuPipe upload still returns `402` from `POST /document`; `GET /account` reports `remainingCredits: 0`, `overageCredits: 0`, and no classes or workflows are configured, so DocuPipe cannot currently auto-route schema selection through classify workflows for this key.

## DocuPipe live re-verification (2026-06-14, corrected)
- Account now has `remainingCredits: 445` (prior `0` note was stale). Ran the real pipeline on `test3.png`: `POST /document` -> poll -> `POST /v3/standardize` (schema `ao7dV4Lo` "Medical Claim") -> `GET /standardization`. DocuPipe extraction is faithful to the source (patient, payer, provider, facility, DOS `Apr 4`, billed 33450, 4 service lines, diagnoses).
- Corrected stale schema ID: module `claim-intake-837p` pointed at a schema that does NOT exist in this account (only `ao7dV4Lo` and `wzlKtNFc` exist). Set it to `ao7dV4Lo`.
- Found `buildClaimPreview` mis-mapped the real schema shape: patient -> "Unknown Patient" (schema uses `patient.name`), billed/line charges -> 0 (schema returns `{value,unit}` money objects), payer claim # -> "Pending" (schema uses `payer.claimNumber`). Fixed in both `server.js` and `functions/[[path]].js`: `number()` now unwraps `{value,unit}`, patient name reads `patient.name`, payer claim reads `payer.claimNumber`.
- Verified end-to-end through `/api/stedi/preview`: 11/12 fields now correct, record routes to the Claims section. `patient.id` "8371" has no website field and is correctly dropped (per user: do not fabricate fields not present on the site).
- Claim type shows `837P` (default) not `837I`: schema `ao7dV4Lo` has no claim-type field, so per user direction we do not fabricate it. To show 837I, the schema would need a claim-type field (deferred).
- True DocuPipe auto-classification is not set up: 0 classes, 0 workflows, and 4 of 5 modules have empty `docupipeSchemaId`, so a Classify & Route workflow has nothing to route to yet.
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
- Verified with `C:\Users\kv8n11\Downloads\Untitled.png` and the claim schema: the imported record shows `Marcus Marquez`, `Anthem Blue Cross CA`, `Dr. Alejandro Reyes, MD`, billed `$20,408`, and the correct CPT line list.

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
- Restored the polluted `claim-intake-837p` module to Professional Claim Intake with the claim schema, Stedi target `professionalClaim837P`, dashboard target `claims`, and the professional claim endpoint.
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
- Added `/api/dashboard-records` backed by the existing `docupipe_imports` table so manual dashboard creates and edits can persist without another Supabase table.
- Wired create/edit actions for claims, eligibility, providers, payers, enrollments, attachments, appeals, and COB to save dashboard records.
- On page load, saved dashboard records are re-applied to the in-memory tables and rendered into the dashboard.
- Added delete support for editable dashboard sections. Deletes prompt for confirmation, remove the local row, and write a deletion tombstone to Supabase so refreshes do not bring the row back.

## Clickable tab audit (2026-06-13)
- Playwright checked all 16 sidebar tabs: overview, eligibility, discovery, claims, status, ERA, attachments, COB, appeals, providers, locations, payers, enrollments, DocuPipe, Print Center, and transactions.
- Found and fixed the Appeals tab bug. It now calls its custom appeal stats and table renderers instead of the generic table renderer.
- Verified every tab updates hash, active button, active section, title, and breadcrumb with zero console errors, page errors, or failed network responses.
- `npm run check` passes.

## Endpoint-backed action pass (2026-06-13)
- Replaced toast-only endpoint actions with working local outputs: CMS-1500 print view, 271 print view, 835 print view, 277 and raw X12 panels, payer/enrollment CSV downloads, transaction X12 downloads, 275 attachment state changes, COB updates, enrollment workflow updates, and drawer-opening section actions.
- Closed-page actions now open visible result modals instead of writing to a hidden drawer.
- Verified with Chrome automation: no unhandled non-row buttons, CMS-1500 popup opens, location Manage opens a modal, CSV/X12 downloads work, section actions open created records, and there are zero console errors, page errors, or failed network responses.

## Full Stedi workflow landing audit (2026-06-13)
- Rechecked endpoint-labeled workflows against Stedi transaction families: 270/271, 276/277, 837, 835, 275, payer directory, transaction logs, and enrollment APIs.
- Fixed remaining cross-module actions so endpoint results navigate to and open the operational record: claim 276 opens Claim Status, claim resubmission opens Transactions, payer test eligibility opens Eligibility, payer/provider enrollment opens Enrollments, appeal status opens Claim Status, appeal attachments open Attachments, appeal resubmission opens Transactions, ERA posting reopens ERA, and transaction retry reopens the delivered transaction.
- Verified with Chrome automation across 61 endpoint labels and 14 endpoint sections: no unhandled non-row buttons, no console errors, no page errors, and no failed network responses.

## Persistent context and claim packet printing (2026-06-13)
- Theme choice now persists in localStorage. If the operator chooses Light and refreshes, the dashboard stays Light.
- The active section and last-open record drawer now restore after refresh, so a claim page refresh returns to the same claim drawer instead of dropping context.
- Added `Claim packet PDF` to claim drawers. It opens a printable packet for manual storage with claim summary, CMS-1500 preview, service lines, diagnoses, discovery, 270/271 eligibility, 276/277 claim status, 835 ERA/payment, 275 attachments, appeals/denials, COB, transaction ledger, and generated X12 evidence.
- Verified in Chrome automation: light theme persisted through reload, Claims plus open `CLM-20560` drawer restored after reload, packet popup opened, and packet text included Packet index, CMS-1500, Eligibility 270/271, Claim status 276/277, ERA/payment 835, Attachments 275, and Stedi endpoint paths. Zero console errors, page errors, or failed network responses.

## Claim packet read-only mechanism (2026-06-13)
- Added a tamper-evident read-only block to claim packet PDFs with packet ID, generated timestamp, claim ID, SHA-256 integrity method, full hash, edit status, and READ ONLY watermark.
- The print window body is marked `contenteditable="false"` and `data-readonly="true"` with design mode off.
- Verified in Chrome automation: packet popup opened, read-only label appeared, packet ID appeared, 64-character SHA-256 hash appeared, edit status appeared, body was non-editable, and there were zero console errors, page errors, or failed network responses.

## Efficiency audit pass (2026-06-13)
- Added a compact workflow ribbon for Eligibility, Claim rework, ERA posting, Attachments, Enrollments, DocuPipe intake, and Recent records.
- Queue shortcuts now jump directly to the first actionable record and open the drawer when there is work to do.
- Recent records persist in localStorage and reopen the selected record from the dashboard.
- The sidebar brand/logo now returns to the Overview route at `#overview`.
- Added `/` keyboard focus for global search.
- Verified with `npm run check`, inline script syntax checks, and Chrome automation: counts render, claim and ERA queue jumps open records, Recent records reopens the claim, `/` focuses search, DocuPipe shortcut opens `#docupipe`, logo returns to `#overview`, refresh preserves context, and there are zero console errors, page errors, or failed network responses.

## COB payer order repair (2026-06-13)
- Fixed `Update claim payer order` so it updates the linked claim instead of only showing a COB artifact.
- The action now applies primary payer, secondary payer, COB rule, effective date, member IDs, and COB transaction ID to the claim.
- If payer order changes on a submitted claim, the dashboard queues a corrected 837P or 837I transaction with status `Ready` and opens the claim drawer.
- Verified with Chrome automation: COB opened Claims, showed secondary payer and COB rule, displayed `Corrected 837`, created a ready 837I correction transaction, and produced zero console errors, page errors, or failed network responses.
- Re-ran endpoint-button audit for COB, 270/271, 276/277, ERA posting, 275 attachments, payer enrollment, and transaction retry. All produced visible state changes with zero runtime failures.

## Full button endpoint parity pass (2026-06-13)
- Fixed `+ Institutional (837I)` so it opens the claim form with claim type set to `837I` instead of reusing the 837P default.
- Replaced location `Manage` from an explanatory panel with editable local service facility settings and a `Create test 837` action that opens a claim draft with facility NPI/POS.
- Verified section-level buttons: Run eligibility check, Start discovery, 837P create, 837I create, Check status, browse files, Run COB check, Update claim payer order, Manage location, Payer Search, Export CSV, and Export all.
- Verified representative drawer actions: View raw 271, Download 271 PDF, CMS-1500 PDF, View 835 report, ERA PDF, payer Run test eligibility, enrollment Upload document, enrollment Update enrollment, and transaction input/output downloads.
- All verified actions produced endpoint-shaped state, an opened record, a download, a print popup, or a transaction artifact. Chrome automation reported zero console errors, page errors, or failed network requests.

## Stedi endpoint lifecycle audit (2026-06-13)
- Added shared Stedi transaction artifacts for endpoint-labeled actions: request/input, response/output, endpoint path, transaction ID, partner, status, and source claim.
- Fixed 276/277 behavior: `Run 276 now` creates a fresh 276 request and saved 277 response, while `View 277 report` opens the saved 277 or explains that no report exists yet.
- Updated 270/271, insurance discovery, COB, 837 claim submission, CMS-1500 PDF, 835 ERA PDF/report, 275 attachments, payer search/CSV, provider/enrollment create/update/delete/document/task, event retry, and transaction download behavior to create endpoint-shaped artifacts.
- Transaction drawers now show saved request/input and response/output so each click has an auditable Stedi lifecycle trail.
- Verified with `npm run check`, inline script syntax checks, and Chrome automation: 270/271, 276/277 run, 277 view, claim status from claim drawer, discovery, COB, 275 attachment, payer search, payer eligibility, enrollment update, and transaction drawer all create or display the expected endpoint artifacts with zero console errors, page errors, or failed network responses.

## Efficient Frontier workflow implementation (2026-06-13)
- Added `tasks/efficient-frontier.md` as the durable operating workflow for substantial DocuPipe and Stedi dashboard work.
- The workflow defines what Codex keeps centralized, what can be delegated, how delegation packets must be written, required verification, and commit/push rules.
- Updated `tasks/lessons.md` so future sessions load this workflow from normal project memory.

## Original folder merge (2026-06-13)
- Replaced the original dashboard app files with the current DocuPipe clone code while preserving the original folder's `.git` directory.
- Excluded local secrets and logs from the copy: `.env`, `server.log`, and `server.err.log`.
- Verified in the original folder with `npm run check`, inline script syntax checks, `/healthz` on port `8752`, and Chrome automation for Overview, Claims queue jump, logo home navigation, and DocuPipe navigation.

## Cloudflare Pages migration (2026-06-14)
- Added Cloudflare Pages Functions for the existing `/api/...` and `/healthz` routes while keeping `server.js` as a local legacy fallback.
- Added `wrangler.toml`, Cloudflare npm scripts, and Cloudflare-first README setup.
- Removed the active Render blueprint so Render is no longer the production deployment path.
- Live Cloudflare Functions require Supabase for durable module settings, imports, dashboard records, and delete tombstones.
- Added a 60 MB browser upload guard before DocuPipe base64 upload.
- Verified `npm run check`, inline script syntax checks, Cloudflare local mock `/healthz`, `/api/modules`, mock DocuPipe upload and standardization, Stedi preview, dashboard import, oversized file guard, Claims queue jump, and logo home navigation.

## Cloudflare live mode switch (2026-06-14)
- Changed `wrangler.toml` from `APP_MODE = "mock"` to `APP_MODE = "live"` because Cloudflare dashboard plaintext vars are managed by Wrangler config.
- Committed and pushed `5df5a6d Set Cloudflare production mode live`, then redeployed Cloudflare Pages.
- Verified production `/healthz` returns `mode: live`.
- Supabase write probe currently fails with `Invalid API key`, so Cloudflare can see a Supabase key but `SUPABASE_SERVICE_ROLE_KEY` must be replaced with the correct secret key from the same Supabase project.

## 2026-06-14 — Committed + pushed from CLI (CLI session)
- Default claim status `Accepted` → `Pending payer` in index.html (commit `ae6d246`)
- Already pushed to `origin/main`


## COMPLETED (2026-06-15) — Payer Directory + Persistence

✅ **Fixed three payer search bugs:**
1. Response key: use `d.response.items` not `d.response.payers`
2. Field names: use `item.payer.displayName` not `item.payerName`
3. Race condition: capture `fromSearch = _payerResults.find()` BEFORE clearing `_payerResults`

✅ **Wired form dropdowns to live data:**
- Created `getFormOptions(key, fieldKey)` — returns live payer/provider arrays instead of static PAYERS/providers
- Both `openCreate()` and `renderEditFields()` now call `getFormOptions` for all payer/provider selects
- Fallback: `payerDir.length ? payerDir : PAYERS` so forms work even when no payers added yet

✅ **Implemented Supabase persistence:**
- Created `dashboard_records` table (id, target, status, dashboard_record_json, created_at, updated_at)
- Fixed schema mismatch: only send {target, status, dashboard_record_json} not extra fields
- Fixed auth: always send `Authorization: Bearer {key}` header (was conditionally skipping)
- Added "transactions" to valid dashboard record targets
- Page refresh now restores all payers, transactions, and other dashboard records from Supabase

✅ **Verified end-to-end:**
- Type payer name → typeahead search fires to Stedi
- Select result → payer detail loads from API
- Click "Add to Network Payers" → calls `persistDashboardRecord()` → writes to Supabase
- Page refresh → payer still visible in Network Payers table

Committed and pushed.

---

## COMPLETED (2026-06-25) — Location module rebuilt + NPI lookup + Supabase persistence

✅ Replaced 3 hardcoded fake facility locations with 1 real location (Culver City ASC, NPI 1922138817)
✅ Built dynamic locations list: add/edit/delete via modal, all fields editable
✅ NPI lookup via NPPES registry: proxied through `/api/npi-lookup` in both server.js and functions/[[path]].js
✅ Locations wired to Supabase persistence (`LIVE_KEYS`, `dashboardRecordKey`, `applyLiveRecord`, `refreshLiveSection`)
✅ Location dropdown in claims create/edit modal reads from live locations array
✅ "＋ Add location…" sentinel in loc dropdown navigates to Locations section and closes modal
✅ Fixed global click handler hijack: added `#createOvl` and `#loc-grid` to exclusion list so dynamically-created modal buttons (Manage, Lookup NPI, Save, Delete) are not caught by the `panel()` fallback
✅ Graphify run on project: 308 nodes, 789 edges, 16 communities — ingested into Second Brain

## NEXT — No active tasks

All requested work is complete and pushed (latest: `cc36923`). Production site is at culver-city-surgical-dashboard.pages.dev.

---

## COMPLETED (2026-06-16) — Eligibility section full rebuild

✅ **Database** (`supabase/migrations/20260616000000_eligibility.sql`):
- Created 4 new tables: `patients`, `eligibility_checks`, `eligibility_batches`, `work_queue`
- Run manually in Supabase SQL editor (confirmed succeeded)

✅ **API routes** (both `functions/[[path]].js` and `server.js`):
- `GET /api/patients` — typeahead search against Supabase `patients` table
- `POST /api/patients` — create patient record
- `POST /api/stedi/eligibility/check` — real-time 270/271, auto-saves patient + eligibility_check to Supabase
- `GET /api/eligibility/checks` — load all checks from Supabase
- `POST /api/eligibility/batch` — submit batch to Stedi eligibility-manager
- `GET /api/eligibility/batches/:id` — poll batch status
- `POST /api/work_queue` — create auth/work queue item
- Fix: eligibility check now auto-upserts patient into `patients` table so typeahead works on repeat visits

✅ **UI** (`index.html`):
- KPI tiles: total checks, active coverage %, auth required, timeouts
- Filter chips: All / Active / Inactive / Auth Required / Timeout with live counts
- Intake form: patient typeahead, payer typeahead, all required fields, NPI sync from location
- Batch panel: CSV paste or file upload, preview, submit, manual status refresh
- 10-column results table (Patient, DOS, Payer, Member ID, Coverage, Plan, Copay, Deduct Rem, Auth, Checked)
- 5-tab detail drawer: Summary, Benefits, Auth & Referrals, Raw JSON, PDF
- All JS functions use DOM creation (no innerHTML assignments) to pass PreToolUse hook

✅ **Overview section wired to real data** (same session):
- All 5 KPI tiles computed from live claims/eras arrays (charges, collections, clean claim rate, days in A/R, denial rate)
- A/R aging bars rebuilt dynamically from open claims grouped by payer
- Work queue counts from real claim, enrollment, ERA, and attachment states
- Both `updateOverviewKpis` and `updateEligKpis` hooked into `loadDashboardRecords` and `refreshLiveSection`

Committed and pushed across 4 commits (5a72f1a, 50d97f1, 24422dd + tasks).
