const StediMock = {
  // TODO: GET https://healthcare.us.stedi.com/2024-04-01/era
  fetchERADenials: async function() {
    await new Promise(r => setTimeout(r, 400));
    return {
      success: true,
      denials: [
        { claimId: "CLM-20431", carcCode: "CO-97", description: "Benefit included in another service", denialAmount: 4250.00 },
        { claimId: "CLM-20547", carcCode: "PR-1", description: "Deductible not met", denialAmount: 6800.00 },
        { claimId: "CLM-20623", carcCode: "CO-4", description: "Procedure code inconsistent with modifier", denialAmount: 3150.00 }
      ],
      retrievalDate: new Date().toISOString(),
      totalDeniedAmount: 14200.00
    };
  },

  // TODO: POST https://healthcare.us.stedi.com/2024-04-01/claims
  resubmitClaim: async function(claimId) {
    await new Promise(r => setTimeout(r, 400));
    return {
      success: true,
      referenceId: `RESUB-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      claimId: claimId,
      status: "Received for processing",
      processingTimeHours: 24
    };
  },

  // TODO: POST https://healthcare.us.stedi.com/2024-04-01/claim-status
  checkClaimStatus: async function(claimId) {
    await new Promise(r => setTimeout(r, 400));
    const statuses = ["Received", "In Processing", "Pending Review", "Approved", "Denied", "Paid"];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    return {
      success: true,
      claimId: claimId,
      currentStatus: randomStatus,
      lastUpdate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      payerCode: "AETNA",
      estimatedProcessingDays: Math.ceil(Math.random() * 14) + 1
    };
  },

  // TODO: POST https://healthcare.us.stedi.com/2024-04-01/attachments
  submitAttachment: async function(claimId, file) {
    await new Promise(r => setTimeout(r, 400));
    return {
      success: true,
      attachmentId: `ATT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      claimId: claimId,
      fileName: file && file.name ? file.name : "document.pdf",
      uploadTimestamp: new Date().toISOString(),
      status: "Received and queued for processing"
    };
  },

  // TODO: Stedi MCP tool — payer_search
  searchPayer: async function(payerName) {
    await new Promise(r => setTimeout(r, 400));
    const payerDatabase = {
      "Aetna": { payerId: "00111", name: "Aetna Health Inc.", endpoints: ["ERA", "270/271", "837"], rulesUrl: "aetna.com/provider" },
      "UnitedHealth": { payerId: "00001", name: "UnitedHealthcare", endpoints: ["ERA", "270/271", "837", "835"], rulesUrl: "unitedhealthcare.com/provider" },
      "Blue Shield": { payerId: "07283", name: "Blue Shield of California", endpoints: ["ERA", "270/271", "837"], rulesUrl: "blueshieldca.com/provider" },
      "Cigna": { payerId: "04453", name: "Cigna Health and Life Insurance Company", endpoints: ["ERA", "270/271", "837", "835"], rulesUrl: "cigna.com/provider" },
      "Humana": { payerId: "01101", name: "Humana Insurance Company", endpoints: ["ERA", "270/271", "837"], rulesUrl: "humana.com/provider" }
    };
    const result = payerDatabase[payerName] || { payerId: "99999", name: payerName, endpoints: [], rulesUrl: "unknown" };
    return {
      success: !!payerDatabase[payerName],
      payer: result,
      recordFound: !!payerDatabase[payerName]
    };
  },

  // TODO: Stedi MCP tool — eligibility_check
  runEligibilityCheck: async function(patientData) {
    await new Promise(r => setTimeout(r, 400));
    return {
      success: true,
      patientName: patientData.name || "Unknown",
      coverage: {
        active: true,
        planType: "PPO",
        effectiveDate: "2025-01-01",
        groupNumber: "GRP" + Math.random().toString(36).substring(2, 8).toUpperCase(),
        memberId: patientData.memberId || "MEM" + Math.random().toString(36).substring(2, 10).toUpperCase()
      },
      deductible: {
        individual: 1500.00,
        familyDeductible: 3000.00,
        metToDate: 750.00,
        remainingIndividual: 750.00
      },
      outOfPocket: {
        individual: 5000.00,
        metToDate: 2100.00,
        remainingIndividual: 2900.00
      },
      copay: 35.00,
      coinsurance: 0.20
    };
  }
};
