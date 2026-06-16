CC

Culver City SurgicalRevenue Cycle · Stedi EDI

Workflow

⌂  Overview✓  Eligibility◎  Insurance discovery⇪  Claims⟳  Claim status$  Remittances (ERA)⎘  Attachments⊞  Coordination of benefits⚖  Appeals

Directory

⚕  Providers⌖  Locations⛨  Payers✎  Enrollments

Operations

⇩  DocuPipe intake▣  Print center≣  Transactions & events

Clone · DocuPipe + Stedi

localhost:8742

≡

Dashboard / Overview

# Overview

DarkLight

KV

Eligibility work **15**Claim rework **55**ERA posting **40**Attachments **37**Enrollments **65**DocuPipe intake **+**Recent records **0**

Charges this month

$412,380

▲ 8.2% vs May

Collections

$298,114

▲ 5.1%

Clean claim rate

96.4%

▲ 1.3 pts

Days in A/R

31.2

▼ 2.4 days

Denial rate

4.1%

▼ 0.6 pts

### A/R aging by payer

Outstanding balances across all locations

Anthem BC CA

$84.2k

UnitedHealthcare

$66.9k

Aetna

$48.6k

Cigna

$35.6k

Medicare (Noridian)

$25.9k

### Today's work queue

Items needing action before 5:00 PM PT

|     |     |
| --- | --- |
| Eligibility re-checks for tomorrow's surgeries | 12 pending |
| Claims rejected at clearinghouse | 29 to fix |
| ERAs to post | 40 new |
| Enrollment tasks awaiting signature | 2 open |
| Attachments requested by payer (275) | 10 urgent |

### Real-time eligibility check (270/271)

Verify coverage before scheduling

**POST** /change/medicalnetwork/eligibility/v3**POST** /change/medicalnetwork/eligibility/v3/raw-x12

Member ID

Patient DOB

PayerAnthem Blue Cross CAUnitedHealthcareAetna

Service typeSurgical (2)Health benefit plan coverage (30)

Run eligibility check

### Batch eligibility: tomorrow's schedule

38 patients queued for June 12 surgery day

**POST** /eligibility-manager/batch-eligibility**GET** /eligibility-manager/batch/{batchId}**GET** /eligibility-manager/batch/{batchId}/items**GET** /eligibility-manager/polling/batch-eligibility

Batch #BE-0611

26/38

26 active · 9 pending · 2 inactive coverage · 1 payer timeout

### Eligibility checks

124 saved records · click a row for detail

| Patient | Payer | Plan | Coverage | Copay | Deductible left | Checked |
| --- | --- | --- | --- | --- | --- | --- |
| James Holloway | Anthem Blue Cross CA | PPO Gold | Active | $250 | $800 | 6/14/2026, 1:15 AM |
| James Holloway | Anthem Blue Cross CA | PPO Gold | Active | $250 | $800 | 6/14/2026, 1:06 AM |
| James Holloway | Anthem Blue Cross CA | PPO Gold | Active | $250 | $1,000 | 6/13/2026, 1:33 PM |
| James Holloway | Anthem Blue Cross CA | PPO Gold | Active | $250 | $1,000 | 6/13/2026, 1:38 PM |
| Marisol Whitfieldkk | Anthem Blue Cross CA | HMO Select | Active | $0 | $2,532 | Apr 13, 1:53 PM |
| David Delgado | Blue Shield of CA | Part B | Inactive | - | - | Apr 17, 11:34 AM |
| Linda Brennan | UnitedHealthcare | HMO Select | Inactive | - | - | May 6, 9:08 AM |
| Robert Reyes | Aetna | POS Premier | Active | $500 | $190 | May 17, 4:48 PM |
| Aisha Vega | Cigna | HDHP Bronze | Active | $300 | $2,906 | May 23, 4:28 PM |
| Elena Holloway | Medicare (Noridian) | Choice Plus | Active | $500 | $1,138 | May 8, 10:03 AM |
| James Abara | Medi-Cal | HDHP Bronze | Active | $300 | $222 | Apr 10, 1:37 PM |
| Patricia Moreau | Kaiser Foundation HP | Choice Plus | Active | $0 | $386 | May 11, 10:15 AM |

‹ Prev1–12 of 124Next ›

### Find unknown coverage

Search payer networks when a patient arrives without insurance information

