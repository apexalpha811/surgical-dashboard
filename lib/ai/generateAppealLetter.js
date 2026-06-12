/*
 * LIVE IMPLEMENTATION — Claude API
 *
 * import Anthropic from "@anthropic-ai/sdk";
 * const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 *
 * const response = await client.messages.create({
 *   model: "claude-sonnet-4-5",
 *   max_tokens: 1024,
 *   messages: [{
 *     role: "user",
 *     content: `You are a professional medical billing specialist writing a formal
 *     insurance appeal letter on behalf of an Ambulatory Surgery Center (ASC).
 *     Write a formal appeal letter to ${payer} referencing denial code ${denialCode}
 *     (${denialReason}) for CPT codes ${cptCodes} and diagnosis ${diagnosisCodes}.
 *     The claim number is ${claimNumber} for service date ${dateOfService}.
 *     Amount denied: $${amountDenied}. Appeal type: ${appealType}.
 *     Request reconsideration citing medical necessity. Include placeholders for
 *     facility name, address, and provider NPI.`
 *   }]
 * });
 * return response.content[0].text;
 *
 * STEDI MCP AGENTIC FLOW (when connected):
 * Step 1: Stedi MCP → searchPayer() — get payer ID and rules
 * Step 2: Stedi MCP → runEligibilityCheck() — confirm patient coverage
 * Step 3: Stedi ERA API → fetchERADenials() — pull CARC/RARC denial codes
 * Step 4: Claude API → generateAppealLetter() — draft letter using denial + CPT/DX data
 * Step 5: Stedi 275 API → submitAttachment() — attach clinical docs to appeal
 * Step 6: Dashboard → save draft, log timeline, set deadline tracker
 *
 * HIPAA NOTICE: Obtain BAA with Anthropic before using real patient data in production.
 */

function generateAppealLetter(appeal, variant) {
  variant = variant || 0;
  const { payer, denialCode, denialReason, claimNumber, cptCodes, diagnosisCodes, dateOfService, amountDenied, appealType } = appeal;
  const cptString = Array.isArray(cptCodes) ? cptCodes.join(", ") : cptCodes;
  const dxString = Array.isArray(diagnosisCodes) ? diagnosisCodes.join(", ") : diagnosisCodes;

  const templates = [
    // Variant 0: Standard medical necessity appeal
    `[Facility Name]
[Facility Address]
[Provider NPI]

${new Date().toLocaleDateString()}

${payer} Appeals Department
[Payer Address]

RE: Appeal of Claim Denial
Claim Number: ${claimNumber}
Date of Service: ${dateOfService}
Denial Code: ${denialCode}
Amount Denied: $${amountDenied.toFixed(2)}

Dear Appeals Committee,

We are writing to formally appeal the denial of claim ${claimNumber} dated ${dateOfService} rendered at our Ambulatory Surgery Center. The claim was denied under code ${denialCode} with the stated reason: "${denialReason}".

The procedures in question (CPT codes ${cptString}) were medically necessary for the patient's diagnosis (ICD-10 codes ${dxString}). The clinical record supports the medical necessity of these interventions, which are standard of care for this patient's condition.

We respectfully request that ${payer} reconsider this denial in light of the attached clinical documentation. The procedures are appropriate, properly coded, and within the patient's covered benefits. We ask for immediate reversal of the denial and payment in the amount of $${amountDenied.toFixed(2)}.

Thank you for your prompt attention to this matter. We look forward to your favorable decision.

Sincerely,

[Provider Name]
[Provider Title]
[Contact Information]

Enclosures: Clinical documentation, CPT coding reference, medical records summary`,

    // Variant 1: Rebuttal focused on clinical evidence
    `[Facility Name]
[Facility Address]
[Date: ${new Date().toLocaleDateString()}]

TO: ${payer} Medical Review Department
RE: Appeal Request – Claim ${claimNumber} (${denialReason})

We appeal the denial of claim ${claimNumber} from ${dateOfService} under denial code ${denialCode}. This case involves CPT procedures ${cptString} for patient diagnoses ${dxString}, denied as not medically necessary or inappropriate.

However, our clinical evidence demonstrates otherwise. The attached medical records, imaging studies, and specialist consultation notes support the necessity and appropriateness of these procedures. The patient's condition required intervention beyond conservative management, which had previously failed.

Denial code ${denialCode} appears to be applied in error. The procedures are not duplicative, bundled, or excluded under the patient's plan. We request a detailed reconsideration by a peer-level clinician at your medical review committee.

The total amount in dispute is $${amountDenied.toFixed(2)}. We seek reversal of this denial and timely payment.

We are available for peer-to-peer discussion at your earliest convenience.

Respectfully submitted,

[Provider Name]
[Credentials]
[Facility NPI]

cc: Patient record, Claims file`,

    // Variant 2: Regulatory/compliance appeal (COB, deductible, modifier issues)
    `[Facility Name] Insurance Appeals
[Facility Address]
[Fax: [facility fax]]

${payer} Appeals & Grievances Department

CLAIM APPEAL – FORMAL WRITTEN REQUEST FOR RECONSIDERATION

Claim Number: ${claimNumber}
Date of Service: ${dateOfService}
Patient Account: [Patient ID]
Denial Reason Code: ${denialCode}
Current Claim Status: DENIED
Amount in Dispute: $${amountDenied.toFixed(2)}
Appeal Type: ${appealType}

REASON FOR APPEAL:
The denial of this claim under code ${denialCode} (${denialReason}) is not substantiated by the plan documents or applicable coding standards. The services rendered (CPT codes ${cptString}) for conditions ${dxString} are:

1. Medically appropriate and necessary for the patient's clinical presentation
2. Properly coded according to CPT guidelines and ASC standards
3. Within the patient's covered benefits on the date of service
4. Not subject to the stated denial reason based on attached documentation

REQUEST:
We respectfully request that ${payer} conduct a full administrative review of this claim and reverse the denial. All supporting documentation is attached, including clinical records, imaging, coding audit, and medical policy compliance analysis.

We expect written notification of appeal determination within 30 calendar days per regulatory requirements.

Thank you.

[Provider Name, NPI: [NPI]]
[Title]
[Contact: [phone/email]]

Attachments (5): Clinical summary, Medical records, Imaging report, Coding audit, Benefits verification`
  ];

  return templates[variant % 3];
}
