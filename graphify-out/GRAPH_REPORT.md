# Graph Report - .  (2026-06-26)

## Corpus Check
- 43 files · ~115,861 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 399 nodes · 861 edges · 30 communities (18 shown, 12 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.83)
- Token cost: 18,500 input · 3,200 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Dev Server API|Dev Server API]]
- [[_COMMUNITY_Cloudflare Pages API|Cloudflare Pages API]]
- [[_COMMUNITY_DocuPipe & Lib Layer|DocuPipe & Lib Layer]]
- [[_COMMUNITY_EDI Transaction Types|EDI Transaction Types]]
- [[_COMMUNITY_API & Integration Lessons|API & Integration Lessons]]
- [[_COMMUNITY_Claim Lifecycle Concepts|Claim Lifecycle Concepts]]
- [[_COMMUNITY_Infrastructure & Persistence|Infrastructure & Persistence]]
- [[_COMMUNITY_Package Config|Package Config]]
- [[_COMMUNITY_Endpoint Audit Trail|Endpoint Audit Trail]]
- [[_COMMUNITY_Scraped UI Snapshots|Scraped UI Snapshots]]
- [[_COMMUNITY_Print & UX Continuity|Print & UX Continuity]]
- [[_COMMUNITY_Security & Input Handling|Security & Input Handling]]
- [[_COMMUNITY_DocuPipe Schema Config|DocuPipe Schema Config]]
- [[_COMMUNITY_Location & NPI Module|Location & NPI Module]]
- [[_COMMUNITY_Dev Launch Config|Dev Launch Config]]
- [[_COMMUNITY_Local Permissions|Local Permissions]]
- [[_COMMUNITY_Storage Migration|Storage Migration]]
- [[_COMMUNITY_DocuPipe Error Handling|DocuPipe Error Handling]]
- [[_COMMUNITY_API Retry Logic|API Retry Logic]]
- [[_COMMUNITY_Appeals Data|Appeals Data]]
- [[_COMMUNITY_Cross-Module Navigation|Cross-Module Navigation]]
- [[_COMMUNITY_Dashboard Shell|Dashboard Shell]]
- [[_COMMUNITY_Efficient Workflow|Efficient Workflow]]
- [[_COMMUNITY_Claims UI Snapshot|Claims UI Snapshot]]
- [[_COMMUNITY_Enrollments UI Snapshot|Enrollments UI Snapshot]]
- [[_COMMUNITY_UI State Snapshots|UI State Snapshots]]
- [[_COMMUNITY_Local Settings|Local Settings]]
- [[_COMMUNITY_Task Tracking|Task Tracking]]
- [[_COMMUNITY_Eligibility Module|Eligibility Module]]