**POST** /insurance-discovery/check/v1**GET** /insurance-discovery/check/v1/{discoveryId}

First name

Last name

DOB

SSN (last 4)

Start discovery

### Discovery results

100 discovery searches · click a row for detail

| Discovery ID | Patient | Status | Coverage found | Payer |
| --- | --- | --- | --- | --- |
| disc\_u973zu | Marcus Whitaker | Searching | - | - |
| disc\_n196o5 | Hannah Tran | Complete | No coverage located | - |
| disc\_k0sl5j | Victor Marquez | Complete | No coverage located | - |
| disc\_xu0y10 | Naomi Castillo | Complete | No coverage located | - |
| disc\_dyf8t2 | Carlos Novak | Complete | No coverage located | - |
| disc\_6hm4mm | Diane Hartman | Complete | No coverage located | - |
| disc\_a98m0x | Trevor Petrova | Complete | Yes | Medi-Cal |
| disc\_ue28o3 | Yuki Rosenthal | Complete | Yes | Kaiser Foundation HP |
| disc\_79n4ib | Omar Lindqvist | Searching | - | - |
| disc\_79rqnm | Brenda Park | Searching | - | - |
| disc\_xkskj9 | Felix Okafor | Complete | Yes | Oscar Health |
| disc\_q8tkgz | Tamara Stanton | Complete | No coverage located | - |

‹ Prev1–12 of 100Next ›

**POST** /change/medicalnetwork/professionalclaims/v3/submission**POST** /change/medicalnetwork/professionalclaims/v3/raw-x12-submission**POST** /change/medicalnetwork/institutionalclaims/v1/submission**POST** /change/medicalnetwork/institutionalclaims/v1/raw-x12-submission**GET** /export/{transactionId}/1500/pdf

Total claims

140

837P · 837I

Accepted / paid

85

61%

Rejected / denied

29

needs rework

Pending payer

22

in adjudication

### Claim queue

\+ New professional claim (837P)\+ Institutional (837I)

Click any row for service lines, diagnoses, and adjudication detail

| Claim | Patient | Type | Provider | Location | Payer | Billed | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CLM-20560 | Marcus Marquez | 837I | Dr. Reyes | Culver City ASC | Anthem Blue Cross CA | $20,408 | Paid |
| CLM-20559 | Hannah Castillo | 837I | Dr. Patel | Marina del Rey Clinic | Aetna | $33,450 | Pending payer |
| CLM-20558 | Victor Novak | 837I | Dr. Chen | El Segundo Imaging & Pain | Medi-Cal | $3,036 | Pending payer |
| CLM-20557 | Naomi Hartman | 837P | Dr. Whitcomb | Culver City ASC | Health Net CA | $11,495 | Pending payer |
| CLM-20556 | Carlos Petrova | 837I | Dr. Tran | Marina del Rey Clinic | Anthem Blue Cross CA | $13,628 | Accepted |
| CLM-20555 | Diane Rosenthal | 837P | Dr. Nunez | El Segundo Imaging & Pain | Aetna | $15,536 | Accepted |
| CLM-20554 | Trevor Lindqvist | 837P | Dr. Rosenthal | Culver City ASC | Medi-Cal | $25,458 | Pending payer |
| CLM-20553 | Yuki Park | 837I | Dr. Brennan | Marina del Rey Clinic | Health Net CA | $32,516 | Rejected |
| CLM-20552 | Omar Okafor | 837I | Dr. Salazar | El Segundo Imaging & Pain | Anthem Blue Cross CA | $1,897 | Paid |
| CLM-20551 | Brenda Stanton | 837P | Dr. Whitaker | Culver City ASC | Aetna | $10,431 | Paid |
| CLM-20550 | Felix Ito | 837I | Dr. Gutierrez | Marina del Rey Clinic | Medi-Cal | $1,136 | Paid |
| CLM-20549 | Tamara Salazar | 837P | Dr. Petrova | El Segundo Imaging & Pain | Health Net CA | $44,458 | Accepted |

‹ Prev1–12 of 140Next ›

### Real-time claim status (276/277)

Query payer systems directly for adjudication status

**POST** /change/medicalnetwork/claimstatus/v2**POST** /change/medicalnetwork/claimstatus/v2/raw-x12**GET** /change/medicalnetwork/reports/v2/{transactionId}/277

Claim / trace number

