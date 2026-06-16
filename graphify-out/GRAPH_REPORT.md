# Graph Report - culver-city-surgical-dashboard-docupipe  (2026-06-14)

## Corpus Check
- 14 files · ~31,430 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 354 nodes · 755 edges · 15 communities (12 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cf0b29e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `Culver City Surgical Billing Dashboard Mockup` - 40 edges
2. `Lessons` - 38 edges
3. `handleApi()` - 25 edges
4. `handleApi()` - 24 edges
5. `config()` - 17 edges
6. `isLive()` - 13 edges
7. `hasSupabase()` - 13 edges
8. `api()` - 13 edges
9. `commitPreviewToDashboard()` - 13 edges
10. `supabaseRequest()` - 12 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (15 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (61): buildStediPreview(), callJson(), config, createModule(), dashboardSectionForStoredTarget(), dashboardTargetForStedi(), defaultJsonSchema(), deleteDashboardRecord() (+53 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (59): activeModuleDraft(), api(), applySchemaOverrides(), autoImportPreview(), bind(), bindImportToggle(), chooseSchema(), collectModule() (+51 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (55): appMode(), buildStediPreview(), callJson(), config(), createModule(), dashboardSectionForStoredTarget(), dashboardTargetForStedi(), defaultJsonSchema() (+47 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (42): 2026-06-11 (late), Appeals module (2026-06-11), Claim packet read-only mechanism (2026-06-13), Claim parsing repair (2026-06-12), Clickable tab audit (2026-06-13), Cloudflare live mode switch (2026-06-14), Cloudflare Pages migration (2026-06-14), COB payer order repair (2026-06-13) (+34 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (38): Active DocuPipe module list, Browser PDF lock limits, Claim packet printing, Claim paid amount mapping, Cloudflare Pages storage boundary, COB button outcomes, Collapsible import controls, Cross-module endpoint actions (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (18): addDays(), buildAttachmentPreview(), buildClaimPreview(), buildEligibilityPreview(), buildEraPreview(), buildProviderPreview(), compactDate(), displayDate() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (18): addDays(), buildAttachmentPreview(), buildClaimPreview(), buildEligibilityPreview(), buildEraPreview(), buildProviderPreview(), compactDate(), displayDate() (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (13): description, engines, node, main, name, private, scripts, cf:deploy (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (10): Dashboard Modules, DocuPipe Clone Setup, Environment, Live Upload Payload, Local API, Print Center, Run Locally, Safety Notes (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (8): Active Hosting, API Surface, Cloudflare Setup, Culver City Surgical Dashboard, Data And Safety, Legacy Render Note, Local Development, Required Cloudflare Environment Variables

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (6): Commit And Push Rule, Dashboard Work Split, Delegation Packet Template, Efficient Frontier Workflow, Required Verification, Role Split

## Knowledge Gaps
- **126 isolated node(s):** `version`, `configurations`, `mockDocuments`, `mockJobs`, `mockStandardizations` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `version`, `configurations`, `mockDocuments` to the rest of the system?**
  _126 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08205128205128205 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08408249603384453 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11857229280096794 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Community 7` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._