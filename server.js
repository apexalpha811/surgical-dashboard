const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8742);
const MODULES_FILE = path.join(ROOT, "data", "docupipe-modules.json");
const DASHBOARD_RECORDS_FILE = path.join(ROOT, "data", "dashboard-records.json");
const mockDocuments = new Map();
const mockJobs = new Map();
const mockStandardizations = new Map();

loadEnvFile(path.join(ROOT, ".env"));

const config = {
  appMode: process.env.APP_MODE || "mock",
  docupipeApiKey: process.env.DOCUPIPE_API_KEY || "",
  stediApiKey: process.env.STEDI_API_KEY || "",
  supabaseUrl: trimSlash(process.env.SUPABASE_URL || ""),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  docupipeBaseUrl: trimSlash(process.env.DOCUPIPE_BASE_URL || "https://app.docupipe.ai"),
  stediHealthcareBaseUrl: trimSlash(process.env.STEDI_HEALTHCARE_BASE_URL || "https://healthcare.us.stedi.com/2024-04-01"),
  stediClaimsBaseUrl: trimSlash(process.env.STEDI_CLAIMS_BASE_URL || "https://claims.us.stedi.com/2025-03-07"),
  stediEnrollmentsBaseUrl: trimSlash(process.env.STEDI_ENROLLMENTS_BASE_URL || "https://enrollments.us.stedi.com/2024-09-01"),
  stediPayersBaseUrl: trimSlash(process.env.STEDI_PAYERS_BASE_URL || "https://payers.us.stedi.com/2024-04-01"),
  stediCoreBaseUrl: trimSlash(process.env.STEDI_CORE_BASE_URL || "https://core.us.stedi.com/2023-08-01")
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function isLive() {
  return config.appMode === "live";
}

function hasSupabase() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}

function readFileModules() {
  return JSON.parse(fs.readFileSync(MODULES_FILE, "utf8")).map(normalizeModule);
}

function writeFileModules(modules) {
  fs.writeFileSync(MODULES_FILE, `${JSON.stringify(modules, null, 2)}\n`);
}

async function readModules() {
  if (!hasSupabase()) return readFileModules();
  const rows = await supabaseRequest("/docupipe_modules?select=*&order=id.asc");
  if (Array.isArray(rows) && rows.length) return rows.map(moduleFromRow).map(normalizeModule);
  const seed = readFileModules();
  if (seed.length) await upsertModules(seed);
  return seed;
}

async function createModule(module) {
  if (!hasSupabase()) {
    const modules = readFileModules();
    modules.push(module);
    writeFileModules(modules);
    return module;
  }
  const rows = await supabaseRequest("/docupipe_modules", {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([moduleToRow(module)])
  });
  return moduleFromRow(Array.isArray(rows) ? rows[0] : rows);
}

async function updateModule(moduleId, module) {
  if (!hasSupabase()) {
    const modules = readFileModules();
    const index = modules.findIndex(item => item.id === moduleId);
    if (index < 0) return null;
    modules[index] = normalizeModule({ ...modules[index], ...module, id: moduleId });
    writeFileModules(modules);
    return modules[index];
  }
  const next = normalizeModule({ ...module, id: moduleId });
  const rows = await supabaseRequest(`/docupipe_modules?id=eq.${encodeURIComponent(moduleId)}`, {
    method: "PATCH",
    headers: { "Prefer": "return=representation" },
    body: JSON.stringify(moduleToRow(next))
  });
  return Array.isArray(rows) && rows[0] ? moduleFromRow(rows[0]) : null;
}

async function deleteModule(moduleId) {
  if (!hasSupabase()) {
    const modules = readFileModules();
    const next = modules.filter(item => item.id !== moduleId);
    if (next.length === modules.length) return false;
    writeFileModules(next);
    return true;
  }
  const rows = await supabaseRequest(`/docupipe_modules?id=eq.${encodeURIComponent(moduleId)}`, {
    method: "DELETE",
    headers: { "Prefer": "return=representation" }
  });
  return Array.isArray(rows) && rows.length > 0;
}

async function upsertModules(modules) {
  if (!hasSupabase()) {
    writeFileModules(modules);
    return modules;
  }
  const rows = await supabaseRequest("/docupipe_modules", {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(modules.map(moduleToRow))
  });
  return Array.isArray(rows) ? rows.map(moduleFromRow) : [];
}

async function saveImportRecord(body) {
  if (!hasSupabase()) return { mode: "fileless", saved: false };
  const preview = body.preview || {};
  const row = {
    module_id: String(body.moduleId || preview.module && preview.module.id || ""),
    document_id: String(body.documentId || body.standardization && body.standardization.documentId || ""),
    standardization_id: String(body.standardizationId || body.standardization && body.standardization.standardizationId || ""),
    target: String(body.target || preview.target || ""),
    status: String(body.status || "imported"),
    extracted_json: body.extracted || body.standardization || {},
    stedi_preview_json: preview,
    dashboard_record_json: body.record || preview.dashboardRecord || {},
    warnings: Array.isArray(body.warnings) ? body.warnings : Array.isArray(preview.warnings) ? preview.warnings : []
  };
  const rows = await supabaseRequest("/docupipe_imports", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: JSON.stringify(row)
  });
  return { mode: "supabase", saved: true, import: Array.isArray(rows) ? rows[0] : rows };
}

async function readDashboardRecords() {
  if (!hasSupabase()) {
    try {
      if (!fs.existsSync(DASHBOARD_RECORDS_FILE)) return [];
      const content = fs.readFileSync(DASHBOARD_RECORDS_FILE, "utf8");
      const records = JSON.parse(content);
      return Array.isArray(records) ? records : [];
    } catch (e) {
      return [];
    }
  }
  const rows = await supabaseRequest("/dashboard_records?select=id,target,status,dashboard_record_json,created_at&order=created_at.asc&limit=1000");
  const latest = new Map();
  for (const row of (Array.isArray(rows) ? rows : [])) {
    if (!row || !row.dashboard_record_json || typeof row.dashboard_record_json !== "object") continue;
    const target = dashboardSectionForStoredTarget(row.target);
    const record = row.dashboard_record_json;
    const key = storedDashboardRecordKey(target, record);
    if (!target || !key) continue;
    if (row.status === "deleted") {
      latest.delete(`${target}:${key}`);
      continue;
    }
    latest.set(`${target}:${key}`, {
      id: row.id,
      target,
      sourceTarget: row.target,
      status: row.status,
      record,
      createdAt: row.created_at
    });
  }
  return Array.from(latest.values());
}

async function readDashboardRecordsRaw() {
  if (!hasSupabase()) return [];
  const rows = await supabaseRequest("/dashboard_records?select=id,target,status,dashboard_record_json,created_at&order=created_at.asc&limit=1000");
  return (Array.isArray(rows) ? rows : [])
    .filter(row => row && row.dashboard_record_json && typeof row.dashboard_record_json === "object")
    .map(row => ({
      id: row.id,
      target: dashboardSectionForStoredTarget(row.target),
      sourceTarget: row.target,
      status: row.status,
      record: row.dashboard_record_json,
      createdAt: row.created_at
    }))
    .filter(item => item.target && item.record);
}