PayerMedicare (Noridian)Anthem Blue Cross CA

Date of service

Check status

### Tracked claims

120 tracked claims auto-polled every 24h · click a row for the 277 history

| Claim | Payer | Category (277) | Status | Last checked |
| --- | --- | --- | --- | --- |
| CLM-20560 | Anthem Blue Cross CA | A2: Acknowledged | In review | May 7, 12:13 PM |
| CLM-20559 | Aetna | P3: Pending | In review | May 19, 11:52 AM |
| CLM-20558 | Medi-Cal | F1: Finalized | Paid $2,125 | Apr 14, 10:58 AM |
| CLM-20557 | Health Net CA | F2: Finalized | Denied | Apr 8, 1:59 PM |
| CLM-20556 | Anthem Blue Cross CA | P1: Pending | In review | May 28, 3:42 PM |
| CLM-20555 | Aetna | A2: Acknowledged | In review | May 14, 1:19 PM |
| CLM-20554 | Medi-Cal | P3: Pending | In review | Apr 4, 1:25 PM |
| CLM-20553 | Health Net CA | F1: Finalized | Paid $22,761 | Apr 23, 7:39 AM |
| CLM-20552 | Anthem Blue Cross CA | F2: Finalized | Denied | Apr 23, 7:52 AM |
| CLM-20551 | Aetna | P1: Pending | In review | May 31, 12:01 PM |
| CLM-20550 | Medi-Cal | A2: Acknowledged | In review | May 6, 9:36 AM |
| CLM-20549 | Health Net CA | P3: Pending | In review | Jun 8, 7:50 AM |

‹ Prev1–12 of 120Next ›

**GET** /change/medicalnetwork/reports/v2/{transactionId}/835**GET** /electronic-remittance-advice/{transactionId}/pdf

ERAs received

100

835 transactions

Posted

$2,420,866

60 remits

Unposted

$1,731,345

40 remits

Adjustments

$225,840

CO + PR

### Remittance inbox

Click any row for claim payments and CAS adjustment detail

| Check / EFT | Payer | Claims | Billed | Paid | Patient resp. | Status |
| --- | --- | --- | --- | --- | --- | --- |
| EFT-6344425 | Anthem Blue Cross CA | 7 | $71,571 | $35,963 | $8,611 | Posted |
| CHK-1887704 | Blue Shield of CA | 2 | $26,165 | $17,942 | $880 | New |
| CHK-2148287 | UnitedHealthcare | 8 | $125,237 | $81,032 | $9,253 | Posted |
| EFT-4160696 | Aetna | 2 | $27,809 | $13,130 | $2,275 | Posted |
| EFT-4064947 | Cigna | 6 | $95,102 | $59,122 | $10,619 | Posted |
| CHK-7046376 | Medicare (Noridian) | 4 | $55,174 | $30,118 | $6,857 | Posted |
| CHK-1102356 | Medi-Cal | 8 | $132,982 | $74,717 | $10,561 | Posted |
| EFT-9159974 | Kaiser Foundation HP | 6 | $66,587 | $44,380 | $3,175 | Posted |
| EFT-1212448 | Humana | 3 | $34,765 | $22,504 | $3,180 | New |
| EFT-5788704 | Health Net CA | 2 | $33,317 | $19,812 | $5,372 | New |
| EFT-5390053 | Oscar Health | 4 | $68,193 | $43,111 | $9,868 | Posted |
| EFT-2321163 | Tricare West | 4 | $56,178 | $38,383 | $6,136 | Posted |

‹ Prev1–12 of 100Next ›

### Claim attachments (275)

Send operative reports, imaging, and medical records the payer requested

**POST** /claim-attachments/file**POST** /claim-attachments/raw-x12-submission

Drop operative report PDF here, or browse files

Generates a pre-signed upload URL, then transmits as X12 275

### Attachment requests

104 saved records · click a row for detail

