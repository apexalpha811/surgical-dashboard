# Lessons

## DocuPipe file upload payload

When sending a local file to DocuPipe `POST /document`, put the base64 file string at `document.file.contents` with `document.fileExtension`. Do not send `document.file.base64`; DocuPipe returns a `422` validation error because the expected file object is missing `contents`.

## DocuPipe schema creation

DocuPipe's public API docs expose schema retrieval and schema-guided standardization, but not a schema-create endpoint. When the user asks for "create schema" in the dashboard, build a local schema draft action that seeds a target-specific JSON schema and preserves the separate `Duplicate as new` path for exact copies.

## Partial DocuPipe imports

When DocuPipe returns incomplete extraction data, do not block dashboard insertion. Auto-import the partial record, keep the extracted values, surface the missing-field warnings, and label the import as partial so the operator can see what still needs attention.

## DocuPipe live claim shape

Live claim standardizations can arrive as a flat object with keys like `claimId`, `patientName`, `renderingProvider`, `payer`, `billedAmount`, `paidAmount`, `serviceLines`, and `diagnoses`. Map those aliases before falling back to nested `patient` / `claim` / `provider` schema paths, or the dashboard will show the generic imported shell instead of the real patient and payer data.

## Editable dashboard records

If a dashboard drawer is where operators review imported data, it should also be where they correct it. Add a drawer-level edit path for the major record types instead of forcing users back into separate create forms. Claims and providers are the first things users expect to fix in place.

## Derived DocuPipe targets

If `stediTarget` already determines the downstream dashboard section, do not expose `dashboardTarget` as a separate editable field. Derive it in the editor, normalize it on the server, and normalize loaded modules too so stale saved values cannot drift out of sync.

## Imported data history

If users ask to "view imported data," show the latest import and the full import ledger together. Keep the newest entry at the top, persist the ledger locally when possible, and do not collapse the view back to a single record just because that is easier to render.

## Windows static-file guards

When blocking paths in a Windows file server, run every check on the resolved path (`path.relative(ROOT, path.resolve(...))`), lowercased, with trailing dots and spaces stripped from each segment. Raw-string prefix checks miss `/.env.` (Win32 strips trailing dots on open), `/DATA/` (NTFS is case-insensitive), and `./data/` (prefix differs before normalization).

## Sanitize at the trust boundary

When extracted document data flows into a UI that renders with innerHTML, sanitize once where the data enters the app state (strip angle brackets for billing fields) instead of chasing every render sink. Escaping is wrong when sinks mix innerHTML and textContent, because entities display literally in the latter.

## Collapsible import controls

If the latest record lives in a separate panel from the history list, bind the same toggle behavior to both containers. A delegated click handler on only one wrapper will leave half the UI dead even when the markup looks correct.

## DocuPipe schema ownership

If the actual schema is created and managed on DocuPipe's site, do not ship a local "Create schema" action that implies otherwise. Keep the schema ID only in advanced metadata when operators need to inspect or override it.

## DocuPipe V3 schema IDs

DocuPipe V3 standardization requires a `schemaId`. Do not assume V3 can infer a schema from the document. If a schema works in DocuPipe's website but the API returns 404, check that the server API key belongs to the same DocuPipe account as the schema.

## Render free storage

Render free web services should be treated as ephemeral for runtime file edits. If operators save module settings from the browser, mirror critical overrides such as DocuPipe schema IDs in browser localStorage or move module storage to a durable database before relying on refresh/restart persistence.

## Hidden advanced inputs

If a field is still required for save/load correctness, do not hide it behind a closed `<details>` by default. Advanced metadata can stay advanced, but the first render should still let the operator reach it without a dead-end click path.

## DocuPipe standardization readiness

Live DocuPipe standardizations can lag behind the job status and return a temporary 404 while the result is still materializing. Treat that 404 as retryable in the UI, not as a hard failure, or imports will appear broken even though the job completes a moment later.

## DocuPipe job polling

Live job polling can also briefly return 404 right after upload. Retry 404s in both the job poll and the standardization fetch, or a healthy run can still look broken under normal lag.

## Retry branch hygiene

When you add a retry path for a transient DocuPipe 404, make sure the catch block cannot throw a new ReferenceError while trying to report progress. A retry bug that crashes the retry loop feels like the original problem, but it is really a second bug hiding in the repair code.

## Module test pollution

Do not verify form registration by saving junk over a real module ID. A polluted `claim-intake-837p` record can make good DocuPipe output look misparsed because the dashboard is using the wrong target, endpoint, schema, guidelines, or JSON schema.

## Claim paid amount mapping

When DocuPipe returns claim financials, map both billed and paid amounts into the dashboard claim. Do not hardcode `paid: 0`, because paid claims will render as unpaid even when extraction succeeded.

## Active DocuPipe module list

Keep only production-ready DocuPipe modules in `data/docupipe-modules.json`. Draft or duplicate schema records should not stay selectable after schema creation is removed, because they can point the same document type to stale schema IDs or targets and make parsing look broken.

## Special-section navigation

When a sidebar section has custom renderers instead of a `pgr-*` table pager, handle it explicitly in `showSection`. Do not let `T[sec]` route it through the generic table renderer, or the tab can appear to open while throwing before the hash and active state finish updating.

## Endpoint labels need endpoint outcomes

If a UI shows a Stedi endpoint label, the matching button must produce the endpoint-shaped outcome: a PDF print view, X12/report panel, CSV/X12 download, persisted record, or status update. Do not leave endpoint-labeled actions as toast-only confirmations.

## Cross-module endpoint actions

When an endpoint action creates a record in another dashboard module, navigate to that module and open the created record. Creating data in the background plus showing a status panel is not enough for operator workflows like Discovery to Eligibility.

## Stedi workflow landings

For Stedi-style workflows, match the landing module to the transaction family: 270/271 opens Eligibility, 276/277 opens Claim status, 837 submissions open Transactions, 835 posting reopens ERA, 275 submissions open Attachments, and payer/provider enrollment actions open Enrollments.

## Durable operator context

A dashboard should remember operator context across refresh: theme, active section, and open record drawer. If the user refreshes mid-work, restore the same visual mode and record, not just the default overview.

## Claim packet printing

When printing a medical billing packet for a claim, include the full endpoint trail: discovery, 270/271 eligibility, 837 claim, CMS-1500, 276/277 status, 835 ERA/payment, 275 attachments, appeals or denials, COB, and transaction ledger evidence.

## Browser PDF lock limits

Browser-generated PDFs cannot be truly encrypted or permission-locked without a real PDF engine. For no-dependency packet printing, make the packet read-only in the print window and add packet ID, timestamp, watermark, and SHA-256 integrity hash so stored packets are tamper-evident.

## Dashboard brand navigation

In a dashboard shell, the sidebar brand/logo should behave as a home control. Wire it to the overview route and current app hash instead of leaving it decorative.

## Stedi endpoint buttons need lifecycle artifacts

For Stedi-labeled buttons, visible output is not enough. Each action must create or retrieve the endpoint's matching request, response, transaction ID, raw or report artifact, and land on the operational record. For example, `Run 276 now` sends and saves a 276/277 lifecycle, while `View 277 report` only opens the latest saved 277 response.

## Efficient Frontier dashboard workflow

For substantial dashboard work, use `tasks/efficient-frontier.md`: keep endpoint interpretation, risk, integration, and final review centralized, and delegate only bounded docs scans, clickable inventories, browser checks, or non-overlapping edits.