async function saveDashboardRecord(body) {
  console.log('saveDashboardRecord called with:', JSON.stringify(body).substring(0, 200));
  const target = dashboardSectionForStoredTarget(body.target || body.key);
  if (!target) {
    sendConfigError("Unknown dashboard record target.");
  }
  const record = body.record && typeof body.record === "object" ? body.record : null;
  if (!record) {
    sendConfigError("Missing dashboard record payload.");
  }
  if (!hasSupabase()) {
    try {
      let records = [];
      if (fs.existsSync(DASHBOARD_RECORDS_FILE)) {
        const content = fs.readFileSync(DASHBOARD_RECORDS_FILE, "utf8");
        records = JSON.parse(content) || [];
      }
      const key = body.recordKey || storedDashboardRecordKey(target, record);
      const idx = records.findIndex(r => r.target === target && r.record && (r.record.exec === key || r.record.id === key || r.record.stedi === key));
      const item = { id: "local_" + Date.now(), target, sourceTarget: target, status: body.status || "dashboard", record: { ...record, recordKey: key }, createdAt: new Date().toISOString() };
      if (idx >= 0) records[idx] = item;
      else records.push(item);
      fs.mkdirSync(path.dirname(DASHBOARD_RECORDS_FILE), { recursive: true });
      fs.writeFileSync(DASHBOARD_RECORDS_FILE, JSON.stringify(records, null, 2));
      return { mode: "file", saved: true, target, record };
    } catch (e) {
      return { mode: "file", saved: false, target, error: e.message };
    }
  }
  const row = {
    target,
    status: String(body.status || "dashboard"),
    dashboard_record_json: { ...record, recordKey: String(body.recordKey || storedDashboardRecordKey(target, record)) }
  };
  const rows = await supabaseRequest("/dashboard_records", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: JSON.stringify(row)
  });
  return { mode: "supabase", saved: true, target, record: Array.isArray(rows) ? rows[0] : rows };
}

async function deleteDashboardRecord(body) {
  const target = dashboardSectionForStoredTarget(body.target || body.key);
  if (!target) {
    sendConfigError("Unknown dashboard record target.");
  }
  const recordKey = String(body.recordKey || "");
  if (!recordKey) {
    sendConfigError("Missing dashboard record key.");
  }
  if (!hasSupabase()) {
    try {
      let records = [];
      if (fs.existsSync(DASHBOARD_RECORDS_FILE)) {
        const content = fs.readFileSync(DASHBOARD_RECORDS_FILE, "utf8");
        records = JSON.parse(content) || [];
      }
      const filtered = records.filter(r => !(r.target === target && r.record && (r.record.exec === recordKey || r.record.id === recordKey || r.record.stedi === recordKey)));
      fs.mkdirSync(path.dirname(DASHBOARD_RECORDS_FILE), { recursive: true });
      fs.writeFileSync(DASHBOARD_RECORDS_FILE, JSON.stringify(filtered, null, 2));
      return { mode: "file", deleted: true, target, recordKey };
    } catch (e) {
      return { mode: "file", deleted: false, target, recordKey, error: e.message };
    }
  }
  const row = {
    module_id: `dashboard:${target}`,
    document_id: "",
    standardization_id: "",
    target,
    status: "deleted",
    extracted_json: { source: "dashboard", recordKey },
    stedi_preview_json: {},
    dashboard_record_json: { recordKey },
    warnings: []
  };
  const rows = await supabaseRequest("/dashboard_records", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: JSON.stringify(row)
  });
  return { mode: "supabase", deleted: true, target, recordKey, import: Array.isArray(rows) ? rows[0] : rows };
}

function dashboardSectionForStoredTarget(target) {
  const value = String(target || "");
  if (value === "professionalClaim837P") return "claims";
  if (value === "eligibility270") return "eligibility";
  if (value === "appealsFromEra") return "appeals";
  if (value === "claimAttachment275") return "attachments";
  if (value === "providerEnrollment") return "providers";
  if (["claims", "eligibility", "providers", "payers", "enrollments", "attachments", "appeals", "cob", "transactions"].includes(value)) return value;
  return "";
}

function storedDashboardRecordKey(target, record) {
  if (record.recordKey) return String(record.recordKey);
  if (target === "claims") return String(record.id || record.payerClm || record.patient || "");
  if (target === "eligibility") return String(record.trn || [record.patient, record.member, record.payer].filter(Boolean).join("|"));
  if (target === "providers") return String(record.npi || record.name || "");
  if (target === "payers") return String(record.stedi || record.name || "");
  if (target === "enrollments") return String(record.id || [record.provider, record.payer, record.txn].filter(Boolean).join("|"));
  if (target === "attachments") return String(record.ctrl || [record.claim, record.doc, record.payer].filter(Boolean).join("|"));
  if (target === "appeals") return String(record.id || record.claimNumber || [record.patientName, record.payer].filter(Boolean).join("|"));
  if (target === "cob") return String([record.patient, record.primary, record.secondary].filter(Boolean).join("|"));
  if (target === "transactions") return String(record.exec || record.id || "");
  return "";
}