| Claim | Payer | Requested | Document | Due | Status |
| --- | --- | --- | --- | --- | --- |
| CLM-20559 | Unknown Payer | 06/14/2026 | Clinical document | 06/21/2026 | Sent |
| CLM-20559 | Unknown Payer | 06/14/2026 | Clinical document | 06/21/2026 | Awaiting upload |
| CLM-20559 | Unknown Payer | 06/14/2026 | Clinical document | 06/21/2026 | Awaiting upload |
| Pending | Unknown Payer | 06/13/2026 | Clinical document | 06/20/2026 | Sent |
| CLM-20560 | Anthem Blue Cross CA | Mar 29 | Operative report | Apr 16 | Sent |
| CLM-20558 | Medi-Cal | Jun 9 | Implant invoice | Apr 30 | Awaiting upload |
| CLM-20556 | Anthem Blue Cross CA | May 21 | Pre-op H&P | Apr 29 | Accepted |
| CLM-20554 | Medi-Cal | Jun 1 | Imaging study (MRI) | Mar 28 | Sent |
| CLM-20552 | Anthem Blue Cross CA | Mar 30 | Anesthesia record | Jun 1 | Overdue |
| CLM-20550 | Medi-Cal | May 31 | Pathology report | May 19 | Overdue |
| CLM-20548 | Anthem Blue Cross CA | Apr 2 | Operative report | Apr 18 | Awaiting upload |
| CLM-20546 | Medi-Cal | Mar 30 | Implant invoice | Apr 10 | Sent |

‹ Prev1–12 of 104Next ›

### Coordination of benefits

Determine primary vs. secondary coverage when a patient has multiple plans

**POST** /coordination-of-benefits

Patient

Known payerMedicare (Noridian)

Member ID

Run COB check

### COB findings

101 saved records · click a row for detail

| Patient | Primary | Secondary | Effective | Rule |
| --- | --- | --- | --- | --- |
| Robert Whitfield | Medicare (Noridian) | Blue Shield of CA | 06/01/2026 | Medigap follows Medicare |
| Felix Ito | Anthem Blue Cross CA | Medicare (Noridian) | 06/01/2025 | Medicare Secondary Payer: working aged |
| Tamara Salazar | Blue Shield of CA | Medi-Cal | 05/01/2026 | Birthday rule (dependent child) |
| Ivan Calloway | UnitedHealthcare | Kaiser Foundation HP | 08/01/2026 | Employer plan primary over spouse plan |
| Cecilia Bell | Aetna | Humana | 09/01/2024 | Medigap follows Medicare |
| Andre Kim | Cigna | Health Net CA | 06/01/2026 | COBRA continuation secondary |
| Monique Soto | Medicare (Noridian) | Oscar Health | 06/01/2026 | Medicare Secondary Payer: working aged |
| Hector Donovan | Medi-Cal | Tricare West | 04/01/2024 | Birthday rule (dependent child) |
| Lauren Gutierrez | Kaiser Foundation HP | Anthem Blue Cross CA | 02/01/2025 | Employer plan primary over spouse plan |
| Dmitri Nunez | Humana | Blue Shield of CA | 06/01/2025 | Medigap follows Medicare |
| Paloma Vance | Health Net CA | UnitedHealthcare | 01/01/2025 | COBRA continuation secondary |
| Marisol Achebe | Oscar Health | Aetna | 06/01/2024 | Medicare Secondary Payer: working aged |

‹ Prev1–12 of 101Next ›

**GET** /change/medicalnetwork/reports/v2/{transactionId}/835**POST** /change/medicalnetwork/professionalclaims/v3/submission**POST** /change/medicalnetwork/claimstatus/v2**POST** /claim-attachments/file

Total appeals

11

all statuses

Total $ at risk

$34,050

8 open appeals

Win rate

67%

2 won · 1 lost

Deadlines within 14 days

2

act before forfeit

### New appeal

Start an appeal from a denied claim

Patient name

Patient DOB

Claim #

Date of service

PayerAetnaUnitedHealthBlue ShieldCignaHumana

CPT codes

Diagnosis (ICD-10)

Denial codeCO-97CO-4PR-1CO-50CO-22

Denial reason

Appeal typeCorrectable ResubmissionFormal AppealPeer-to-Peer

Deadline

Assigned to

Amount billed

Amount denied

✨ Generate Appeal Letter with AI

#### Appeal letter draft

Click the AI button above to draft a letter from these fields.

Create appealCancel

### Appeals queue

\+ New appeal

Click a column header to sort · click a row for the full record, timeline, and appeal letter

