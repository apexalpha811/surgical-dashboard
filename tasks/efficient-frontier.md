# Efficient Frontier Workflow

Use this workflow for substantial work on the DocuPipe and Stedi surgical dashboard.

## Role Split

- Codex keeps architecture, endpoint interpretation, risk decisions, integration, and final review.
- Delegate only bounded, token-heavy work that can run independently: docs mapping, clickable inventories, browser verification, log reduction, and narrow edits with non-overlapping ownership.
- Do not delegate the immediate blocker when the next step depends on it.
- Do not let two agents edit the same file at the same time, especially `index.html`.

## Delegation Packet Template

Every delegated packet must include:

- Repo path: `C:\Users\kv8n11\culver-city-surgical-dashboard-docupipe`
- Objective and exact scope.
- Out-of-scope files or behavior.
- Relevant files, selectors, endpoint families, or search targets.
- Expected return format: findings, changed files, commands run, verification evidence, residual risk, and stop conditions hit.
- Verification commands or browser flows to run.
- Stop conditions:
  - Live code does not match the packet assumption.
  - Verification fails twice after reasonable retry.
  - Work requires files outside assigned scope.
  - The agent cannot produce concrete evidence.

## Dashboard Work Split

For Stedi dashboard audits, split work into:

- Docs mapping: official Stedi endpoint lifecycle and expected UI outcome.
- Repo scan: clickables, handlers, endpoint labels, current behavior, and persistence paths.
- Implementation: only the assigned module or file slice.
- Verification: static checks plus browser text evidence for endpoint artifacts, DOM state, console, and network.

## Required Verification

Run these before reporting done:

- `npm run check`
- Inline script syntax extraction for `index.html`
- Browser automation for every changed endpoint family:
  - 270/271 eligibility
  - 276/277 claim status
  - 837 claims
  - 835 ERA
  - 275 attachments
  - payer directory
  - enrollment/provider APIs
  - transactions/events
  - DocuPipe intake when touched
- `git status --short` in the clone.
- `git status --short` in `C:\Users\kv8n11\culver-city-surgical-dashboard` to confirm the original dashboard remains untouched.

## Commit And Push Rule

- Commit only when explicitly requested.
- Push only when explicitly requested.
- If Render is expected to update, confirm the local branch is aligned with `origin/main` after push.
