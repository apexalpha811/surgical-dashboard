# Culver City Surgical Dashboard - DocuPipe Clone

This folder is the DocuPipe and Stedi integration clone. The original dashboard folder remains unchanged. See `DOCUPIPE_SETUP.md` for server, API key, mock mode, live mode, and Print Center setup.

## Original Dashboard Notes

Static-HTML medical billing dashboard mockup with a comprehensive Insurance Appeals tracking module. Uses plain browser JavaScript (no modules, no build process) loaded via script tags in `index.html`.

## Project Overview

This dashboard enables ASC (Ambulatory Surgery Center) billing staff to track, manage, and appeal insurance claim denials. The Appeals module provides:

- 10 sample appeal records with realistic claim data, patient information, and denial codes (CARC codes)
- Appeal letter generation with 3 distinct formal template variants
- Mock Stedi healthcare API integration (simulates real Stedi EDI endpoints)
- Clinical decision support via Claude AI for medical necessity argumentation
- Timeline tracking of appeal progression (denial received, submitted, resolved)
- Deadline management and payer coordination

## File Map

**Core data:**
- `lib/data/appeals.js` - `APPEALS_DATA` constant with 10 appeal records including patient demographics, claim details, denial codes, appeal status, and formatted appeal letter drafts

**Appeal letter generation:**
- `lib/ai/generateAppealLetter.js` - `generateAppealLetter(appeal, variant)` function returning hardcoded multi-paragraph appeal letters in 3 template styles; includes live Claude API and Stedi MCP workflow as comment block

**Stedi API mock:**
- `lib/stedi.js` - `StediMock` global object with 6 async functions simulating Stedi healthcare API and MCP tool calls (fetchERADenials, resubmitClaim, checkClaimStatus, submitAttachment, searchPayer, runEligibilityCheck)

**Configuration:**
- `.env.example` - Template for API keys (Stedi, Anthropic) and app name; copy to `.env` for local development

**Documentation:**
- `README.md` - This file

## Live Integration Guide

### Swap Mock to Claude API

In `lib/ai/generateAppealLetter.js`, the comment block at the top shows the exact live implementation:

```javascript
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [{
    role: "user",
    content: `You are a professional medical billing specialist writing a formal
    insurance appeal letter on behalf of an Ambulatory Surgery Center (ASC).
    Write a formal appeal letter to ${payer} referencing denial code ${denialCode}
    (${denialReason}) for CPT codes ${cptCodes} and diagnosis ${diagnosisCodes}.
    The claim number is ${claimNumber} for service date ${dateOfService}.
    Amount denied: $${amountDenied}. Appeal type: ${appealType}.
    Request reconsideration citing medical necessity. Include placeholders for
    facility name, address, and provider NPI.`
  }]
});
return response.content[0].text;
```

**Steps to activate:**
1. Load the Anthropic SDK: `npm install @anthropic-ai/sdk`
2. Set `ANTHROPIC_API_KEY` in `.env` (obtain from https://console.anthropic.com)
3. Replace the `generateAppealLetter` function with the live implementation above
4. Obtain a Business Associate Agreement (BAA) with Anthropic before using real patient data in production

### Swap Mock to Stedi Healthcare API

In `lib/stedi.js`, each function includes a TODO comment showing the real endpoint:

- `fetchERADenials()` - GET `https://healthcare.us.stedi.com/2024-04-01/era` (pull CARC/RARC denial codes and ERA documents)
- `resubmitClaim(claimId)` - POST `https://healthcare.us.stedi.com/2024-04-01/claims` (resubmit corrected claim)
- `checkClaimStatus(claimId)` - POST `https://healthcare.us.stedi.com/2024-04-01/claim-status` (track claim processing)
- `submitAttachment(claimId, file)` - POST `https://healthcare.us.stedi.com/2024-04-01/attachments` (attach clinical docs to appeal)
- `searchPayer()` - Stedi MCP tool `payer_search` (lookup payer rules and endpoints)
- `runEligibilityCheck()` - Stedi MCP tool `eligibility_check` (verify patient coverage)

**Steps to activate:**
1. Set `STEDI_API_KEY` in `.env` (obtain from https://stedi.com)
2. Replace `StediMock` functions with actual HTTP requests using `fetch` or `axios`
3. See https://stedi.com/docs for API reference and MCP integration

### Agentic Workflow with Stedi + Claude

The comment block in `lib/ai/generateAppealLetter.js` documents the full workflow:

1. Stedi MCP `searchPayer()` - Get payer ID and approved submission channels
2. Stedi MCP `runEligibilityCheck()` - Confirm patient coverage and deductible status
3. Stedi ERA API `fetchERADenials()` - Pull CARC/RARC codes from payer
4. Claude API `generateAppealLetter()` - Draft formal appeal letter using denial + CPT/diagnosis data
5. Stedi 275/005010X222 API `submitAttachment()` - Attach clinical docs to appeal submission
6. Dashboard timeline logging - Record submission, set deadline tracker, monitor payer response

## HIPAA Compliance Notice

This dashboard is a mockup using synthetic demo data. Before deploying to production with real patient information:

- **Obtain a Business Associate Agreement (BAA)** with Anthropic Inc. before sending any real patient data to the Claude API
- **Encrypt data in transit** (HTTPS only, no HTTP)
- **Secure API keys** using environment variables or a secrets manager (never commit `.env` to version control)
- **Audit logging** - Track all claim modifications, appeals submitted, and API calls
- **User access control** - Implement role-based access for billing staff, clinicians, and administrators
- **Data retention** - Follow state and federal regulations on claim records (typically 5-7 years minimum)

See your healthcare compliance officer and legal team before production deployment.

## Deployment

This is a **static HTML dashboard**. No Node.js, no Next.js, no build step required.

**Option 1: Local preview**
```bash
cd C:\Users\kv8n11\culver-city-surgical-dashboard
python -m http.server 8000
# or
npx http-server
```
Then open `http://localhost:8000` in your browser.

**Option 2: Cloud static hosting**
Deploy the entire folder to any static host (Vercel, Netlify, S3, GitHub Pages, etc.). No `vercel.json` config needed.

**Option 3: Docker**
```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
```

The dashboard loads all JavaScript via `<script>` tags in `index.html`. No modules, no build tools, no import/export statements.

---

**Last updated:** June 11, 2026

For questions or contributions, contact the ASC billing team.