| Claim # | Patient | Payer | CPT codes | Denial code | Denial reason | Appeal type | Status | Deadline ▲ | Amount denied |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CLM-20431 | Robert Martinez | Aetna | 29881, 29827 | CO-97 | The benefit for this service is included in the benefit for another service rendered on the same date of service. | Correctable Resubmission | Not Started | 06/17/2026 | $4,250 | View |
| CLM-20623 | David Patel | Blue Shield | 66984 | CO-4 | The procedure code is inconsistent with the modifier used or a required modifier is missing. | Correctable Resubmission | In Progress | 06/18/2026 | $3,150 | View |
| CLM-21002 | Elizabeth Taylor | UnitedHealth | 66984 | PR-1 | The patient has not met the deductible amount. | Correctable Resubmission | Won | 06/24/2026 | $2,995 | View |
| CLM-20879 | Karen Liu | Aetna | 29881 | CO-97 | The benefit for this service is included in the benefit for another service rendered on the same date of service. | Formal Appeal | Lost | 06/28/2026 | $3,600 | View |
| CLM-20945 | Steven Gomez | Blue Shield | 27447 | CO-50 | These services are not considered medically necessary by this payer. | Peer-to-Peer | In Progress | 06/30/2026 | $5,200 | View |
| CLM-20801 | Thomas Hernandez | Humana | 45380 | CO-22 | Care should have been provided by another payer under coordination of benefits rules. | Correctable Resubmission | Escalated | 07/02/2026 | $2,840 | View |
| CLM-21134 | Nancy Robinson | Humana | 45380 | CO-22 | Care should have been provided by another payer under coordination of benefits rules. | Peer-to-Peer | Escalated | 07/05/2026 | $2,840 | View |
| CLM-21067 | Charles Mitchell | Cigna | 49505 | CO-4 | The procedure code is inconsistent with the modifier used or a required modifier is missing. | Correctable Resubmission | In Progress | 07/09/2026 | $4,150 | View |
| CLM-20547 | Jennifer Wong | UnitedHealth | 47562 | PR-1 | The patient has not met the deductible amount. | Formal Appeal | Submitted | 07/12/2026 | $6,800 | View |
| CLM-20445 | Testing | Blue Shield | 29881, 29827 | CO-97 | Benefit included in another billed service | Correctable Resubmission | Not Started | 07/15/2026 | $4,820 | View |
| CLM-20734 | Margaret Sullivan | Cigna | 63030, 49505 | CO-50 | These services are not considered medically necessary by this payer. | Formal Appeal | Won | 07/15/2026 | $7,920 | View |

### Rendering & billing providers

\+ Add provider

104 credentialed providers across all facilities. Managed separately from locations. Click a row for detail.

**POST** /providers**GET** /providers**POST** /providers/{providerId}**DELETE** /providers/{providerId}

| Provider | NPI | Specialty | Tax ID | Enrollment status |
| --- | --- | --- | --- | --- |
| **Dr. Alejandro Reyes, MD** | 1183792909 | Orthopedic surgery | 95-4412087 | 1 pending8 payers live |
| **Dr. Sunita Patel, MD** | 1701770546 | General surgery | 95-4412087 | 8 payers live |
| **Dr. Michael Chen, MD** | 1604083312 | Pain management | 95-4412087 | 1 pending9 payers live |
| **Dr. Dana Whitcomb, DO** | 1409147162 | Anesthesiology | 95-4412087 | 1 pending12 payers live |
| **Dr. David Tran, MD** | 1839661869 | Orthopedic surgery | 95-4412087 | 3 payers live |
| **Dr. Aisha Nunez, MD** | 1318455850 | General surgery | 95-4412087 | 1 pending11 payers live |
| **Dr. Patricia Rosenthal, MD** | 1145525874 | Pain management | 95-4412087 | 2 pending8 payers live |
| **Dr. Marcus Brennan, MD** | 1906769837 | Ophthalmology | 95-4412087 | 11 payers live |
| **Dr. Naomi Salazar, DO** | 1784179541 | Gastroenterology | 95-4412087 | 1 pending7 payers live |
| **Dr. Trevor Whitaker, MD** | 1240601435 | Podiatry | 95-4412087 | 10 payers live |
| **Dr. Brenda Gutierrez, MD** | 1572844563 | Anesthesiology | 95-4412087 | 2 pending5 payers live |
| **Dr. Ivan Petrova, MD** | 1501886549 | Otolaryngology | 95-4412087 | 4 payers live |

‹ Prev1–12 of 104Next ›

Service facility locations (claim loop 2310C). Kept separate from provider records: a provider can render at any location.