## God Nodes (most connected - your core abstractions)
1. `handleApi()` - 31 edges
2. `handleApi()` - 28 edges
3. `config()` - 21 edges
4. `isLive()` - 17 edges
5. `isLive()` - 14 edges
6. `hasSupabase()` - 13 edges
7. `supabaseRequest()` - 13 edges
8. `api()` - 13 edges
9. `commitPreviewToDashboard()` - 13 edges
10. `callJson()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `.firecrawl/dashboard.md — scraped snapshot of CCS dashboard UI (overview KPIs, nav)` --references--> `DocuPipe module schema — configurable extraction unit linking DocuPipe schema to Stedi target and dashboard section`  [INFERRED]
  C:/Users/kv8n11/culver-city-surgical-dashboard-docupipe/.firecrawl/dashboard.md → C:/Users/kv8n11/culver-city-surgical-dashboard-docupipe/data/docupipe-modules.json
- `DocuPipe Intake Page Snapshot (initial idle)` --references--> `DocuPipe Intake Module`  [EXTRACTED]
  .playwright-mcp/page-2026-06-14T16-42-08-483Z.yml → index.html
- `Overview Page Snapshot (KPI dashboard, DEMO mode, clone footer absent)` --references--> `Overview KPI Dashboard`  [EXTRACTED]
  .playwright-mcp/page-2026-06-15T19-21-08-630Z.yml → index.html
- `DocuPipe Intake Page Snapshot (file uploading)` --semantically_similar_to--> `DocuPipe Intake Page Snapshot (initial idle)`  [INFERRED] [semantically similar]
  .playwright-mcp/page-2026-06-14T16-43-21-302Z.yml → .playwright-mcp/page-2026-06-14T16-42-08-483Z.yml
- `837P Professional Claim` --conceptually_related_to--> `Revenue Cycle Management Workflow`  [INFERRED]
  .playwright-mcp/page-2026-06-14T16-48-12-163Z.yml → index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **ERA denial → appeal letter generation → dashboard appeal record** — lib_stedi, lib_ai_generate_appeal_letter, lib_data_appeals, concept_carc_rarc, concept_appeal_letter_agentic_flow [INFERRED 0.85]
- **DocuPipe intake pipeline: upload → standardize → Stedi preview → dashboard insert** — lib_docupipe, functions_path_handler, data_docupipe_modules, concept_docupipe_module, concept_stedi_target, lib_data_appeals [INFERRED 0.90]
- **Supabase persistence: patients, eligibility_checks, eligibility_batches, work_queue, docupipe_imports, docupipe_modules** — supabase_eligibility_sql, functions_path_handler, server_js, concept_supabase_fallback [EXTRACTED 1.00]
- **DocuPipe to Stedi Claim Submission Pipeline** — concept_docupipe_api, concept_docupipe_modules, index_html_dashboard_spa, concept_stedi_837p, concept_stedi_837i, concept_dashboard_records_table, concept_supabase_persistence [EXTRACTED 0.95]
- **Cloudflare Pages Production API Stack** — concept_cloudflare_pages, concept_functions_path_js, concept_supabase_persistence, concept_stedi_api, concept_docupipe_api [EXTRACTED 0.95]
- **DocuPipe Intake → Stedi EDI → Dashboard Import Flow** — concept_docupipe_intake_pipeline, concept_stedi_edi_integration, index_claims_section [EXTRACTED 1.00]
- **Revenue Cycle EDI Transaction Types (837P, 837I, 270/271, 835)** — concept_837p_professional_claim, concept_837i_institutional_claim, concept_270_271_eligibility, concept_835_era [INFERRED 0.85]
- **Dashboard Sections Surfaced via Workflow Shortcuts Ribbon** — index_workflow_shortcuts, index_claims_section, index_eligibility_section, index_enrollments_section [INFERRED 0.85]
- **DocuPipe 404 Retry Pattern: Job Poll + Standardization + Error Hygiene** — tasks_lessons_standardization_404_retry, tasks_lessons_job_poll_404_retry, tasks_lessons_retry_branch_hygiene [EXTRACTED 1.00]
- **Stedi Endpoint Completeness: Labels + Lifecycle + Cross-Module Navigation** — tasks_lessons_endpoint_label_outcomes, tasks_lessons_stedi_lifecycle_artifacts, tasks_lessons_cross_module_endpoint [EXTRACTED 1.00]
- **Supabase Auth + Target Validation + Persistence Pipeline** — tasks_lessons_supabase_service_role_auth, tasks_lessons_dashboard_record_target_validation, tasks_todo_dashboard_records_table [INFERRED 0.85]

## Communities (30 total, 12 thin omitted)

### Community 0 - "Dev Server API"
Cohesion: 0.06
Nodes (86): addDays(), buildAttachmentPreview(), buildClaimPreview(), buildEligibilityPreview(), buildEligibilityRequest(), buildEraPreview(), buildProviderPreview(), buildStediPreview() (+78 more)

### Community 1 - "Cloudflare Pages API"
Cohesion: 0.09
Nodes (79): addDays(), appMode(), buildAttachmentPreview(), buildClaimPreview(), buildEligibilityPreview(), buildEligibilityRequest(), buildEraPreview(), buildProviderPreview() (+71 more)

### Community 2 - "DocuPipe & Lib Layer"
Cohesion: 0.08
Nodes (62): appeals.js — in-memory APPEALS_DATA store, activeModuleDraft(), api(), applySchemaOverrides(), autoImportPreview(), bind(), bindImportToggle(), chooseSchema() (+54 more)

### Community 3 - "EDI Transaction Types"
Cohesion: 0.08
Nodes (34): 270/271 Eligibility Verification, 835 ERA (Electronic Remittance Advice), 837I Institutional Claim, 837P Professional Claim, DEMO Mode (Watermarked Demo Data), DocuPipe Automated Intake Pipeline, DocuPipe Schema Module Editor, Revenue Cycle Management Workflow (+26 more)

### Community 4 - "API & Integration Lessons"
Cohesion: 0.08
Nodes (24): Active DocuPipe Module List Hygiene, Claim Paid Amount Mapping from DocuPipe, Collapsible Import Panel Toggle Binding, Dashboard Record Target Validation in Server, Derived dashboardTarget from stediTarget, DocuPipe Schema Creation Limitation, DocuPipe Schema Ownership on External Site, Dynamic Form Options from Live Data Arrays (+16 more)

### Community 5 - "Claim Lifecycle Concepts"
Cohesion: 0.12
Nodes (15): Appeal letter agentic flow — Stedi MCP search/eligibility/ERA then Claude API draft then 275 submit, CARC/RARC denial codes — healthcare claim adjustment reason codes extracted from ERA and used to generate appeals, DocuPipe module schema — configurable extraction unit linking DocuPipe schema to Stedi target and dashboard section, Mock/live mode pattern — APP_MODE env var gates real API calls vs in-memory mocks throughout server and functions, Stedi EDI target types — professionalClaim837P, eligibility270, appealsFromEra, claimAttachment275, providerEnrollment, Supabase-or-file fallback — modules and records fall back to JSON file or seed when Supabase creds absent, CPT_DB, .firecrawl/dashboard.md — scraped snapshot of CCS dashboard UI (overview KPIs, nav) (+7 more)

### Community 6 - "Infrastructure & Persistence"
Cohesion: 0.20
Nodes (15): Cloudflare Pages Functions (Production Host), Supabase dashboard_records Table, DocuPipe API, DocuPipe Intake Modules, Cloudflare Pages Functions API Router, server.js Node Local Fallback, Stedi 837I Institutional Claim Submission, Stedi 837P Professional Claim Submission (+7 more)

### Community 7 - "Package Config"
Cohesion: 0.14
Nodes (13): description, engines, node, main, name, private, scripts, cf:deploy (+5 more)

### Community 8 - "Endpoint Audit Trail"
Cohesion: 0.33
Nodes (6): COB Button Must Mutate Claim and Queue 837, Endpoint Button Audit Full Coverage Rule, Endpoint Labels Require Endpoint Outcomes, Stedi Endpoint Buttons Require Lifecycle Artifacts, Stedi Button Audit Implementation 2026-06-14, Stedi Client Shared Facade

### Community 9 - "Scraped UI Snapshots"
Cohesion: 0.50
Nodes (3): data, links, success

### Community 10 - "Print & UX Continuity"
Cohesion: 0.50
Nodes (4): Browser PDF Tamper-Evident Read-Only Mechanism, Claim Packet Full Endpoint Trail Printing, Durable Operator Context Across Refresh, Claim Packet PDF with Tamper-Evident Hash

### Community 11 - "Security & Input Handling"
Cohesion: 0.50
Nodes (4): DocuPipe POST /document Payload Shape, Sanitize Extracted Data at Trust Boundary, Windows Static-File Path Guard Normalization, Hardening Pass Reverted 2026-06-12

### Community 12 - "DocuPipe Schema Config"
Cohesion: 0.50
Nodes (4): DocuPipe Live Claim Flat Payload Mapping, DocuPipe V3 schemaId Account Binding, buildClaimPreview Field Mapping, DocuPipe Live Re-verification 2026-06-14

### Community 13 - "Location & NPI Module"
Cohesion: 0.50
Nodes (4): External API Must Be Proxied Through Backend, JS Property vs HTML Attribute in Global Click Guard, Location Module Rebuild + NPI Lookup 2026-06-25, NPPES NPI Lookup Backend Proxy

### Community 16 - "Storage Migration"
Cohesion: 0.67
Nodes (3): Cloudflare Pages Functions No Filesystem Writes, Render Free Tier Ephemeral Storage Warning, Cloudflare Pages Migration 2026-06-14

### Community 17 - "DocuPipe Error Handling"
Cohesion: 0.67
Nodes (3): DocuPipe 402 / remainingCredits Check, DocuPipe 837I Claim Type Mapping, DocuPipe test3.png Audit 2026-06-14

### Community 18 - "API Retry Logic"
Cohesion: 0.67
Nodes (3): DocuPipe Job Poll 404 Retry Policy, Retry Branch ReferenceError Hygiene, DocuPipe Standardization 404 Retry Policy

## Knowledge Gaps
- **63 isolated node(s):** `version`, `configurations`, `allow`, `success`, `links` (+58 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `functions/[[path]].js — Cloudflare Pages catch-all API handler` connect `Claim Lifecycle Concepts` to `DocuPipe & Lib Layer`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `allow` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dev Server API` be split into smaller, more focused modules?**
  _Cohesion score 0.06251526251526252 - nodes in this community are weakly interconnected._
- **Should `Cloudflare Pages API` be split into smaller, more focused modules?**
  _Cohesion score 0.0867283950617284 - nodes in this community are weakly interconnected._
- **Should `DocuPipe & Lib Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.07884615384615384 - nodes in this community are weakly interconnected._
- **Should `EDI Transaction Types` be split into smaller, more focused modules?**
  _Cohesion score 0.08021390374331551 - nodes in this community are weakly interconnected._
- **Should `API & Integration Lessons` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._