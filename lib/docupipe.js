(function(){
  const state = {
    modules: [],
    selectedModuleId: "",
    selectedFile: null,
    fileBase64: "",
    upload: null,
    standardize: null,
    standardization: null,
    preview: null,
    imported: null,
    importedHistory: [],
    importedExpanded: {},
    importedPreviewKey: ""
  };

  const $ = id => document.getElementById(id);
  const pretty = value => JSON.stringify(value || {}, null, 2);
  const IMPORTED_HISTORY_KEY = "docupipe-import-history-v1";

  function dashboardTargetForStedi(target) {
    if (target === "eligibility270") return "eligibility";
    if (target === "appealsFromEra") return "appeals";
    if (target === "claimAttachment275") return "attachments";
    if (target === "providerEnrollment") return "providers";
    return "claims";
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value == null || value === "" ? "waiting" : String(value);
  }

  function selectedModule() {
    return state.modules.find(module => module.id === state.selectedModuleId) || state.modules[0] || null;
  }

  function loadImportedHistory() {
    try {
      const raw = localStorage.getItem(IMPORTED_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === "object") : [];
    } catch {
      return [];
    }
  }

  function saveImportedHistory() {
    try {
      localStorage.setItem(IMPORTED_HISTORY_KEY, JSON.stringify(state.importedHistory));
    } catch {
      // Ignore storage failures. The history still renders for the current session.
    }
  }

  function entryKey(entry, index) {
    return `${entry.importedAt || "unknown"}:${entry.target || "unknown"}:${index}`;
  }

  function makeEntryId(target, importedAt) {
    return `${String(target || "record").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${String(importedAt || Date.now()).replace(/[^a-z0-9]+/gi, "").slice(-10)}`;
  }

  function activeModuleDraft() {
    const module = selectedModule() || {};
    const stediTarget = $("docuStediTarget") ? $("docuStediTarget").value : String(module.stediTarget || "professionalClaim837P");
    return {
      ...module,
      docupipeSchemaId: $("docuSchemaId") ? $("docuSchemaId").value.trim() : String(module.docupipeSchemaId || ""),
      stediTarget,
      dashboardTarget: dashboardTargetForStedi(stediTarget),
      stediEndpoint: $("docuEndpoint") ? $("docuEndpoint").value.trim() : String(module.stediEndpoint || ""),
      guidelines: $("docuGuidelines") ? $("docuGuidelines").value.trim() : String(module.guidelines || ""),
      jsonSchema: parseJsonMaybe($("docuSchema") ? $("docuSchema").value : "", module.jsonSchema || {}),
      fieldMappings: parseJsonMaybe($("docuMapping") ? $("docuMapping").value : "", module.fieldMappings || [])
    };
  }

  async function api(path, options) {
    const method = String(options && options.method ? options.method : "GET").toUpperCase();
    const response = await fetch(path, {
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const hint = payload.hint || payload.details && payload.details.hint;
      const message = `${method} ${path} failed with ${response.status}${payload.error ? `: ${payload.error}` : ""}${payload.message ? `: ${payload.message}` : ""}${hint ? ` ${hint}` : ""}`;
      const error = new Error(message);
      error.status = response.status;
      error.details = payload;
      error.path = path;
      error.method = method;
      throw error;
    }
    return payload;
  }

  async function loadModules() {
    const result = await api("/api/modules");
    state.modules = result.modules || [];
    state.selectedModuleId = state.selectedModuleId || (state.modules[0] && state.modules[0].id) || "";
    renderModuleSelect();
    populateEditor();
    setText("docuMode", "mock");
  }

  function renderModuleSelect() {
    const select = $("docuModuleSelect");
    if (!select) return;
    select.innerHTML = state.modules.map(module => `<option value="${escapeAttr(module.id)}">${escapeHtml(module.name)}</option>`).join("");
    select.value = state.selectedModuleId;
  }

  function populateEditor() {
    const module = selectedModule();
    if (!module) return;
    const stediTarget = module.stediTarget || "professionalClaim837P";
    $("docuModuleName").value = module.name || "";
    $("docuSchemaId").value = module.docupipeSchemaId || "";
    $("docuStediTarget").value = stediTarget;
    $("docuDashboardTarget").value = dashboardTargetForStedi(stediTarget);
    $("docuEndpoint").value = module.stediEndpoint || "";
    $("docuGuidelines").value = module.guidelines || "";
    $("docuSchema").value = pretty(module.jsonSchema);
    $("docuMapping").value = pretty(module.fieldMappings || []);
    setText("docuSchemaState", module.docupipeSchemaId ? `saved: ${module.docupipeSchemaId}` : "draft");
  }

  function collectModule(duplicate) {
    const current = selectedModule() || {};
    const name = $("docuModuleName").value.trim() || "Untitled module";
    let jsonSchema;
    let fieldMappings;
    try {
      jsonSchema = JSON.parse($("docuSchema").value || "{}");
      fieldMappings = JSON.parse($("docuMapping").value || "[]");
    } catch (error) {
      toast("Schema or mapping JSON is invalid.");
      throw error;
    }
    return {
      id: duplicate ? `${slug(name)}-${Date.now().toString(36).slice(-4)}` : current.id,
      name: duplicate ? `${name} copy` : name,
      enabled: true,
      docupipeSchemaId: $("docuSchemaId").value.trim(),
      stediTarget: $("docuStediTarget").value,
      dashboardTarget: dashboardTargetForStedi($("docuStediTarget").value),
      stediEndpoint: $("docuEndpoint").value.trim(),
      guidelines: $("docuGuidelines").value.trim(),
      jsonSchema,
      fieldMappings: Array.isArray(fieldMappings) ? fieldMappings : []
    };
  }

  async function saveModule() {
    const module = collectModule(false);
    const result = await api(`/api/modules/${encodeURIComponent(module.id)}`, {
      method: "PUT",
      body: JSON.stringify(module)
    });
    state.modules = state.modules.map(item => item.id === result.module.id ? result.module : item);
    state.selectedModuleId = result.module.id;
    renderModuleSelect();
    populateEditor();
    toast("Module saved.");
  }

  async function duplicateModule() {
    const module = collectModule(true);
    const result = await api("/api/modules", {
      method: "POST",
      body: JSON.stringify(module)
    });
    state.modules.push(result.module);
    state.selectedModuleId = result.module.id;
    renderModuleSelect();
    populateEditor();
    toast("Module duplicated.");
  }

  function slug(value) {
    return String(value || "module").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "module";
  }

  function parseJsonMaybe(value, fallback) {
    try {
      const parsed = JSON.parse(String(value || ""));
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function schemaPreset(target) {
    if (target === "eligibility270") {
      return {
        name: "Eligibility Schema",
        stediEndpoint: "/change/medicalnetwork/eligibility/v3",
        guidelines: "Extract subscriber, payer, plan, group number, service type, and coverage details from the insurance card or benefits document. Keep IDs exact and prefer values printed on the primary card face.",
        jsonSchema: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "description": "Extract insurance card and benefits data for a Stedi 270 eligibility request.",
          "type": "object",
          "properties": {
            "documentType": { "type": "string", "description": "Document category.", "enum": ["eligibility"] },
            "subscriber": {
              "type": "object",
              "description": "Subscriber details visible on the source document.",
              "properties": {
                "fullName": { "type": "string", "description": "Subscriber name exactly as shown." },
                "dateOfBirth": { "type": "string", "description": "Date of birth in YYYY-MM-DD format." },
                "memberId": { "type": "string", "description": "Insurance member ID." },
                "groupNumber": { "type": "string", "description": "Group number." }
              }
            },
            "payer": {
              "type": "object",
              "description": "Payer or plan sponsor details.",
              "properties": {
                "name": { "type": "string", "description": "Payer name." },
                "stediId": { "type": "string", "description": "Stedi payer ID." },
                "phone": { "type": "string", "description": "Eligibility phone number." }
              }
            },
            "plan": {
              "type": "object",
              "description": "Plan benefit details.",
              "properties": {
                "name": { "type": "string", "description": "Plan name." },
                "type": { "type": "string", "description": "Plan type." },
                "effectiveDate": { "type": "string", "description": "Plan start date." }
              }
            },
            "encounter": {
              "type": "object",
              "description": "Encounter context used for eligibility inquiry.",
              "properties": {
                "dateOfService": { "type": "string", "description": "Date of service." },
                "serviceTypeCodes": { "type": "array", "items": { "type": "string", "description": "Service type code." }, "description": "Service type codes." }
              }
            }
          }
        },
        fieldMappings: [
          { source: "subscriber.memberId", dashboard: "eligibility.memberId", stedi: "subscriber.memberId" },
          { source: "payer.name", dashboard: "eligibility.payer", stedi: "tradingPartnerServiceId" },
          { source: "plan.name", dashboard: "eligibility.plan", stedi: "subscriber.planName" }
        ]
      };
    }
    if (target === "appealsFromEra") {
      return {
        name: "Appeal Schema",
        stediEndpoint: "/change/medicalnetwork/era/v3",
        guidelines: "Extract denial and remittance details that support an appeal letter. Preserve denial codes, payment trace numbers, dates, and reason language.",
        jsonSchema: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "description": "Extract denial and ERA detail for appeal generation.",
          "type": "object",
          "properties": {
            "documentType": { "type": "string", "description": "Document category.", "enum": ["era", "denial"] },
            "payer": {
              "type": "object",
              "properties": {
                "name": { "type": "string", "description": "Payer name." },
                "paymentTraceNumber": { "type": "string", "description": "Payment trace or EFT number." }
              }
            },
            "denials": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "patientName": { "type": "string", "description": "Patient name." },
                  "claimNumber": { "type": "string", "description": "Claim number." },
                  "payerClaimNumber": { "type": "string", "description": "Payer claim number." },
                  "carcCode": { "type": "string", "description": "CARC code." },
                  "rarcCodes": { "type": "array", "items": { "type": "string", "description": "RARC code." }, "description": "RARC codes." },
                  "reason": { "type": "string", "description": "Denial reason language." },
                  "deniedAmount": { "type": "number", "description": "Denied dollar amount." }
                }
              }
            }
          }
        },
        fieldMappings: [
          { source: "payer.paymentTraceNumber", dashboard: "appeals.trace", stedi: "paymentTraceNumber" },
          { source: "denials", dashboard: "appeals.items", stedi: "denialLines" }
        ]
      };
    }
    if (target === "claimAttachment275") {
      return {
        name: "Attachment Schema",
        stediEndpoint: "/change/medicalnetwork/claimattachments/v3",
        guidelines: "Extract attachment request metadata, claim identifiers, and the text of the supporting document. Keep references exact so the attachment can be matched to the claim.",
        jsonSchema: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "description": "Extract claim attachment request details.",
          "type": "object",
          "properties": {
            "documentType": { "type": "string", "description": "Document category.", "enum": ["attachment"] },
            "claim": {
              "type": "object",
              "properties": {
                "claimNumber": { "type": "string", "description": "Claim number." },
                "payerClaimNumber": { "type": "string", "description": "Payer claim number." }
              }
            },
            "attachment": {
              "type": "object",
              "properties": {
                "type": { "type": "string", "description": "Attachment type." },
                "description": { "type": "string", "description": "Why the attachment is being sent." }
              }
            }
          }
        },
        fieldMappings: [
          { source: "claim.claimNumber", dashboard: "attachments.claimNumber", stedi: "claimNumber" },
          { source: "attachment.type", dashboard: "attachments.type", stedi: "attachmentType" }
        ]
      };
    }
    if (target === "providerEnrollment") {
      return {
        name: "Provider Enrollment Schema",
        stediEndpoint: "/change/enrollment/provider/v1",
        guidelines: "Extract provider identity, taxonomy, practice location, credentialing status, and enrollment identifiers. Keep NPI, TIN, and location details exact.",
        jsonSchema: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "description": "Extract provider enrollment packet details.",
          "type": "object",
          "properties": {
            "documentType": { "type": "string", "description": "Document category.", "enum": ["providerEnrollment"] },
            "provider": {
              "type": "object",
              "properties": {
                "name": { "type": "string", "description": "Provider or practice name." },
                "npi": { "type": "string", "description": "NPI." },
                "taxId": { "type": "string", "description": "Tax ID or EIN." },
                "taxonomyCode": { "type": "string", "description": "Taxonomy code." }
              }
            },
            "location": {
              "type": "object",
              "properties": {
                "addressLine1": { "type": "string", "description": "Street address." },
                "city": { "type": "string", "description": "City." },
                "state": { "type": "string", "description": "State." },
                "postalCode": { "type": "string", "description": "Postal code." }
              }
            },
            "enrollment": {
              "type": "object",
              "properties": {
                "status": { "type": "string", "description": "Enrollment status." },
                "effectiveDate": { "type": "string", "description": "Enrollment effective date." }
              }
            }
          }
        },
        fieldMappings: [
          { source: "provider.npi", dashboard: "providers.npi", stedi: "billingProvider.npi" },
          { source: "provider.taxId", dashboard: "providers.taxId", stedi: "billingProvider.taxId" }
        ]
      };
    }
    return {
      name: "Professional Claim Schema",
      stediEndpoint: "/change/medicalnetwork/professionalclaims/v3/submission",
      guidelines: "Extract patient, payer, provider, claim, service line, and diagnosis details from professional claim documents. Prefer printed values and keep codes exact.",
      jsonSchema: {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "description": "Extract ASC professional claim data for a Stedi 837P style claim draft.",
        "type": "object",
        "properties": {
          "documentType": { "type": "string", "description": "Document category.", "enum": ["claim"] },
          "patient": {
            "type": "object",
            "properties": {
              "fullName": { "type": "string", "description": "Patient name exactly as shown." },
              "dateOfBirth": { "type": "string", "description": "Date of birth." },
              "memberId": { "type": "string", "description": "Subscriber/member ID." }
            }
          },
          "payer": {
            "type": "object",
            "properties": {
              "name": { "type": "string", "description": "Payer name." },
              "stediId": { "type": "string", "description": "Stedi payer ID." }
            }
          },
          "provider": {
            "type": "object",
            "properties": {
              "organizationName": { "type": "string", "description": "Billing organization or facility name." },
              "npi": { "type": "string", "description": "Provider NPI." },
              "taxId": { "type": "string", "description": "Tax ID or EIN." }
            }
          },
          "claim": {
            "type": "object",
            "properties": {
              "claimNumber": { "type": "string", "description": "Internal claim number or control number." },
              "dateOfService": { "type": "string", "description": "Primary date of service." },
              "totalChargeAmount": { "type": "number", "description": "Total billed amount." }
            }
          },
          "serviceLines": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "cptCode": { "type": "string", "description": "CPT or HCPCS procedure code." },
                "units": { "type": "integer", "description": "Service units." },
                "chargeAmount": { "type": "number", "description": "Line charge amount." }
              }
            }
          },
          "diagnosisCodes": {
            "type": "array",
            "items": { "type": "string", "description": "ICD-10 code." }
          }
        }
      },
      fieldMappings: [
        { source: "patient.fullName", dashboard: "claims.patient", stedi: "subscriber" },
        { source: "provider.npi", dashboard: "claims.providerFull", stedi: "billingProvider.npi" },
        { source: "claim.totalChargeAmount", dashboard: "claims.billed", stedi: "claimInformation.claimChargeAmount" }
      ]
    };
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
      reader.onerror = () => reject(reader.error || new Error("File read failed."));
      reader.readAsDataURL(file);
    });
  }

  async function uploadDocument() {
    const module = activeModuleDraft();
    if (!module) {
      toast("Choose a module first.");
      return null;
    }
    const fileInput = $("docuFile");
    const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : state.selectedFile;
    if (!file) {
      toast("Choose a source file first.");
      return null;
    }
    state.selectedFile = file;
    state.fileBase64 = await readFile(file);
    setText("docuDocumentId", "uploading");
    const result = await api("/api/docupipe/upload", {
      method: "POST",
      body: JSON.stringify({
        moduleId: module.id,
        schemaId: module.docupipeSchemaId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileBase64: state.fileBase64,
        metadata: { source: "dashboard-upload" }
      })
    });
    state.upload = result;
    setText("docuMode", result.mode || "mock");
    setText("docuDocumentId", result.documentId);
    setText("docuJobId", result.jobId || "parsed");
    toast("Upload complete.");
    return result;
  }

  async function standardizeDocument() {
    const module = activeModuleDraft();
    if (!module) {
      toast("Choose a module first.");
      return null;
    }
    if (!state.upload || !state.upload.documentId) {
      await uploadDocument();
    }
    if (!state.upload || !state.upload.documentId) return null;
    setText("docuJobId", "standardizing");
    let result;
    try {
      result = await api("/api/docupipe/standardize", {
        method: "POST",
        body: JSON.stringify({
          moduleId: module.id,
          schemaId: module.docupipeSchemaId,
          target: module.stediTarget,
          guidelines: module.guidelines,
          documentId: state.upload.documentId,
          effortLevel: "standard"
        })
      });
    } catch (error) {
      if (Number(error.status) === 402) {
        setText("docuJobId", "DocuPipe credits required");
        setText("docuStandardizationId", "not created");
        toast("DocuPipe standardization needs credits. For a free demo, set APP_MODE=mock in Render.");
      }
      throw error;
    }
    state.standardize = result;
    setText("docuMode", result.mode || "mock");
    setText("docuJobId", result.jobId);
    setText("docuStandardizationId", result.standardizationId || first(result.standardizationIds) || "polling");
    await pollJob(result.jobId, result.standardizationId || first(result.standardizationIds));
    return result;
  }

  async function pollJob(jobId, knownStandardizationId) {
    if (!jobId && knownStandardizationId) {
      await loadStandardization(knownStandardizationId);
      return;
    }
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const job = await api(`/api/docupipe/jobs/${encodeURIComponent(jobId)}`);
        setText("docuJobId", `${job.jobId || jobId} ${job.status || ""}`.trim());
        const standardizationId = knownStandardizationId || job.standardizationId || first(job.standardizationIds);
        if (standardizationId && ["completed", "succeeded", "success"].includes(String(job.status || "").toLowerCase())) {
          if (await loadStandardization(standardizationId)) return;
        }
        if (standardizationId && job.mode === "mock") {
          await loadStandardization(standardizationId);
          return;
        }
      } catch (error) {
        const status = Number(error && error.status);
        const notFound = status === 404 || /not found/i.test(String(error.message || "")) || /not found/i.test(JSON.stringify(error.details || {}));
        if (!notFound) throw error;
      }
      await wait(700);
    }
    toast("Job is still processing. Try preview again shortly.");
  }

  async function loadStandardization(standardizationId) {
    for (let attempt = 0; attempt < 24; attempt++) {
      try {
        const result = await api(`/api/docupipe/standardizations/${encodeURIComponent(standardizationId)}`);
        state.standardization = result;
        setText("docuStandardizationId", standardizationId);
        $("docuJsonOut").textContent = pretty(result.data || result);
        toast("Standardization loaded.");
        await previewStedi();
        return true;
      } catch (error) {
        const status = Number(error && error.status);
        const notFound = status === 404 || /not found/i.test(String(error.message || "")) || /not found/i.test(JSON.stringify(error.details || {}));
        if (!notFound) {
          throw error;
        }
        setText("docuStandardizationId", `${standardizationId} waiting`);
        await wait(1000);
      }
    }
    toast("Standardization is not ready yet. Try again shortly.");
    return false;
  }

  async function previewStedi() {
    const module = activeModuleDraft();
    if (!module) {
      toast("Choose a module first.");
      return null;
    }
    if (!state.standardization) {
      await standardizeDocument();
    }
    if (!state.standardization) return null;
    const result = await api("/api/stedi/preview", {
      method: "POST",
      body: JSON.stringify({
        moduleId: module.id,
        target: module.stediTarget,
        standardization: state.standardization
      })
    });
    state.preview = result;
    $("docuStediOut").textContent = pretty(result);
    renderWarnings(result.warnings || []);
    toast("Stedi preview ready.");
    await autoImportPreview(result);
    return result;
  }

  function renderWarnings(warnings) {
    const box = $("docuWarnings");
    if (!box) return;
    if (!warnings.length) {
      box.innerHTML = '<div class="ok-item">No review flags.</div>';
      return;
    }
    box.innerHTML = warnings.map(item => `<div class="warn-item">${escapeHtml(item)}</div>`).join("");
  }

  async function insertPreview() {
    if (!state.preview) {
      await previewStedi();
    }
    if (!state.preview) return;
    await commitPreviewToDashboard(state.preview, { force: false, auto: false });
  }

  async function autoImportPreview(preview) {
    if (!preview || !preview.dashboardRecord) return;
    const key = previewKey(preview);
    if (!key || state.importedPreviewKey === key) return;
    await commitPreviewToDashboard(preview, { force: false, auto: true });
  }

  async function commitPreviewToDashboard(preview, options) {
    const { force = false, auto = false } = options || {};
    const target = preview.target;
    const record = preview.dashboardRecord;
    if (!record) {
      toast("No dashboard record was mapped.");
      return;
    }
    const key = previewKey(preview);
    if (!force && key && state.importedPreviewKey === key) {
      if (!auto) toast("This extraction was already added to the dashboard.");
      return;
    }
    if (target === "professionalClaim837P") insertClaim(record);
    else if (target === "eligibility270") insertEligibility(record);
    else if (target === "appealsFromEra") insertAppeal(record);
    else if (target === "claimAttachment275") insertAttachment(record);
    else if (target === "providerEnrollment") insertProvider(record);
    else toast("No dashboard insertion rule exists for this target.");
    state.imported = {
      target,
      record,
      preview,
      importedAt: new Date().toISOString()
    };
    state.importedHistory.unshift({
      target,
      record,
      preview,
      importedAt: state.imported.importedAt,
      entryId: makeEntryId(target, state.imported.importedAt)
    });
    state.importedPreviewKey = key;
    saveImportedHistory();
    renderImportedState();
    toast(auto
      ? preview.warnings && preview.warnings.length
        ? "Imported partial data to dashboard."
        : "Imported extracted data to dashboard."
      : "Imported to dashboard.");
  }

  function insertClaim(record) {
    claims.unshift(record);
    T.claims.data = claims;
    T.claims.page = 0;
    updateClaimKpis();
    renderTable("claims");
    showSection("claims");
    openDrawer("claims", 0);
    toast("Claim draft added.");
  }

  function insertEligibility(record) {
    eligibility.unshift(record);
    T.eligibility.data = eligibility;
    T.eligibility.page = 0;
    renderTable("eligibility");
    const sub = $("sub-eligibility");
    if (sub) sub.textContent = `${eligibility.length} checks · click any row for the full 271 benefit detail`;
    showSection("eligibility");
    openDrawer("eligibility", 0);
    toast("Eligibility record added.");
  }

  function insertAppeal(record) {
    APPEALS_DATA.unshift(record);
    T.appeals.data = APPEALS_DATA;
    renderAppealStats();
    renderAppealsTable();
    showSection("appeals");
    openDrawer("appeals", Math.max(0, APPEALS_DATA.indexOf(record)));
    toast("Appeal added.");
  }

  function insertAttachment(record) {
    attachments.unshift(record);
    T.attachments.data = attachments;
    T.attachments.page = 0;
    renderTable("attachments");
    const sub = $("sub-attachments");
    if (sub) sub.textContent = `${attachments.length} open and historical requests · click a row for detail`;
    showSection("attachments");
    openDrawer("attachments", 0);
    toast("Attachment request added.");
  }

  function insertProvider(record) {
    providers.unshift(record);
    T.providers.data = providers;
    T.providers.page = 0;
    renderTable("providers");
    const sub = $("sub-providers");
    if (sub) sub.textContent = `${providers.length} credentialed providers across all facilities. Managed separately from locations. Click a row for detail.`;
    showSection("providers");
    openDrawer("providers", 0);
    toast("Provider added.");
  }

  function printPacket(title, html) {
    const win = window.open("", "_blank");
    if (!win) {
      toast("Popup blocked. Allow popups for print packets.");
      return;
    }
    win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
      body{font-family:Inter,Arial,sans-serif;color:#111;margin:32px;line-height:1.45}
      h1{font-size:24px;margin:0 0 8px} h2{font-size:16px;margin:24px 0 8px}
      .meta{font-size:12px;color:#555;margin-bottom:24px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin:12px 0}
      th,td{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}
      pre{white-space:pre-wrap;background:#f6f6f6;border:1px solid #ddd;padding:12px;font-size:11px}
      .section{break-inside:avoid;margin-bottom:18px}
      @page{margin:.55in}
    </style></head><body><h1>${escapeHtml(title)}</h1><div class="meta">Culver City Surgical DocuPipe clone · ${new Date().toLocaleString()}</div>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  }

  function printModules() {
    const html = state.modules.map(module => `<div class="section"><h2>${escapeHtml(module.name)}</h2>
      <table><tbody>
        <tr><th>ID</th><td>${escapeHtml(module.id)}</td></tr>
        <tr><th>Stedi target</th><td>${escapeHtml(module.stediTarget)}</td></tr>
        <tr><th>Dashboard target</th><td>${escapeHtml(module.dashboardTarget)}</td></tr>
        <tr><th>Endpoint</th><td>${escapeHtml(module.stediEndpoint)}</td></tr>
      </tbody></table>
      <h2>Guidelines</h2><pre>${escapeHtml(module.guidelines || "")}</pre>
      <h2>Schema</h2><pre>${escapeHtml(pretty(module.jsonSchema))}</pre>
      <h2>Mappings</h2><pre>${escapeHtml(pretty(module.fieldMappings || []))}</pre></div>`).join("");
    printPacket("DocuPipe module catalog", html || "<p>No modules loaded.</p>");
  }

  function printExtraction() {
    printPacket("DocuPipe extraction", `<pre>${escapeHtml(pretty(state.standardization || {}))}</pre>`);
  }

  function printPreview() {
    printPacket("Stedi payload preview", `<pre>${escapeHtml(pretty(state.preview || {}))}</pre>`);
  }

  function printAppeals() {
    const rows = APPEALS_DATA.map(a => `<tr><td>${escapeHtml(a.id)}</td><td>${escapeHtml(a.patientName)}</td><td>${escapeHtml(a.payer)}</td><td>${escapeHtml(a.denialCode)}</td><td>${escapeHtml(a.appealStatus)}</td><td>${escapeHtml(a.deadlineDate)}</td><td>${escapeHtml(usd(a.amountDenied))}</td></tr>`).join("");
    const letters = APPEALS_DATA.slice(0, 5).map(a => `<div class="section"><h2>${escapeHtml(a.id)} · ${escapeHtml(a.patientName)}</h2><pre>${escapeHtml(a.appealLetterDraft || "")}</pre></div>`).join("");
    printPacket("Appeals packet", `<table><thead><tr><th>ID</th><th>Patient</th><th>Payer</th><th>Code</th><th>Status</th><th>Deadline</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>${letters}`);
  }

  function printDrawer() {
    if (!drawer.classList.contains("open")) {
      toast("Open a detail drawer first.");
      return;
    }
    printPacket("Dashboard detail record", `<div class="section">${drawer.innerHTML}</div>`);
  }

  function printSummary() {
    const summary = [
      ["Claims", claims.length],
      ["Eligibility checks", eligibility.length],
      ["ERAs", eras.length],
      ["Attachments", attachments.length],
      ["Appeals", APPEALS_DATA.length],
      ["Providers", providers.length],
      ["Enrollments", enrollments.length],
      ["Transactions", txns.length]
    ];
    const rows = summary.map(row => `<tr><th>${escapeHtml(row[0])}</th><td>${row[1]}</td></tr>`).join("");
    printPacket("Dashboard summary", `<table><tbody>${rows}</tbody></table>`);
  }

  function renderImportedState() {
    const box = $("docuImportedOut");
    const history = $("docuImportHistory");
    const badge = $("docuImportState");
    const latest = state.imported || state.importedHistory[0] || null;
    if (!latest) {
      if (box) box.innerHTML = "<div class='empty-note'>No record imported yet.</div>";
      if (badge) badge.textContent = "none";
      if (history) history.innerHTML = renderImportedHistory();
      return;
    }
    const partial = Array.isArray(latest.preview && latest.preview.warnings) && latest.preview.warnings.length > 0;
    const latestKey = latest.entryId || `${latest.importedAt}:${latest.target}`;
    const expanded = state.importedExpanded[latestKey] !== undefined ? state.importedExpanded[latestKey] : true;
    if (badge) badge.textContent = `${partial ? "partial" : "done"}: ${latest.target}`;
    if (box) box.innerHTML = renderImportedEntry(latest, partial, expanded, latestKey);
    if (history) history.innerHTML = renderImportedHistory();
  }

  function renderImportedEntry(entry, partial, expanded, key) {
    const warnings = entry.preview && Array.isArray(entry.preview.warnings) ? entry.preview.warnings : [];
    const entryKeyValue = key || entry.entryId || `${entry.importedAt}:${entry.target}`;
    return `
      <div class="import-summary ${expanded ? "open" : ""}" data-import-key="${escapeAttr(entryKeyValue)}">
        <button type="button" class="import-summary-toggle" data-import-toggle="${escapeAttr(entryKeyValue)}" aria-expanded="${expanded ? "true" : "false"}">
          <div class="import-summary-head">
            <div>
              <strong>${escapeHtml(entry.target)}</strong>
              <span>${escapeHtml(entry.importedAt)}</span>
            </div>
            <span class="pill ${partial ? "warn" : "ok"}">${partial ? "partial" : "complete"}</span>
          </div>
        </button>
        <div class="import-summary-body" ${expanded ? "" : "hidden"}>
          <pre>${escapeHtml(pretty({
          importedAt: entry.importedAt,
          target: entry.target,
          partial,
          warnings,
          record: entry.record
          }))}</pre>
        </div>
      </div>
    `;
  }

  function renderImportedHistory() {
    if (!state.importedHistory.length) {
      return "<div class='empty-note'>No imported history yet.</div>";
    }
    return `
      <div class="docu-history-list">
        ${state.importedHistory.map((entry, index) => {
          const partial = Array.isArray(entry.preview && entry.preview.warnings) && entry.preview.warnings.length > 0;
          const key = entry.entryId || entryKey(entry, index);
          const expanded = state.importedExpanded[key] !== undefined ? state.importedExpanded[key] : false;
          return renderImportedEntry(entry, partial, expanded, key);
        }).join("")}
      </div>
    `;
  }

  function previewKey(preview) {
    const std = state.standardization && state.standardization.standardizationId ? state.standardization.standardizationId : "";
    const recordId = preview && preview.dashboardRecord && preview.dashboardRecord.id ? preview.dashboardRecord.id : "";
    const target = preview && preview.target ? preview.target : "";
    return [target, std, recordId].filter(Boolean).join(":");
  }

  function bind(id, event, handler) {
    const el = $(id);
    if (el) el.addEventListener(event, async e => {
      try {
        await handler(e);
      } catch (error) {
        console.error(error);
        toast(error.message || "Action failed.");
      }
    });
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function first(values) {
    return Array.isArray(values) ? values.find(Boolean) : null;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function init() {
    state.importedHistory = loadImportedHistory();
    bind("docuModuleSelect", "change", e => {
      state.selectedModuleId = e.target.value;
      populateEditor();
    });
    bind("docuStediTarget", "change", () => {
      const dashboardTarget = $("docuDashboardTarget");
      if (dashboardTarget) dashboardTarget.value = dashboardTargetForStedi($("docuStediTarget").value);
    });
    bind("docuFile", "change", e => {
      state.selectedFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
      if (state.selectedFile) toast(`Selected ${state.selectedFile.name}.`);
    });
    bind("docuUploadBtn", "click", uploadDocument);
    bind("docuStandardizeBtn", "click", standardizeDocument);
    bind("docuPreviewBtn", "click", previewStedi);
    bind("docuInsertBtn", "click", insertPreview);
    bind("docuViewImportedBtn", "click", () => {
      renderImportedState();
      const panel = $("docuImportHistory") || $("docuImportedOut");
      if (panel && typeof panel.scrollIntoView === "function") {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (!state.importedHistory.length) {
        toast("No imported data to show.");
        return;
      }
      toast(`Showing ${state.importedHistory.length} imported item${state.importedHistory.length === 1 ? "" : "s"}.`);
    });
    bind("docuSaveModuleBtn", "click", saveModule);
    bind("docuNewModuleBtn", "click", duplicateModule);
    bind("printModulesBtn", "click", printModules);
    bind("printExtractionBtn", "click", printExtraction);
    bind("printPreviewBtn", "click", printPreview);
    bind("printAppealsBtn", "click", printAppeals);
    bind("printDrawerBtn", "click", printDrawer);
    bind("printSummaryBtn", "click", printSummary);
    bindImportToggle("docuImportedOut");
    bindImportToggle("docuImportHistory");
    loadModules().catch(error => {
      console.error(error);
      toast("DocuPipe modules failed to load.");
    });
    renderImportedState();
  }

  window.DocuPipeDashboard = {
    state,
    loadModules,
    uploadDocument,
    standardizeDocument,
    previewStedi,
    insertPreview,
    printModules,
    printExtraction,
    printPreview,
    renderImportedState
  };

  function bindImportToggle(id) {
    const root = $(id);
    if (!root || root.dataset.importToggleBound === "1") return;
    root.dataset.importToggleBound = "1";
    root.addEventListener("click", e => {
      const target = e.target.closest("[data-import-toggle]");
      if (!target) return;
      const key = target.getAttribute("data-import-toggle");
      if (!key) return;
      state.importedExpanded[key] = !state.importedExpanded[key];
      renderImportedState();
    });
  }

  init();
})();