### Culver City ASC

Primary

9808 Washington Blvd, Suite 200

Culver City, CA 90232

Facility NPI 1841557020 · POS 24 (ASC)

4 ORs47 claims

Manage

### Marina del Rey Clinic

Satellite

4560 Admiralty Way, Suite 310

Marina del Rey, CA 90292

Facility NPI 1992304186 · POS 11 (Office)

Pre-op / consults47 claims

Manage

### El Segundo Imaging & Pain

Satellite

2041 Rosecrans Ave, Suite 155

El Segundo, CA 90245

Facility NPI 1577449863 · POS 11 (Office)

Pain procedures46 claims

Manage

### Payer directory

Search the Stedi payer network for IDs, supported transactions, and enrollment requirements

**GET** /payers/search**GET** /payers**GET** /payer/{stediId}**GET** /payers/csv

Search\+ Add payerExport CSV

### Network payers

108 payers in network directory · click a row for detail

| Payer | Stedi ID | Eligibility | Claims | ERA | Enrollment required |
| --- | --- | --- | --- | --- | --- |
| **Anthem Blue Cross of CA** | ANTBLUCRO-OC0 | 270/271 | 837 | - | All transactions |
| **Anthem Blue Cross Medicare Advantage** | ANTBLUCRO-MA1 | 270/271 | 837 | 835 | None |
| **Anthem Blue Cross HMO** | ANTBLUCRO-H2 | 270/271 | 837 | - | Claims + ERA |
| **Anthem Blue Cross PPO** | ANTBLUCRO-P3 | 270/271 | 837 | 835 | ERA only |
| **Blue Shield of CA** | BLUSHI-OC4 | 270/271 | 837 | 835 | Claims + ERA |
| **Blue Shield Medicare Advantage** | BLUSHI-MA5 | 270/271 | 837 | 835 | All transactions |
| **Blue Shield HMO** | BLUSHI-H6 | 270/271 | 837 | 835 | ERA only |
| **Blue Shield PPO** | BLUSHI-P7 | 270/271 | 837 | - | Claims + ERA |
| **UnitedHealthcare of CA** | UNI-OC8 | 270/271 | 837 | 835 | Claims + ERA |
| **UnitedHealthcare Medicare Advantage** | UNI-MA9 | 270/271 | 837 | 835 | All transactions |
| **UnitedHealthcare HMO** | UNI-H10 | - | 837 | 835 | Claims + ERA |
| **UnitedHealthcare PPO** | UNI-P11 | 270/271 | 837 | 835 | None |

‹ Prev1–12 of 108Next ›

**POST** /enrollments**GET** /enrollments**POST** /enrollments/{enrollmentId}**DELETE** /enrollments/{enrollmentId}**POST** /enrollments/export**POST** /enrollments/{enrollmentId}/documents**GET** /documents/{documentId}/download**DELETE** /documents/{documentId}**POST** /tasks/{taskId}

### Payer transaction enrollments

\+ New enrollmentExport all

109 saved records · click a row for detail

| Provider | Payer | Transaction | Status | Open task |
| --- | --- | --- | --- | --- |
| Dr. Alejandro Reyes, MD | Anthem Blue Cross of CA | 837P claims | Submitted | - |
| Dr. Alejandro Reyes, MD | Anthem Blue Cross of CA | 837P claims | Submitted | - |
| Dr. Alejandro Reyes, MD | Anthem Blue Cross of CA | 837P claims | Submitted | - |
| Dr. Alejandro Reyes, MD | Anthem Blue Cross of CA | 837P claims | Draft | Complete EDI agreement |
| Dr. Michael Chen, MD | Anthem Blue Cross CA | 837P claims | Draft | Complete EDI agreement |
| Dr. Michael Chen, MD | Anthem Blue Cross CA | 837P claims | Draft | Complete EDI agreement |
| Dr. Michael Chen, MD | Anthem Blue Cross CA | 837P claims | Draft | Complete EDI agreement |
| Dr. Alejandro Reyes, MD | Anthem Blue Cross CA | 837P claims | Draft | Complete EDI agreement |
| Dr. Alejandro Reyes, MD | Anthem Blue Cross CA | 837P claims | Draft | Complete EDI agreement |
| Dr. Alejandro Reyes, MD | Anthem Blue Cross CA | 270 eligibility | Live | - |
| Dr. Sunita Patel, MD | UnitedHealthcare | 835 ERA | Live | - |
| Dr. Michael Chen, MD | Cigna | 835 ERA | Live | - |

