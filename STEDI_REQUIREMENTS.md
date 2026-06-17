# Stedi Submission Requirements

**Critical: Fields must be entered in these exact formats for Stedi to process claims.**

## DATES — Format: `MM/DD/YYYY`
- Example: `06/15/2026`
- Used for: Date of Service, DOB, Admission/Discharge dates, Illness dates
- Stedi converts internally to `YYYYMMDD` format
- **Cannot be blank** if claim is submitted to Stedi

## AMOUNTS — Format: `X.XX` (exactly 2 decimals)
- Example: `1000.00` or `50.25`
- Used for: Total charge, Line item charge, Outside lab charges
- **Must use decimal point**, not comma
- Stedi requires `.toFixed(2)` precision

## GENDER — Must be exactly ONE character
- `M` — Male
- `F` — Female
- `U` — Unknown
- **Not** "Male", "Female", "M/F", etc. — must be single letter

## RELATIONSHIP TO SUBSCRIBER — Must use specific codes
- `18` — Self (default)
- `01` — Spouse
- `19` — Child
- `G8` — Other
- **Not** the text "Self" or "Spouse" — must be the code number

## ACCEPT ASSIGNMENT (Box 27) — Must be exactly
- `Y` — Yes, accept assignment
- `N` — No, do not accept assignment
- **Not** "Yes"/"No" text

## NPI / TAX ID / ZIP CODE — Digits only, no formatting
- NPI: Remove hyphens (e.g., `1841557020`)
- SSN: Remove hyphens (e.g., `123456789`)
- EIN/Tax ID: Remove hyphens (e.g., `954412087`)
- Zip code: Remove hyphens (e.g., `90210`)
- Stedi strips all non-digit characters: `.replace(/\D/g,'')`

## DIAGNOSIS CODES (ICD-10) — No decimal points
- Enter: `M1711` (not `M17.11`)
- Stedi removes dots: `.replace(/\./g,'')`
- **Comma-separated if multiple**, e.g., `M1711,K2150,E1165`

## PROCEDURE MODIFIERS — Comma-separated, no spaces
- Example: `LT,50` (Left, Distinct procedural service)
- **NOT** "LT, 50" (no spaces)
- **NOT** "LT-50" (no hyphens)
- Stedi splits: `.split(',').map(s=>s.trim())`

## PLACE OF SERVICE (Box 24B) — 2-digit code
- `11` — Office
- `21` — Inpatient hospital
- `22` — Outpatient hospital
- `23` — Emergency room
- `24` — Ambulatory surgical center
- `31` — Skilled nursing facility
- `81` — Independent lab
- **Must be the code, not the description**

## CPT/HCPCS CODES — Exactly as listed in medical code set
- Example: `29881`, `73080`, `D7465`
- No spaces or formatting
- Description is now auto-populated from CSV

## EMERGENCY INDICATOR (Box 24C)
- User enters: `Yes` or `No`
- Stedi converts: `'Y'` if Yes, otherwise omitted
- **Use dropdown**, don't type

## PRIOR AUTHORIZATION NUMBER — Text string
- No specific format required
- Example: `AUTH-12345` or `456789`
- Stedi accepts as-is

## CLAIM TYPE — Must be exactly
- `837P` — Professional claim (CMS-1500)
- `837I` — Institutional claim (UB-04)
- **Cannot be blank**

## NAME FIELDS (Patient, Subscriber, Provider)
- Parsed as: First name = first word, Last name = remaining words
- Example: "John Doe Smith" → firstName: "John", lastName: "Doe Smith"
- **Cannot be blank for patient and subscriber**

## MEMBER ID / INSURANCE INFO
- No validation, but **must match payer's records** for claim to be accepted
- Typos here cause claim rejection

---

## Summary: What Stedi DOES NOT accept
❌ "06-15-2026" or "6/15/26" (only `MM/DD/YYYY`)
❌ "1000" or "1000.5" (only `X.XX`)
❌ "Male" or "M/F" (only `M`, `F`, or `U`)
❌ "Self" (only `18`)
❌ "Yes"/"No" (only `Y` or `N`)
❌ "1841-55-7020" (only digits)
❌ "M17.11" (only `M1711`)
❌ "LT, 50" or "LT-50" (only `LT,50`)

---

## Test Entry
To verify formatting before submitting to Stedi:
1. Create a draft claim with test data
2. Open the claim drawer
3. Click "Submit" to Stedi
4. If Stedi rejects with a validation error, check this guide for that field