async function supabaseRequest(pathname, options = {}) {
  const authHeaders = {
    "apikey": config.supabaseServiceRoleKey,
    "Authorization": `Bearer ${config.supabaseServiceRoleKey}`
  };
  const response = await fetch(`${config.supabaseUrl}/rest/v1${pathname}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders,
      ...(options.headers || {})
    },
    body: options.body
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    console.error(`Supabase error (${response.status}):`, body);
    const error = new Error(body.message || `Supabase request failed with ${response.status}`);
    error.statusCode = response.status;
    error.details = body;
    throw error;
  }
  return body;
}

function moduleToRow(module) {
  const normalized = normalizeModule(module);
  return {
    id: normalized.id,
    name: normalized.name,
    enabled: normalized.enabled,
    docupipe_schema_id: normalized.docupipeSchemaId,
    stedi_target: normalized.stediTarget,
    dashboard_target: normalized.dashboardTarget,
    stedi_endpoint: normalized.stediEndpoint,
    guidelines: normalized.guidelines,
    json_schema: normalized.jsonSchema,
    field_mappings: normalized.fieldMappings,
    updated_at: new Date().toISOString()
  };
}

function moduleFromRow(row) {
  return normalizeModule({
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    docupipeSchemaId: row.docupipe_schema_id,
    stediTarget: row.stedi_target,
    dashboardTarget: row.dashboard_target,
    stediEndpoint: row.stedi_endpoint,
    guidelines: row.guidelines,
    jsonSchema: row.json_schema,
    fieldMappings: row.field_mappings
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendText(res, err.code === "ENOENT" ? 404 : 500, err.code === "ENOENT" ? "Not found" : "Read failed");
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg"
  }[ext] || "application/octet-stream";
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

async function findModule(moduleId) {
  const modules = await readModules();
  const module = modules.find(item => item.id === moduleId);
  if (!module) {
    const error = new Error(`Unknown module: ${moduleId}`);
    error.statusCode = 404;
    throw error;
  }
  return module;
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getExtension(fileName, mimeType) {
  const fromName = String(fileName || "").split(".").pop();
  if (fromName && fromName !== fileName) return fromName.toLowerCase();
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "jpg";
  if (mimeType === "image/tiff") return "tiff";
  if (mimeType && mimeType.includes("word")) return "docx";
  if (mimeType && mimeType.includes("spreadsheet")) return "xlsx";
  return "pdf";
}

async function callJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    const billingMessage = response.status === 402
      ? "DocuPipe returned 402 Payment Required. Upload/parse can succeed while standardization fails when the DocuPipe account has no available standardization credits or billing access. Add DocuPipe credits, or set APP_MODE=mock on Render for a free demo."
      : null;
    const notFoundMessage = response.status === 404
      ? `DocuPipe returned 404 Not Found for ${new URL(url).pathname}. For V3 standardization, confirm the document ID exists and the schema ID belongs to the same DocuPipe account as this API key.`
      : null;
    const error = new Error(billingMessage || notFoundMessage || body.message || `Request failed with ${response.status}`);
    error.statusCode = response.status;
    error.details = {
      ...body,
      upstreamStatus: response.status,
      upstreamUrl: url,
      hint: billingMessage || notFoundMessage || undefined
    };
    throw error;
  }
  return body;
}

function docupipeHeaders() {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-API-Key": config.docupipeApiKey
  };
}

function stediHeaders() {
  const key = config.stediApiKey;
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": key ? (/^key\s/i.test(key) ? key : `Key ${key}`) : ""
  };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/modules") {
    sendJson(res, 200, { modules: await readModules(), storage: hasSupabase() ? "supabase" : "file", mode: isLive() && config.docupipeApiKey ? "live" : "mock" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/modules") {
    const body = await readJsonBody(req);
    const modules = await readModules();
    const id = safeModuleId(body.id || body.name || "module");
    if (modules.some(item => item.id === id)) {
      sendJson(res, 409, { error: `Module already exists: ${id}` });
      return;
    }
    const next = normalizeModule({ ...body, id, enabled: body.enabled !== false });
    await createModule(next);
    sendJson(res, 201, { module: next });
    return;
  }

  const moduleMatch = url.pathname.match(/^\/api\/modules\/([^/]+)$/);
  if (moduleMatch && req.method === "PUT") {
    const moduleId = decodeURIComponent(moduleMatch[1]);
    const body = await readJsonBody(req);
    const next = await updateModule(moduleId, body);
    if (!next) {
      sendJson(res, 404, { error: `Unknown module: ${moduleId}` });
      return;
    }
    sendJson(res, 200, { module: next });
    return;
  }

  if (moduleMatch && req.method === "DELETE") {
    const moduleId = decodeURIComponent(moduleMatch[1]);
    const deleted = await deleteModule(moduleId);
    if (!deleted) {
      sendJson(res, 404, { error: `Unknown module: ${moduleId}` });
      return;
    }
    sendJson(res, 200, { deleted: true, moduleId });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/docupipe/upload") {
    const body = await readJsonBody(req);
    const module = await findModule(body.moduleId);
    const result = await uploadToDocupipe(module, body);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/docupipe/standardize") {
    const body = await readJsonBody(req);
    const module = await findModule(body.moduleId);
    const result = await standardizeWithDocupipe(module, body);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/docupipe/schemas") {
    const result = await listDocupipeSchemas(url.searchParams);
    sendJson(res, 200, result);
    return;
  }

  const schemaMatch = url.pathname.match(/^\/api\/docupipe\/schemas\/([^/]+)$/);
  if (schemaMatch && req.method === "GET") {
    const schemaId = decodeURIComponent(schemaMatch[1]);
    const result = await getDocupipeSchema(schemaId);
    sendJson(res, 200, result);
    return;
  }

  const jobMatch = url.pathname.match(/^\/api\/docupipe\/jobs\/([^/]+)$/);
  if (jobMatch && req.method === "GET") {
    const jobId = decodeURIComponent(jobMatch[1]);
    const result = await getDocupipeJob(jobId);
    sendJson(res, 200, result);
    return;
  }

  const documentMatch = url.pathname.match(/^\/api\/docupipe\/documents\/([^/]+)$/);
  if (documentMatch && req.method === "GET") {
    const documentId = decodeURIComponent(documentMatch[1]);
    const result = await getDocupipeDocument(documentId);
    sendJson(res, 200, result);
    return;
  }

  const stdMatch = url.pathname.match(/^\/api\/docupipe\/standardizations\/([^/]+)$/);
  if (stdMatch && req.method === "GET") {
    const standardizationId = decodeURIComponent(stdMatch[1]);
    const result = await getStandardization(standardizationId);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/stedi/preview") {
    const body = await readJsonBody(req);
    const module = await findModule(body.moduleId);
    sendJson(res, 200, buildStediPreview(module, body.standardization || body.data || {}, { target: body.target }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/stedi/eligibility") {
    const body = await readJsonBody(req);
    sendJson(res, 200, await runEligibilityCheck(body));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/stedi/call") {
    const body = await readJsonBody(req);
    sendJson(res, 200, await stediProxy(body));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/npi-lookup") {
    const npi = url.searchParams.get("npi") || "";
    if (!/^\d{10}$/.test(npi)) { sendJson(res, 400, { error: "Invalid NPI" }); return; }
    try {
      const r = await fetch("https://npiregistry.cms.hhs.gov/api/?number=" + npi + "&version=2.1");
      sendJson(res, 200, await r.json());
    } catch (e) { sendJson(res, 502, { error: "NPPES unavailable" }); }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/imports") {
    const body = await readJsonBody(req);
    const result = await saveImportRecord(body);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard-records") {
    const records = await readDashboardRecords();
    sendJson(res, 200, { records, storage: hasSupabase() ? "supabase" : "fileless" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/dashboard-records") {
    const body = await readJsonBody(req);
    const result = await saveDashboardRecord(body);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/dashboard-records/delete") {
    const body = await readJsonBody(req);
    const result = await deleteDashboardRecord(body);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/stedi/submit") {
    const body = await readJsonBody(req);
    const module = await findModule(body.moduleId);
    const preview = body.preview || buildStediPreview(module, body.standardization || body.data || {}, { target: body.target });
    const result = await submitToStedi(module, preview, body);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/patients") {
    if (!hasSupabase()) { sendJson(res, 200, { patients: [] }); return; }
    const q = url.searchParams.get("q") || "";
    const filter = q
      ? `?or=(first_name.ilike.*${encodeURIComponent(q)}*,last_name.ilike.*${encodeURIComponent(q)}*)&limit=10`
      : "?order=created_at.desc&limit=20";
    let rows;
    try { rows = await supabaseRequest("/patients" + filter); } catch { rows = []; }
    sendJson(res, 200, { patients: Array.isArray(rows) ? rows : [] });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/patients") {
    const body = await readJsonBody(req);
    if (!hasSupabase()) { sendJson(res, 201, { patient: { id: "local_" + Date.now(), first_name: body.firstName, last_name: body.lastName } }); return; }
    const rows = await supabaseRequest("/patients", {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: JSON.stringify([{ first_name: body.firstName || "", last_name: body.lastName || "", dob: body.dob || null, gender: body.gender || null, member_id: body.memberId || null, group_number: body.groupNumber || null }])
    });
    sendJson(res, 201, { patient: Array.isArray(rows) ? rows[0] : rows });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/stedi/eligibility/check") {
    const body = await readJsonBody(req);
    const result = await runEligibilityCheck(body);
    const rec = result.record || {};
    const rawResp = result.response || {};
    const benefits = Array.isArray(rawResp.benefitsInformation) ? rawResp.benefitsInformation : [];
    const authBen = benefits.find(b => b.authorizationOrReferralRequired === "Y" || String(b.code) === "AR");
    const enhanced = {
      ...rec,
      patientId: body.patientId || null,
      patientFirstName: body.firstName || "",
      patientLastName: body.lastName || "",
      patientDob: body.dob || rec.dob || null,
      dos: body.dos || null,
      stc: body.stc || "30",
      npi: body.npi || "",
      posCode: body.posCode || "",
      checkedAt: new Date().toISOString(),
      raw271: rawResp,
      authRequired: authBen ? "Y" : null
    };
    if (hasSupabase()) {
      if (!enhanced.patientId && enhanced.patientFirstName) {
        try {
          const saved = await supabaseRequest("/patients", {
            method: "POST",
            headers: { "Prefer": "return=representation", "Content-Type": "application/json" },
            body: JSON.stringify([{ first_name: enhanced.patientFirstName, last_name: enhanced.patientLastName || "", dob: enhanced.patientDob || null, member_id: enhanced.member || null }])
          });
          if (Array.isArray(saved) && saved[0]) enhanced.patientId = saved[0].id;
        } catch (e) { console.error("patients save failed:", e.message); }
      }
      try {
        await supabaseRequest("/eligibility_checks", {
          method: "POST",
          headers: { "Prefer": "return=minimal" },
          body: JSON.stringify([{
            patient_id: enhanced.patientId || null,
            patient_first_name: enhanced.patientFirstName,
            patient_last_name: enhanced.patientLastName,
            patient_dob: enhanced.patientDob || null,
            payer_id: enhanced.payerId || null,
            payer_name: enhanced.payer || null,
            member_id: enhanced.member || null,
            group_number: enhanced.group || null,
            npi: enhanced.npi || null,
            pos_code: enhanced.posCode || null,
            dos: enhanced.dos || null,
            stc: enhanced.stc || null,
            status: enhanced.status || null,
            plan_name: enhanced.plan || null,
            copay_in_net: enhanced.copay || null,
            deduct_rem_in_net: enhanced.dedT ? enhanced.dedT - (enhanced.dedM || 0) : null,
            oop_max_rem_in_net: enhanced.oopT ? enhanced.oopT - (enhanced.oopM || 0) : null,
            coins_in_net: enhanced.coins || null,
            auth_required: enhanced.authRequired || null,
            trn: enhanced.trn || null,
            raw_271: rawResp,
            checked_at: enhanced.checkedAt
          }])
        });
      } catch (e) {
        console.error("eligibility_checks save failed:", e.message);
      }
    }
    sendJson(res, 200, { ...result, record: enhanced });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/eligibility/checks") {
    if (!hasSupabase()) { sendJson(res, 200, { checks: [] }); return; }
    let rows;
    try { rows = await supabaseRequest("/eligibility_checks?select=*&order=checked_at.desc&limit=200"); } catch { rows = []; }
    sendJson(res, 200, { checks: Array.isArray(rows) ? rows : [] });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/eligibility/batch") {
    const body = await readJsonBody(req);
    const requests = Array.isArray(body.patients) ? body.patients : (Array.isArray(body.requests) ? body.requests : []);
    const result = await stediProxy({ base: "healthcare", path: "/eligibility-manager/batch-eligibility", method: "POST", payload: { requests } });
    if (hasSupabase() && result.ok && result.response && result.response.batchId) {
      try {
        await supabaseRequest("/eligibility_batches", {
          method: "POST",
          headers: { "Prefer": "return=minimal" },
          body: JSON.stringify([{ stedi_batch_id: result.response.batchId, status: "submitted", total_count: requests.length }])
        });
      } catch {}
    }
    sendJson(res, 200, result);
    return;
  }

  const batchStatusMatch = url.pathname.match(/^\/api\/eligibility\/batches\/([^/]+)$/);
  if (batchStatusMatch && req.method === "GET") {
    const batchId = decodeURIComponent(batchStatusMatch[1]);
    sendJson(res, 200, await stediProxy({ base: "healthcare", path: "/eligibility-manager/batch-eligibility/" + batchId, method: "GET", payload: null }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/work_queue") {
    const body = await readJsonBody(req);
    if (!hasSupabase()) { sendJson(res, 201, { item: { id: "local_" + Date.now(), type: body.type } }); return; }
    const rows = await supabaseRequest("/work_queue", {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: JSON.stringify([{ type: body.type || "auth", patient_first_name: body.patientFirstName || null, patient_last_name: body.patientLastName || null, payer_id: body.payerId || null, payer_name: body.payerName || null, dos: body.dos || null, reason: body.reason || null }])
    });
    sendJson(res, 201, { item: Array.isArray(rows) ? rows[0] : rows });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/work_queue") {
    if (!hasSupabase()) { sendJson(res, 200, { items: [] }); return; }
    let rows;
    try { rows = await supabaseRequest("/work_queue?resolved=eq.false&order=created_at.desc&limit=100"); } catch { rows = []; }
    sendJson(res, 200, { items: Array.isArray(rows) ? rows : [] });
    return;
  }

  sendJson(res, 404, { error: "Unknown API route." });
}

function normalizeModule(module) {
  const stediTarget = String(module.stediTarget || "professionalClaim837P");
  return {
    id: safeModuleId(module.id),
    name: String(module.name || module.id || "Untitled module"),
    enabled: module.enabled !== false,
    docupipeSchemaId: String(module.docupipeSchemaId || ""),
    stediTarget,
    dashboardTarget: dashboardTargetForStedi(stediTarget),
    stediEndpoint: String(module.stediEndpoint || ""),
    guidelines: String(module.guidelines || ""),
    jsonSchema: module.jsonSchema && typeof module.jsonSchema === "object" ? module.jsonSchema : defaultJsonSchema(),
    fieldMappings: Array.isArray(module.fieldMappings) ? module.fieldMappings : []
  };
}

function dashboardTargetForStedi(target) {
  if (target === "eligibility270") return "eligibility";
  if (target === "appealsFromEra") return "appeals";
  if (target === "claimAttachment275") return "attachments";
  if (target === "providerEnrollment") return "providers";
  return "claims";
}

function defaultJsonSchema() {
  return {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "description": "Extract structured billing data from the source document.",
    "type": "object",
    "properties": {
      "documentType": { "type": "string", "description": "Document type." }
    }
  };
}

function safeModuleId(value) {
  return String(value || "module")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "module";
}

async function uploadToDocupipe(module, body) {
  const documentId = makeId("doc_mock");
  const extension = getExtension(body.fileName, body.mimeType);
  if (!isLive() || !config.docupipeApiKey) {
    mockDocuments.set(documentId, {
      documentId,
      moduleId: module.id,
      fileName: body.fileName || "uploaded-document.pdf",
      mimeType: body.mimeType || "application/pdf",
      uploadedAt: new Date().toISOString()
    });
    return {
      mode: "mock",
      status: "processed",
      documentId,
      jobId: makeId("job_parse"),
      message: "Mock upload complete. Set APP_MODE=live and DOCUPIPE_API_KEY to call DocuPipe."
    };
  }

  const document = body.fileUrl
    ? { file: { url: body.fileUrl }, fileExtension: extension }
    : { file: { contents: body.fileBase64 }, fileExtension: extension };

  const payload = {
    document,
    dataset: body.dataset || "culver-city-surgical-dashboard",
    metadata: {
      moduleId: module.id,
      moduleName: module.name,
      originalFileName: body.fileName || null,
      dashboard: "culver-city-surgical-dashboard-docupipe",
      ...(body.metadata && typeof body.metadata === "object" ? body.metadata : {})
    },
    parseVersion: 3
  };

  return {
    mode: "live",
    ...(await callJson(`${config.docupipeBaseUrl}/document`, {
      method: "POST",
      headers: docupipeHeaders(),
      body: JSON.stringify(payload)
    }))
  };
}

async function standardizeWithDocupipe(module, body) {
  if (!isLive() || !config.docupipeApiKey) {
    const standardizationId = makeId("std_mock");
    const jobId = makeId("job_std");
    const documentId = body.documentId || makeId("doc_mock");
    const standardization = {
      standardizationId,
      documentId,
      schemaId: module.docupipeSchemaId || "mock-schema",
      schemaName: module.name,
      data: mockStandardizationData(module),
      createdAt: new Date().toISOString()
    };
    mockStandardizations.set(standardizationId, standardization);
    mockJobs.set(jobId, {
      jobId,
      status: "completed",
      type: "standardization",
      standardizationId,
      standardizationIds: [standardizationId],
      documentId,
      completedAt: new Date().toISOString()
    });
    return {
      mode: "mock",
      status: "completed",
      jobId,
      standardizationId,
      standardizationIds: [standardizationId],
      message: "Mock standardization complete."
    };
  }

  const schemaId = String(body.schemaId || module.docupipeSchemaId || "").trim();
  if (!schemaId) {
    sendConfigError("DocuPipe V3 requires a schema ID. Enter the DocuPipe schema ID in Advanced module metadata and save the module.");
  }

  if (body.documentId) {
    await waitForDocupipeDocument(body.documentId);
  }

  await verifyDocupipeSchema(schemaId);

  const payload = {
    documentId: body.documentId,
    ...(schemaId ? { schemaId } : {}),
    guidelines: body.guidelines || module.guidelines,
    useMetadata: true,
    pages: Array.isArray(body.pages) ? body.pages : undefined,
    effortLevel: body.effortLevel === "high" ? "high" : "standard",
    stdVersion: 3
  };

  return {
    mode: "live",
    ...(await callJson(`${config.docupipeBaseUrl}/v3/standardize`, {
      method: "POST",
      headers: docupipeHeaders(),
      body: JSON.stringify(payload)
    }))
  };
}

async function verifyDocupipeSchema(schemaId) {
  if (!isLive() || !config.docupipeApiKey) return null;
  try {
    return await getDocupipeSchema(schemaId);
  } catch (error) {
    const status = Number(error.statusCode);
    if (status === 404 || status === 422) {
      sendConfigError(`DocuPipe schema ${schemaId} was not found or is not accessible with the API key configured on this server. Confirm the schema ID in DocuPipe and make sure Render is using the API key for the same DocuPipe account.`);
    }
    throw error;
  }
}

async function waitForDocupipeDocument(documentId) {
  const deadline = Date.now() + 30000;
  for (;;) {
    const doc = await getDocupipeDocument(documentId);
    const status = String(doc.status || "").toLowerCase();
    if (["completed", "complete", "processed", "succeeded", "success"].includes(status)) return doc;
    if (Date.now() >= deadline) {
      sendConfigError(`DocuPipe document ${documentId} is still ${doc.status || "processing"}. Wait for processing to complete before standardizing.`);
    }
    await wait(1000);
  }
}

function sendConfigError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getDocupipeJob(jobId) {
  if (mockJobs.has(jobId)) return { mode: "mock", ...mockJobs.get(jobId) };
  if (!isLive() || !config.docupipeApiKey) {
    return { mode: "mock", jobId, status: "not_found", message: "Mock job not found." };
  }
  return {
    mode: "live",
    ...(await callJson(`${config.docupipeBaseUrl}/job/${encodeURIComponent(jobId)}`, {
      method: "GET",
      headers: { "Accept": "application/json", "X-API-Key": config.docupipeApiKey }
    }))
  };
}

async function getDocupipeDocument(documentId) {
  if (mockDocuments.has(documentId)) {
    return {
      mode: "mock",
      status: "processed",
      documentId,
      result: "Mock document text for dashboard testing.",
      document: mockDocuments.get(documentId)
    };
  }
  if (!isLive() || !config.docupipeApiKey) {
    return { mode: "mock", documentId, status: "not_found", message: "Mock document not found." };
  }
  return {
    mode: "live",
    ...(await callJson(`${config.docupipeBaseUrl}/document/${encodeURIComponent(documentId)}`, {
      method: "GET",
      headers: { "Accept": "application/json", "X-API-Key": config.docupipeApiKey }
    }))
  };
}

async function getStandardization(standardizationId) {
  if (mockStandardizations.has(standardizationId)) {
    return { mode: "mock", ...mockStandardizations.get(standardizationId) };
  }
  if (!isLive() || !config.docupipeApiKey) {
    return { mode: "mock", standardizationId, status: "not_found", message: "Mock standardization not found." };
  }
  return {
    mode: "live",
    ...(await callJson(`${config.docupipeBaseUrl}/standardization/${encodeURIComponent(standardizationId)}`, {
      method: "GET",
      headers: { "Accept": "application/json", "X-API-Key": config.docupipeApiKey }
    }))
  };
}

async function getDocupipeSchema(schemaId) {
  if (!schemaId) sendConfigError("Missing DocuPipe schema ID.");
  if (!isLive() || !config.docupipeApiKey) {
    return { mode: "mock", schemaId, status: "mock_valid" };
  }
  return {
    mode: "live",
    ...(await callJson(`${config.docupipeBaseUrl}/schema/${encodeURIComponent(schemaId)}`, {
      method: "GET",
      headers: { "Accept": "application/json", "X-API-Key": config.docupipeApiKey }
    }))
  };
}

async function listDocupipeSchemas(searchParams) {
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 1000), 1), 1000);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
  if (!isLive() || !config.docupipeApiKey) {
    const modules = (await readModules()).filter(module => module.docupipeSchemaId).map(module => ({
      schemaId: module.docupipeSchemaId,
      schemaName: `${module.name} schema`,
      origin: "module"
    }));
    return { mode: "mock", schemas: modules, total: modules.length, limit, offset };
  }
  const upstream = await callJson(`${config.docupipeBaseUrl}/schemas?limit=${limit}&offset=${offset}&exclude_payload=true`, {
    method: "GET",
    headers: { "Accept": "application/json", "X-API-Key": config.docupipeApiKey }
  });
  const rawSchemas = Array.isArray(upstream) ? upstream : Array.isArray(upstream.schemas) ? upstream.schemas : Array.isArray(upstream.items) ? upstream.items : Array.isArray(upstream.data) ? upstream.data : [];
  const schemas = rawSchemas.map(schema => ({
    schemaId: schema.schemaId || schema.id || schema._id || "",
    schemaName: schema.schemaName || schema.name || schema.title || "Untitled schema",
    description: schema.description || "",
    origin: schema.origin || schema.workspaceName || "",
    timestamp: schema.timestamp || schema.createdAt || schema.updatedAt || ""
  })).filter(schema => schema.schemaId);
  return {
    mode: "live",
    schemas,
    total: upstream.total || upstream.count || schemas.length,
    limit,
    offset
  };
}

function mockStandardizationData(module) {
  const basePatient = {
    firstName: "Maya",
    lastName: "Rosen",
    fullName: "Maya Rosen",
    dateOfBirth: "1979-04-18",
    memberId: "AET123456789",
    accountNumber: "MR-20418"
  };
  if (module.stediTarget === "eligibility270") {
    return {
      documentType: "eligibility",
      subscriber: basePatient,
      payer: { name: "Aetna", stediId: "AETNA", phone: "800-555-1212" },
      plan: { name: "PPO Gold", type: "PPO", effectiveDate: "2026-01-01" },
      encounter: { dateOfService: "2026-06-12", serviceTypeCodes: ["30"] }
    };
  }
  if (module.stediTarget === "appealsFromEra") {
    return {
      documentType: "era",
      payer: { name: "Aetna", stediId: "AETNA", paymentTraceNumber: "EFT-884201" },
      denials: [
        {
          patientName: "Maya Rosen",
          claimNumber: "CLM-26012",
          payerClaimNumber: "PC771209",
          dateOfService: "2026-05-22",
          cptCodes: ["29881"],
          diagnosisCodes: ["M17.11"],
          carcCode: "CO-50",
          rarcCodes: ["M127"],
          reason: "Medical necessity documentation requested.",
          billedAmount: 4820,
          paidAmount: 0,
          deniedAmount: 4820
        }
      ]
    };
  }
  if (module.stediTarget === "claimAttachment275") {
    return {
      documentType: "attachment",
      claimNumber: "CLM-26012",
      patientName: "Maya Rosen",
      payerName: "Aetna",
      dateOfService: "2026-05-22",
      attachment: {
        documentName: "operative-report.pdf",
        documentType: "Operative report",
        pageCount: 7,
        clinicalSummary: "Arthroscopic knee procedure with operative findings and postoperative plan."
      }
    };
  }
  if (module.stediTarget === "providerEnrollment") {
    return {
      documentType: "providerEnrollment",
      provider: {
        name: "Dr. Maya Rosen, MD",
        firstName: "Maya",
        lastName: "Rosen",
        credential: "MD",
        specialty: "Orthopedic surgery",
        npi: "1841557020",
        taxonomyCode: "207X00000X",
        taxId: "95-4412087"
      },
      enrollment: {
        payerName: "Aetna",
        transactionType: "837P claims",
        submittedDate: "2026-06-12",
        requestedDocuments: ["W-9.pdf", "EDI agreement.pdf"]
      }
    };
  }
  return {
    documentType: "claim",
    patient: basePatient,
    payer: { name: "Aetna", stediId: "AETNA", payerClaimNumber: "PC771209" },
    provider: {
      organizationName: "Culver City Surgical Partners",
      renderingProviderName: "Dr. Alejandro Reyes",
      npi: "1841557020",
      taxId: "95-4412087",
      taxonomyCode: "207X00000X"
    },
    claim: {
      claimNumber: "CLM-26012",
      dateOfService: "2026-05-22",
      placeOfService: "24",
      totalChargeAmount: 4820
    },
    serviceLines: [
      {
        cptCode: "29881",
        description: "Knee arthroscopy with meniscectomy",
        modifiers: ["RT"],
        diagnosisPointers: ["M17.11"],
        units: 1,
        chargeAmount: 4820
      }
    ],
    diagnosisCodes: ["M17.11"]
  };
}

function unwrapStandardization(standardization) {
  if (!standardization || typeof standardization !== "object") return {};
  return standardization.data || standardization.result || standardization.output || standardization;
}

function buildStediPreview(module, standardization, overrides) {
  const data = unwrapStandardization(standardization);
  const builders = {
    professionalClaim837P: buildClaimPreview,
    eligibility270: buildEligibilityPreview,
    appealsFromEra: buildEraPreview,
    claimAttachment275: buildAttachmentPreview,
    providerEnrollment: buildProviderPreview
  };
  const target = String(overrides && overrides.target || module.stediTarget || "professionalClaim837P");
  const builder = builders[target] || buildClaimPreview;
  const preview = builder({ ...module, stediTarget: target }, data);
  preview.module = { id: module.id, name: module.name };
  preview.standardization = data;
  preview.mode = isLive() ? "live" : "mock";
  preview.readyForLiveSubmit = preview.warnings.length === 0;
  return preview;
}

function buildClaimPreview(module, data) {
  const patient = data.patient || {};
  const payer = objectValue(data.payer);
  const provider = data.provider || {};
  const claim = data.claim || {};
  const serviceLines = Array.isArray(data.serviceLines) ? data.serviceLines : [];
  const patientName = first(data.patientName, patient.fullName, patient.name, joinName(patient.firstName, patient.lastName), "Unknown Patient");
  const payerName = first(typeof data.payer === "string" ? data.payer : null, payer.name, "Unknown Payer");
  const providerName = first(data.renderingProvider, provider.renderingProviderName, provider.organizationName, "Imported Provider");
  const claimNumber = first(data.claimId, data.claimNumber, claim.claimNumber, `CLM-${Date.now().toString().slice(-5)}`);
  const claimType = normalizeClaimType(first(data.claimType, data.type, data.claimFormType, claim.claimType, claim.type, "837P"));
  const endpoint = claimType === "837I" ? "/change/medicalnetwork/institutionalclaims/v1/submission" : module.stediEndpoint;
  const total = number(first(data.billedAmount, claim.totalChargeAmount, sum(serviceLines.map(line => line.chargeAmount || line.charge)), 0));
  const paid = number(first(data.paidAmount, claim.paidAmount, claim.totalPaidAmount, 0));
  const serviceFacility = first(data.serviceFacility, claim.serviceFacility, "Culver City ASC");
  const cptLines = serviceLines.length ? serviceLines : [{ cptCode: "00000", description: "Procedure", modifiers: [], units: 1, chargeAmount: total }];
  const payload = {
    controlNumber: claimNumber,
    tradingPartnerServiceId: first(payer.stediId, data.payerId, payerName),
    submitter: { organizationName: "Culver City Surgical Partners" },
    billingProvider: {
      organizationName: first(provider.organizationName, providerName, "Culver City Surgical Partners"),
      npi: first(provider.npi, data.billingProviderNpi, data.npi, null),
      taxId: first(provider.taxId, data.taxId, null),
      taxonomyCode: first(provider.taxonomyCode, data.taxonomyCode, null)
    },
    subscriber: {
      firstName: first(patient.firstName, data.firstName, splitName(patientName).firstName, null),
      lastName: first(patient.lastName, data.lastName, splitName(patientName).lastName, null),
      dateOfBirth: compactDate(first(patient.dateOfBirth, data.dateOfBirth, null)),
      memberId: first(patient.memberId, data.memberId, null)
    },
    claimInformation: {
      patientControlNumber: claimNumber,
      placeOfServiceCode: first(claim.placeOfService, data.placeOfService, "24"),
      claimChargeAmount: total.toFixed(2),
      serviceFacilityLocation: { organizationName: serviceFacility },
      serviceLines: cptLines.map((line, index) => ({
        serviceLineNumber: String(index + 1),
        professionalService: {
          procedureIdentifier: "HC",
          procedureCode: first(line.cptCode, line.cpt, "00000"),
          procedureModifiers: Array.isArray(line.modifiers) ? line.modifiers.filter(Boolean) : line.modifier && line.modifier !== "-" ? [line.modifier] : [],
          lineItemChargeAmount: number(first(line.chargeAmount, line.charge, 0)).toFixed(2),
          measurementUnit: "UN",
          serviceUnitCount: String(first(line.units, 1))
        },
        diagnosisCodePointers: Array.isArray(line.diagnosisPointers) ? line.diagnosisPointers : []
      }))
    },
    diagnosisCodes: Array.isArray(data.diagnoses) ? data.diagnoses : Array.isArray(data.diagnosisCodes) ? data.diagnosisCodes : []
  };
  const missing = [];
  if (!first(data.patientName, patient.fullName, patient.name, joinName(patient.firstName, patient.lastName))) missing.push("patient");
  if (!first(typeof data.payer === "string" ? data.payer : null, payer.name)) missing.push("payer");
  if (!first(data.renderingProvider, provider.renderingProviderName, provider.organizationName)) missing.push("provider");
  if (!first(data.serviceFacility, claim.serviceFacility)) missing.push("loc");
  if (!first(data.payerClaimNumber, payer.payerClaimNumber, payer.claimNumber)) missing.push("payerClm");
  if (!first(data.billedAmount, claim.totalChargeAmount) && sum(serviceLines.map(line => line.chargeAmount || line.charge)) <= 0) missing.push("billed");
  if (!first(claim.dateOfService, data.dateOfService)) missing.push("dos");
  const dashboardRecord = {
    id: claimNumber,
    patient: patientName,
    type: claimType,
    provider: providerName ? providerName.replace(/,.*$/, "") : "Dr. Imported",
    providerFull: providerName,
    loc: serviceFacility,
    payer: payerName,
    billed: total,
    paid,
    status: normalizeClaimStatus(first(data.status, "Draft")),
    dos: displayDate(first(claim.dateOfService, data.dateOfService)),
    lines: cptLines.map(line => ({
      cpt: first(line.cptCode, line.cpt, "00000"),
      desc: first(line.description, "Procedure"),
      mod: Array.isArray(line.modifiers) ? line.modifiers.join(", ") : first(line.modifier, "") === "-" ? "" : first(line.modifier, ""),
      units: first(line.units, 1),
      charge: number(first(line.chargeAmount, line.charge, 0))
    })),
    icds: Array.isArray(data.diagnoses) ? data.diagnoses : Array.isArray(data.diagnosisCodes) ? data.diagnosisCodes : [],
    payerClm: first(data.payerClaimNumber, payer.payerClaimNumber, payer.claimNumber, "Pending"),
    rejReason: null,
    denCode: null,
    missing
  };
  return finalizePreview("professionalClaim837P", endpoint, payload, dashboardRecord, validateClaim(payload));
}

function buildEligibilityRequest(body) {
  const name = first(body.name, joinName(body.firstName, body.lastName), "");
  const stcs = Array.isArray(body.serviceTypeCodes) && body.serviceTypeCodes.length
    ? body.serviceTypeCodes.map(String)
    : [String(body.serviceTypeCode || "30")];
  return {
    controlNumber: String(body.controlNumber || Date.now().toString().slice(-9)),
    tradingPartnerServiceId: String(body.payerId || body.tradingPartnerServiceId || "").trim(),
    provider: {
      organizationName: first(body.providerOrganizationName, "Culver City Surgical Partners"),
      npi: String(body.providerNpi || "1999999984")
    },
    subscriber: {
      firstName: first(body.firstName, splitName(name).firstName, null) || undefined,
      lastName: first(body.lastName, splitName(name).lastName, null) || undefined,
      dateOfBirth: compactDate(first(body.dateOfBirth, body.dob, null)) || undefined,
      memberId: first(body.memberId, null) || undefined
    },
    encounter: { serviceTypeCodes: stcs }
  };
}

const STEDI_PROXY_BASES = {
  healthcare: () => config.stediHealthcareBaseUrl,
  claims: () => config.stediClaimsBaseUrl,
  enrollments: () => config.stediEnrollmentsBaseUrl,
  payers: () => config.stediPayersBaseUrl,
  core: () => config.stediCoreBaseUrl
};
const STEDI_PROXY_ALLOW = ["/change/medicalnetwork/", "/insurance-discovery/", "/coordination-of-benefits", "/claim-attachments/", "/enrollments", "/providers", "/payers", "/eligibility-manager/", "/tasks/", "/documents/", "/transactions"];

// Generic authenticated proxy to Stedi. Forwards a built payload to the real Stedi endpoint
// with the server-side key. Errors (incl. sandbox "not available in Test Mode") are returned,
// not thrown, so the caller can see the real Stedi response and confirm the wiring is live.
async function stediProxy(body) {
  const path = String(body.path || "").trim();
  if (!path.startsWith("/") || path.includes("{")) sendConfigError("Invalid or unresolved Stedi path.");
  if (!STEDI_PROXY_ALLOW.some(p => path.startsWith(p))) sendConfigError("Stedi path not allowed.");
  const baseFn = STEDI_PROXY_BASES[body.base] || STEDI_PROXY_BASES.healthcare;
  const method = String(body.method || "POST").toUpperCase();
  const endpoint = `${baseFn()}${path}`;
  if (!isLive() || !config.stediApiKey) {
    return { mode: "mock", endpoint, ok: false, request: body.payload || null, response: { message: "Mock mode — set APP_MODE=live and STEDI_API_KEY for a real Stedi call." } };
  }
  let response, ok = true;
  try {
    response = await callJson(endpoint, { method, headers: stediHeaders(), body: method === "GET" ? undefined : JSON.stringify(body.payload || {}) });
  } catch (error) {
    ok = false;
    response = error.details || { error: String(error.message || error), statusCode: error.statusCode };
  }
  return { mode: "live", endpoint, ok, request: body.payload || null, response };
}

async function runEligibilityCheck(body) {
  const request = buildEligibilityRequest(body);
  if (!request.tradingPartnerServiceId) sendConfigError("Payer ID (tradingPartnerServiceId) is required for an eligibility check.");
  if (!isLive() || !config.stediApiKey) {
    const response = { meta: { applicationMode: "mock" }, benefitsInformation: [], errors: [{ description: "Mock mode: set APP_MODE=live and STEDI_API_KEY for a real 270/271 check." }] };
    return { mode: "mock", request, response, record: eligibilityRecordFrom271(body, request, response) };
  }
  const url = `${config.stediHealthcareBaseUrl}/change/medicalnetwork/eligibility/v3`;
  const response = await callJson(url, { method: "POST", headers: stediHeaders(), body: JSON.stringify(request) });
  return { mode: "live", endpoint: url, request, response, record: eligibilityRecordFrom271(body, request, response) };
}

// Best-effort parse of a Stedi 271 into the dashboard eligibility record. Unknown values stay 0/blank
// rather than being faked; the raw 271 and any payer errors are always carried through for transparency.
function eligibilityRecordFrom271(body, request, response) {
  const benefits = Array.isArray(response.benefitsInformation) ? response.benefitsInformation : [];
  const errors = Array.isArray(response.errors) ? response.errors : [];
  const amtFor = code => {
    const item = benefits.find(b => String(b.code) === code);
    return item ? number(first(item.benefitAmount, item.benefitDollarAmount, 0)) : 0;
  };
  const active = benefits.some(b => String(b.code) === "1") || (benefits.length > 0 && !errors.length);
  const sub = response.subscriber || {};
  const coinsItem = benefits.find(b => String(b.code) === "A");
  return {
    patient: first(body.name, joinName(request.subscriber.firstName, request.subscriber.lastName), joinName(sub.firstName, sub.lastName), "Unknown Patient"),
    dob: displayDate(first(body.dateOfBirth, body.dob)),
    member: first(request.subscriber.memberId, sub.memberId, "Pending"),
    payer: first((response.payer || {}).name, body.payerName, request.tradingPartnerServiceId),
    payerId: request.tradingPartnerServiceId,
    plan: first((response.planInformation || {}).planNumber, "Reported by payer"),
    status: errors.length ? "Inactive" : active ? "Active" : "Inactive",
    copay: amtFor("B"),
    coins: coinsItem && coinsItem.benefitPercent ? Math.round(number(coinsItem.benefitPercent) * 100) : 0,
    dedT: amtFor("C"),
    dedM: 0,
    oopT: amtFor("G"),
    oopM: 0,
    group: first(sub.groupNumber, ""),
    date: new Date().toLocaleDateString("en-US"),
    time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    trn: first((response.subscriberTraceNumbers || [])[0] && response.subscriberTraceNumbers[0].traceNumber, response.controlNumber, ""),
    planBegin: "",
    eligErrors: errors.map(e => e.description || e.code).filter(Boolean)
  };
}

function buildEligibilityPreview(module, data) {
  const subscriber = data.subscriber || data.patient || {};
  const payer = data.payer || {};
  const plan = data.plan || {};
  const encounter = data.encounter || {};
  const name = first(subscriber.fullName, joinName(subscriber.firstName, subscriber.lastName), "Unknown Patient");
  const payload = {
    controlNumber: `ELG-${Date.now().toString().slice(-7)}`,
    tradingPartnerServiceId: first(payer.stediId, payer.name, null),
    provider: {
      organizationName: "Culver City Surgical Partners",
      npi: "1841557020"
    },
    subscriber: {
      firstName: first(subscriber.firstName, splitName(name).firstName, null),
      lastName: first(subscriber.lastName, splitName(name).lastName, null),
      dateOfBirth: compactDate(subscriber.dateOfBirth),
      memberId: first(subscriber.memberId, null)
    },
    encounter: {
      dateOfService: compactDate(first(encounter.dateOfService, new Date().toISOString().slice(0, 10))),
      serviceTypeCodes: Array.isArray(encounter.serviceTypeCodes) && encounter.serviceTypeCodes.length ? encounter.serviceTypeCodes : ["30"]
    }
  };
  const dashboardRecord = {
    patient: name,
    dob: displayDate(subscriber.dateOfBirth),
    member: first(subscriber.memberId, "Pending"),
    payer: first(payer.name, "Unknown Payer"),
    payerId: first(payer.stediId, payer.name, "PAYER"),
    plan: first(plan.name, "Imported plan"),
    status: "Active",
    copay: 0,
    coins: 0,
    dedT: 0,
    dedM: 0,
    oopT: 0,
    oopM: 0,
    group: first(subscriber.groupNumber, "Unknown"),
    date: displayDate(first(encounter.dateOfService, new Date().toISOString().slice(0, 10))),
    time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    trn: payload.controlNumber,
    auth: false,
    planBegin: displayDate(plan.effectiveDate)
  };
  return finalizePreview("eligibility270", module.stediEndpoint, payload, dashboardRecord, validateEligibility(payload));
}

function buildEraPreview(module, data) {
  const payer = data.payer || {};
  const denials = Array.isArray(data.denials) ? data.denials : [];
  const denial = denials[0] || {};
  const payload = {
    source: "DocuPipe ERA or denial extraction",
    payer,
    denials
  };
  const dashboardRecord = {
    id: `APL-${Date.now().toString().slice(-5)}`,
    patientName: first(denial.patientName, "Unknown Patient"),
    patientDOB: "",
    claimNumber: first(denial.claimNumber, "Unknown"),
    dateOfService: displayDate(denial.dateOfService),
    submittedDate: displayDate(new Date().toISOString().slice(0, 10)),
    payer: first(payer.name, "Unknown Payer"),
    cptCodes: Array.isArray(denial.cptCodes) ? denial.cptCodes : [],
    diagnosisCodes: Array.isArray(denial.diagnosisCodes) ? denial.diagnosisCodes : [],
    denialCode: first(denial.carcCode, "Unknown"),
    denialReason: first(denial.reason, "Imported denial from DocuPipe."),
    appealType: "Formal Appeal",
    appealStatus: "Not Started",
    deadlineDate: displayDate(addDays(new Date(), 30).toISOString().slice(0, 10)),
    assignedTo: "K. Vu",
    amountBilled: number(first(denial.billedAmount, 0)),
    amountDenied: number(first(denial.deniedAmount, denial.billedAmount, 0)),
    appealLetterDraft: `We appeal the denial for claim ${first(denial.claimNumber, "Unknown")} under denial code ${first(denial.carcCode, "Unknown")}. ${first(denial.reason, "Please review the attached documentation and reconsider this claim.")}`,
    notes: "Imported from DocuPipe ERA or denial extraction.",
    timeline: [{ date: displayDate(new Date().toISOString().slice(0, 10)), action: "Imported denial from DocuPipe", user: "System" }]
  };
  const warnings = [];
  if (!denials.length) warnings.push("No denial records were extracted.");
  if (!denial.claimNumber) warnings.push("Claim number is missing.");
  if (!denial.carcCode) warnings.push("CARC denial code is missing.");
  return finalizePreview("appealsFromEra", module.stediEndpoint, payload, dashboardRecord, warnings);
}

function buildAttachmentPreview(module, data) {
  const attachment = data.attachment || {};
  const payload = {
    contentType: "application/pdf",
    claimContext: {
      claimNumber: first(data.claimNumber, null),
      patientName: first(data.patientName, null),
      payerName: first(data.payerName, null),
      dateOfService: compactDate(data.dateOfService)
    },
    attachmentMetadata: {
      documentName: first(attachment.documentName, "document.pdf"),
      documentType: first(attachment.documentType, "Clinical document"),
      pageCount: number(first(attachment.pageCount, 0)),
      clinicalSummary: first(attachment.clinicalSummary, null)
    }
  };
  const dashboardRecord = {
    claim: first(data.claimNumber, "Pending"),
    payer: first(data.payerName, "Unknown Payer"),
    doc: first(attachment.documentType, "Clinical document"),
    req: displayDate(new Date().toISOString().slice(0, 10)),
    due: displayDate(addDays(new Date(), 7).toISOString().slice(0, 10)),
    status: "Awaiting upload",
    ctrl: `PWK-${Date.now().toString().slice(-6)}`,
    pages: number(first(attachment.pageCount, 0))
  };
  const warnings = [];
  if (!data.claimNumber) warnings.push("Claim number is missing.");
  if (!data.payerName) warnings.push("Payer name is missing.");
  return finalizePreview("claimAttachment275", module.stediEndpoint, payload, dashboardRecord, warnings);
}

function buildProviderPreview(module, data) {
  const provider = data.provider || {};
  const enrollment = data.enrollment || {};
  const providerName = first(provider.name, joinName(provider.firstName, provider.lastName), "Imported Provider");
  const payload = {
    name: providerName,
    npi: first(provider.npi, null),
    taxId: first(provider.taxId, null),
    taxonomyCode: first(provider.taxonomyCode, null),
    specialty: first(provider.specialty, null),
    enrollment: {
      payerName: first(enrollment.payerName, null),
      transactionType: first(enrollment.transactionType, null),
      submittedDate: compactDate(enrollment.submittedDate),
      requestedDocuments: Array.isArray(enrollment.requestedDocuments) ? enrollment.requestedDocuments : []
    }
  };
  const dashboardRecord = {
    name: providerName,
    last: first(provider.lastName, providerName.split(" ").slice(-1)[0], "Provider"),
    spec: first(provider.specialty, "Imported specialty"),
    tax: first(provider.taxonomyCode, "Unknown"),
    npi: first(provider.npi, "Pending"),
    live: 0,
    pend: 1
  };
  const warnings = [];
  if (!provider.npi) warnings.push("Provider NPI is missing.");
  if (!provider.taxonomyCode) warnings.push("Taxonomy code is missing.");
  return finalizePreview("providerEnrollment", module.stediEndpoint, payload, dashboardRecord, warnings);
}

function finalizePreview(target, endpoint, payload, dashboardRecord, warnings) {
  return {
    target,
    endpoint,
    method: "POST",
    payload,
    dashboardRecord,
    warnings,
    summary: warnings.length ? `${warnings.length} review item(s)` : "Ready for dashboard insertion"
  };
}

async function submitToStedi(module, preview, body) {
  if (!isLive() || !config.stediApiKey || body.confirmLiveSubmit !== true) {
    return {
      mode: "mock",
      submitted: false,
      message: "Mock submit complete. Set APP_MODE=live, provide STEDI_API_KEY, and pass confirmLiveSubmit=true for a live request.",
      referenceId: makeId("stedi_mock"),
      preview
    };
  }

  if (preview.warnings && preview.warnings.length && body.allowWarnings !== true) {
    sendConfigError("Preview has warnings. Pass allowWarnings=true only after manual review.");
  }

  const baseUrl = stediBaseForTarget(preview.target);
  if (!baseUrl || !preview.endpoint) {
    sendConfigError(`No live Stedi endpoint configured for ${module.name}.`);
  }

  const response = await callJson(`${baseUrl}${preview.endpoint}`, {
    method: "POST",
    headers: stediHeaders(),
    body: JSON.stringify(preview.payload)
  });
  return {
    mode: "live",
    submitted: true,
    endpoint: `${baseUrl}${preview.endpoint}`,
    response
  };
}

function stediBaseForTarget(target) {
  if (target === "claimAttachment275") return config.stediClaimsBaseUrl;
  if (target === "providerEnrollment") return config.stediEnrollmentsBaseUrl;
  return config.stediHealthcareBaseUrl;
}

function validateClaim(payload) {
  const warnings = [];
  if (!payload.tradingPartnerServiceId) warnings.push("Payer or Stedi payer ID is missing.");
  if (!payload.subscriber.memberId) warnings.push("Subscriber member ID is missing.");
  if (!payload.subscriber.dateOfBirth) warnings.push("Subscriber date of birth is missing.");
  if (!payload.billingProvider.npi) warnings.push("Billing provider NPI is missing.");
  if (!payload.claimInformation.serviceLines.length) warnings.push("No service lines were mapped.");
  return warnings;
}

function validateEligibility(payload) {
  const warnings = [];
  if (!payload.tradingPartnerServiceId) warnings.push("Payer or Stedi payer ID is missing.");
  if (!payload.subscriber.memberId) warnings.push("Subscriber member ID is missing.");
  if (!payload.subscriber.dateOfBirth) warnings.push("Subscriber date of birth is missing.");
  return warnings;
}

function first(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeClaimType(value) {
  const text = String(value || "").toUpperCase();
  return text.includes("837I") || text.includes("INSTITUTIONAL") ? "837I" : "837P";
}

function normalizeClaimStatus(value) {
  const text = String(value || "").trim();
  if (/^pending$/i.test(text)) return "Pending payer";
  return text || "Draft";
}

function number(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) value = value.value ?? value.amount;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value || "").replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function joinName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : ""
  };
}

function compactDate(value) {
  if (!value) return null;
  const text = String(value);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}${iso[2]}${iso[3]}`;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text.replace(/\D/g, "");
  return date.toISOString().slice(0, 10).replace(/\D/g, "");
}

function displayDate(value) {
  if (!value) return "";
  const text = String(value);
  if (/^[A-Za-z]{3,9}\s+\d{1,2}$/.test(text.trim())) return text.trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function serveStatic(req, res, url) {
  let relativePath = decodeURIComponent(url.pathname === "/" ? "index.html" : url.pathname.slice(1));
  relativePath = relativePath.replace(/\//g, path.sep);
  const resolved = path.resolve(ROOT, relativePath);
  const withinRoot = resolved === ROOT || resolved.startsWith(`${ROOT}${path.sep}`);
  const baseName = path.basename(resolved).toLowerCase();
  const privatePath = relativePath.startsWith(`data${path.sep}`) || baseName === ".env";
  if (!withinRoot || privatePath) {
    sendText(res, 403, "Forbidden");
    return;
  }
  sendFile(res, resolved);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    if (url.pathname === "/healthz") {
      sendJson(res, 200, { ok: true, mode: config.appMode });
      return;
    }
    if (url.pathname === "/favicon.ico") {
      res.writeHead(204, { "Cache-Control": "no-store" });
      res.end();
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendText(res, 405, "Method not allowed");
      return;
    }
    serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: error.message || "Unexpected server error.",
      details: error.details || undefined
    });
  }
});

server.listen(PORT, () => {
  console.log(`Culver City Surgical DocuPipe clone running at http://localhost:${PORT}`);
  console.log(`Mode: ${config.appMode}`);
});