‹ Prev1–12 of 109Next ›

**POST** /api/docupipe/upload**POST** /api/docupipe/standardize**GET** /api/docupipe/jobs/{jobId}**POST** /api/stedi/preview**POST** /api/stedi/submit

### Run intake

Upload, standardize, review, then insert into the dashboard

Schema moduleClaim Attachment PacketProfessional Claim IntakeEligibility Card IntakeERA or Denial PDFProvider Enrollment Document

Source file

UploadStandardizePreview StediInput to dashboard

#### Status

Mode **mock**

Document **waiting**

Job **waiting**

Standardization **waiting**

Schema **saved: wzlKtNFc**

Import **none**

### Module editor

Edit the selected module schema and mapping

Name

Stedi targetProfessional claim 837PEligibility 270ERA or denial appealClaim attachment 275Provider enrollment

Dashboard target

Stedi endpoint

Guidelines

JSON schema

Field mappings

Advanced module metadata

Available DocuPipe schemasRefresh schemas to load

DocuPipe schema ID

Saved schema IDs persist in this browser. On free hosting, server file edits can reset after sleep or redeploy.

Refresh schemasSave schema IDValidate schema

Save moduleDuplicate as new

### Review

Mapped values and review flags

### Imported record

All imported data, past and present

No record imported yet.

#### Import history

No imported history yet.

View all imported data

### DocuPipe JSON

{}

### Stedi payload preview

{}

**GET** /api/modules**PRINT** module schemas**PRINT** extracted records**PRINT** dashboard records

### Print Center

Generate browser-printable packets from modules and dashboard records

### Module catalog

All schema modules, endpoints, and mapping hints

Print modules

### Last extraction

Most recent DocuPipe standardization JSON

Print extraction

### Stedi preview

Most recent mapped Stedi request payload

Print Stedi preview

### Appeals packet

Open appeals, deadlines, and draft letters

Print appeals

### Open drawer

Currently opened dashboard detail record

Print open record

### Dashboard summary

Counts across claim, ERA, attachment, and enrollment queues

Print summary

**GET** /transactions**GET** /transactions/{transactionId}**GET** /transactions/{transactionId}/input**GET** /transactions/{transactionId}/output**GET** /polling/transactions**GET** /executions**GET** /executions/{executionId}**POST** /events/{eventId}/retry**GET** /events**GET** /events/{eventId}

### Raw EDI transaction log

160 X12 files exchanged · click a row for detail

| Transaction | Type | Direction | Partner | Date | Time | Status |
| --- | --- | --- | --- | --- | --- | --- |
| txn\_up6mziq | 837P | Outbound | Anthem Blue Cross CA | Mar 28 | 4:11 PM | Delivered |
| txn\_cef4m2f | 837I | Outbound | Medicare (Noridian) | May 4 | 9:50 AM | Delivered |
| txn\_h1w3tc2 | 835 | Inbound | Oscar Health | May 10 | 1:28 PM | Processed |
| txn\_godp654 | 270 | Outbound | Aetna | Apr 1 | 11:56 AM | Delivered |
| txn\_mcbcz9w | 271 | Inbound | Humana | Apr 28 | 10:52 AM | Processed |
| txn\_m658zwa | 276 | Outbound | Blue Shield of CA | May 19 | 1:03 PM | Delivered |
| txn\_k8b1nvl | 277 | Inbound | Medi-Cal | Mar 28 | 3:45 PM | Processed |
| txn\_xaieu0w | 275 | Outbound | Tricare West | Apr 23 | 12:42 PM | Mapping failed |
| txn\_wwikkj6 | 999 | Inbound | Cigna | Apr 29 | 4:17 PM | Mapping failed |
| txn\_wyysuz1 | 277CA | Inbound | Health Net CA | May 13 | 8:54 AM | Processed |
| txn\_veayksu | 837P | Outbound | UnitedHealthcare | May 14 | 2:31 PM | Delivery retry |
| txn\_g7kt4ds | 837I | Outbound | Kaiser Foundation HP | Jun 4 | 12:44 PM | Delivered |

‹ Prev1–12 of 160Next ›

Loaded saved dashboard data.