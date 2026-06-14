import moduleSeed from "../data/docupipe-modules.json";

const mockDocuments = new Map();
const mockJobs = new Map();
const mockStandardizations = new Map();

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.pathname === "/healthz") {
    return json({ ok: true, mode: appMode(context.env), runtime: "cloudflare-pages" });
  }
  if (!url.pathname.startsWith("/api/")) {
    return context.next();
  }
  try {
    return await handleApi(context, url);
  } catch (error) {
    return json({
      error: error.message || "Unexpected Cloudflare Function error.",
      details: error.details || undefined
    }, error.statusCode || 500);
  }
}

async function handleApi(context, url) {
  const request = context.request;
  if (request.method === "GET" && url.pathname === "/api/modules") {
    return json({ modules: await readModules(context.env), storage: hasSupabase(context.env) ? "supabase" : "seed" });
  }

  if (request.method === "POST" && url.pathname === "/api/modules") {
    const body = await readJsonBody(request);
    const modules = await readModules(context.env);
    const id = safeModuleId(body.id || body.name || "module");
    if (modules.some(item => item.id === id)) return json({ error: `Module already exists: ${id}` }, 409);
    const next = normalizeModule({ ...body, id, enabled: body.enabled !== false });
    return json({ module: await createModule(context.env, next) }, 201);
  }

  const moduleMatch = url.pathname.match(/^\/api\/modules\/([^/]+)$/);
  if (moduleMatch && request.method === "PUT") {
    const next = await updateModule(context.env, decodeURIComponent(moduleMatch[1]), await readJsonBody(request));
    return next ? json({ module: next }) : json({ error: `Unknown module: ${decodeURIComponent(moduleMatch[1])}` }, 404);
  }

  if (moduleMatch && request.method === "DELETE") {
    const moduleId = decodeURIComponent(moduleMatch[1]);
    const deleted = await deleteModule(context.env, moduleId);
    return deleted ? json({ deleted: true, moduleId }) : json({ error: `Unknown module: ${moduleId}` }, 404);
  }

  if (request.method === "POST" && url.pathname === "/api/docupipe/upload") {
    const body = await readJsonBody(request);
    return json(await uploadToDocupipe(context.env, await findModule(context.env, body.moduleId), body));
  }

  if (request.method === "POST" && url.pathname === "/api/docupipe/standardize") {
    const body = await readJsonBody(request);
    return json(await standardizeWithDocupipe(context.env, await findModule(context.env, body.moduleId), body));
  }

  if (request.method === "GET" && url.pathname === "/api/docupipe/schemas") {
    return json(await listDocupipeSchemas(context.env, url.searchParams));
  }

  const schemaMatch = url.pathname.match(/^\/api\/docupipe\/schemas\/([^/]+)$/);
  if (schemaMatch && request.method === "GET") return json(await getDocupipeSchema(context.env, decodeURIComponent(schemaMatch[1])));

  const jobMatch = url.pathname.match(/^\/api\/docupipe\/jobs\/([^/]+)$/);
  if (jobMatch && request.method === "GET") return json(await getDocupipeJob(context.env, decodeURIComponent(jobMatch[1])));

  const documentMatch = url.pathname.match(/^\/api\/docupipe\/documents\/([^/]+)$/);
  if (documentMatch && request.method === "GET") return json(await getDocupipeDocument(context.env, decodeURIComponent(documentMatch[1])));

  const stdMatch = url.pathname.match(/^\/api\/docupipe\/standardizations\/([^/]+)$/);
  if (stdMatch && request.method === "GET") return json(await getStandardization(context.env, decodeURIComponent(stdMatch[1])));

  if (request.method === "POST" && url.pathname === "/api/stedi/preview") {
    const body = await readJsonBody(request);
    const module = await findModule(context.env, body.moduleId);
    return json(buildStediPreview(context.env, module, body.standardization || body.data || {}, { target: body.target }));
  }

  if (request.method === "POST" && url.pathname === "/api/imports") {
    return json(await saveImportRecord(context.env, await readJsonBody(request)), 201);
  }

  if (request.method === "GET" && url.pathname === "/api/dashboard-records") {
    return json({ records: await readDashboardRecords(context.env), storage: hasSupabase(context.env) ? "supabase" : "seedless" });
  }

  if (request.method === "POST" && url.pathname === "/api/dashboard-records") {
    return json(await saveDashboardRecord(context.env, await readJsonBody(request)), 201);
  }

  if (request.method === "POST" && url.pathname === "/api/dashboard-records/delete") {
    return json(await deleteDashboardRecord(context.env, await readJsonBody(request)));
  }

  if (request.method === "POST" && url.pathname === "/api/stedi/submit") {
    const body = await readJsonBody(request);
    const module = await findModule(context.env, body.moduleId);
    const preview = body.preview || buildStediPreview(context.env, module, body.standardization || body.data || {}, { target: body.target });
    return json(await submitToStedi(context.env, module, preview, body));
  }

  return json({ error: "Unknown API route." }, 404);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function readJsonBody(request) {
  const raw = await request.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function appMode(env) {
  return String(env.APP_MODE || "mock");
}

function isLive(env) {
  return appMode(env) === "live";
}

function config(env) {
  return {
    docupipeApiKey: env.DOCUPIPE_API_KEY || "",
    stediApiKey: env.STEDI_API_KEY || "",
    supabaseUrl: trimSlash(env.SUPABASE_URL || ""),
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
    docupipeBaseUrl: trimSlash(env.DOCUPIPE_BASE_URL || "https://app.docupipe.ai"),
    stediHealthcareBaseUrl: trimSlash(env.STEDI_HEALTHCARE_BASE_URL || "https://healthcare.us.stedi.com/2024-04-01"),
    stediClaimsBaseUrl: trimSlash(env.STEDI_CLAIMS_BASE_URL || "https://claims.us.stedi.com/2025-03-07"),
    stediEnrollmentsBaseUrl: trimSlash(env.STEDI_ENROLLMENTS_BASE_URL || "https://enrollments.us.stedi.com/2024-09-01"),
    stediPayersBaseUrl: trimSlash(env.STEDI_PAYERS_BASE_URL || "https://payers.us.stedi.com/2024-04-01")
  };
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function hasSupabase(env) {
  const cfg = config(env);
  return Boolean(cfg.supabaseUrl && cfg.supabaseServiceRoleKey);
}

function requireSupabaseForLive(env) {
  if (isLive(env) && !hasSupabase(env)) {
    sendConfigError("Cloudflare live mode requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for durable storage.");
  }
}

async function readModules(env) {
  if (!hasSupabase(env)) return moduleSeed.map(normalizeModule);
  const rows = await supabaseRequest(env, "/docupipe_modules?select=*&order=id.asc");
  if (Array.isArray(rows) && rows.length) return rows.map(moduleFromRow).map(normalizeModule);
  const seed = moduleSeed.map(normalizeModule);
  if (seed.length) await upsertModules(env, seed);
  return seed;
}

async function createModule(env, module) {
  requireSupabaseForLive(env);
  if (!hasSupabase(env)) return normalizeModule(module);
  const rows = await supabaseRequest(env, "/docupipe_modules", {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([moduleToRow(module)])
  });
  return moduleFromRow(Array.isArray(rows) ? rows[0] : rows);
}

async function updateModule(env, moduleId, module) {
  requireSupabaseForLive(env);
  const next = normalizeModule({ ...module, id: moduleId });
  if (!hasSupabase(env)) {
    return (await readModules(env)).some(item => item.id === moduleId) ? next : null;
  }
  const rows = await supabaseRequest(env, `/docupipe_modules?id=eq.${encodeURIComponent(moduleId)}`, {
    method: "PATCH",
    headers: { "Prefer": "return=representation" },
    body: JSON.stringify(moduleToRow(next))
  });
  return Array.isArray(rows) && rows[0] ? moduleFromRow(rows[0]) : null;
}

async function deleteModule(env, moduleId) {
  requireSupabaseForLive(env);
  if (!hasSupabase(env)) {
    return (await readModules(env)).some(item => item.id === moduleId);
  }
  const rows = await supabaseRequest(env, `/docupipe_modules?id=eq.${encodeURIComponent(moduleId)}`, {
    method: "DELETE",
    headers: { "Prefer": "return=representation" }
  });
  return Array.isArray(rows) && rows.length > 0;
}

async function upsertModules(env, modules) {
  requireSupabaseForLive(env);
  if (!hasSupabase(env)) return modules;
  const rows = await supabaseRequest(env, "/docupipe_modules", {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(modules.map(moduleToRow))
  });
  return Array.isArray(rows) ? rows.map(moduleFromRow) : [];
}

async function saveImportRecord(env, body) {
  requireSupabaseForLive(env);
  if (!hasSupabase(env)) return { mode: "seedless", saved: false };
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
  const rows = await supabaseRequest(env, "/docupipe_imports", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: JSON.stringify(row)
  });
  return { mode: "supabase", saved: true, import: Array.isArray(rows) ? rows[0] : rows };
}

async function readDashboardRecords(env) {
  if (!hasSupabase(env)) return [];
  const rows = await supabaseRequest(env, "/docupipe_imports?select=id,target,status,dashboard_record_json,created_at&order=created_at.asc&limit=1000");
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
    latest.set(`${target}:${key}`, { id: row.id, target, sourceTarget: row.target, status: row.status, record, createdAt: row.created_at });
  }
  return Array.from(latest.values());
}

async function saveDashboardRecord(env, body) {
  requireSupabaseForLive(env);
  const target = dashboardSectionForStoredTarget(body.target || body.key);
  if (!target) sendConfigError("Unknown dashboard record target.");
  const record = body.record && typeof body.record === "object" ? body.record : null;
  if (!record) sendConfigError("Missing dashboard record payload.");
  if (!hasSupabase(env)) return { mode: "seedless", saved: false, target, record };
  const row = {
    module_id: `dashboard:${target}`,
    document_id: "",
    standardization_id: "",
    target,
    status: String(body.status || "dashboard"),
    extracted_json: { source: "dashboard", recordKey: String(body.recordKey || "") },
    stedi_preview_json: {},
    dashboard_record_json: { ...record, recordKey: String(body.recordKey || storedDashboardRecordKey(target, record)) },
    warnings: []
  };
  const rows = await supabaseRequest(env, "/docupipe_imports", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: JSON.stringify(row)
  });
  return { mode: "supabase", saved: true, target, import: Array.isArray(rows) ? rows[0] : rows };
}

async function deleteDashboardRecord(env, body) {
  requireSupabaseForLive(env);
  const target = dashboardSectionForStoredTarget(body.target || body.key);
  if (!target) sendConfigError("Unknown dashboard record target.");
  const recordKey = String(body.recordKey || "");
  if (!recordKey) sendConfigError("Missing dashboard record key.");
  if (!hasSupabase(env)) return { mode: "seedless", deleted: false, target, recordKey };
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
  const rows = await supabaseRequest(env, "/docupipe_imports", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: JSON.stringify(row)
  });
  return { mode: "supabase", deleted: true, target, recordKey, import: Array.isArray(rows) ? rows[0] : rows };
}

async function supabaseRequest(env, pathname, options = {}) {
  const cfg = config(env);
  const authHeaders = {
    "apikey": cfg.supabaseServiceRoleKey
  };
  if (!cfg.supabaseServiceRoleKey.startsWith("sb_secret_")) {
    authHeaders.Authorization = `Bearer ${cfg.supabaseServiceRoleKey}`;
  }
  const response = await fetch(`${cfg.supabaseUrl}/rest/v1${pathname}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders,
      ...(options.headers || {})
    },
    body: options.body
  });
  const body = await parseResponse(response);
  if (!response.ok) {
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

async function findModule(env, moduleId) {
  const module = (await readModules(env)).find(item => item.id === moduleId);
  if (!module) {
    const error = new Error(`Unknown module: ${moduleId}`);
    error.statusCode = 404;
    throw error;
  }
  return module;
}

async function uploadToDocupipe(env, module, body) {
  const cfg = config(env);
  const documentId = makeId("doc_mock");
  const extension = getExtension(body.fileName, body.mimeType);
  if (!isLive(env) || !cfg.docupipeApiKey) {
    mockDocuments.set(documentId, { documentId, moduleId: module.id, fileName: body.fileName || "uploaded-document.pdf", mimeType: body.mimeType || "application/pdf", uploadedAt: new Date().toISOString() });
    return { mode: "mock", status: "processed", documentId, jobId: makeId("job_parse"), message: "Mock upload complete. Set APP_MODE=live and DOCUPIPE_API_KEY to call DocuPipe." };
  }
  const document = body.fileUrl ? { file: { url: body.fileUrl }, fileExtension: extension } : { file: { contents: body.fileBase64 }, fileExtension: extension };
  const payload = {
    document,
    dataset: body.dataset || "culver-city-surgical-dashboard",
    metadata: { moduleId: module.id, moduleName: module.name, originalFileName: body.fileName || null, dashboard: "culver-city-surgical-dashboard-docupipe", ...(body.metadata && typeof body.metadata === "object" ? body.metadata : {}) },
    parseVersion: 3
  };
  return { mode: "live", ...(await callJson(`${cfg.docupipeBaseUrl}/document`, { method: "POST", headers: docupipeHeaders(env), body: JSON.stringify(payload) })) };
}

async function standardizeWithDocupipe(env, module, body) {
  const cfg = config(env);
  if (!isLive(env) || !cfg.docupipeApiKey) {
    const standardizationId = makeId("std_mock");
    const jobId = makeId("job_std");
    const documentId = body.documentId || makeId("doc_mock");
    const standardization = { standardizationId, documentId, schemaId: module.docupipeSchemaId || "mock-schema", schemaName: module.name, data: mockStandardizationData(module), createdAt: new Date().toISOString() };
    mockStandardizations.set(standardizationId, standardization);
    mockJobs.set(jobId, { jobId, status: "completed", type: "standardization", standardizationId, standardizationIds: [standardizationId], documentId, completedAt: new Date().toISOString() });
    return { mode: "mock", status: "completed", jobId, standardizationId, standardizationIds: [standardizationId], message: "Mock standardization complete." };
  }
  const schemaId = String(body.schemaId || module.docupipeSchemaId || "").trim();
  if (!schemaId) sendConfigError("DocuPipe V3 requires a schema ID. Enter the DocuPipe schema ID in Advanced module metadata and save the module.");
  if (body.documentId) await waitForDocupipeDocument(env, body.documentId);
  await verifyDocupipeSchema(env, schemaId);
  const payload = {
    documentId: body.documentId,
    schemaId,
    guidelines: body.guidelines || module.guidelines,
    useMetadata: true,
    pages: Array.isArray(body.pages) ? body.pages : undefined,
    effortLevel: body.effortLevel === "high" ? "high" : "standard",
    stdVersion: 3
  };
  return { mode: "live", ...(await callJson(`${cfg.docupipeBaseUrl}/v3/standardize`, { method: "POST", headers: docupipeHeaders(env), body: JSON.stringify(payload) })) };
}

async function verifyDocupipeSchema(env, schemaId) {
  if (!isLive(env) || !config(env).docupipeApiKey) return null;
  try {
    return await getDocupipeSchema(env, schemaId);
  } catch (error) {
    if ([404, 422].includes(Number(error.statusCode))) sendConfigError(`DocuPipe schema ${schemaId} was not found or is not accessible with the API key configured on Cloudflare. Confirm the schema ID in DocuPipe and make sure Cloudflare is using the API key for the same DocuPipe account.`);
    throw error;
  }
}

async function waitForDocupipeDocument(env, documentId) {
  const deadline = Date.now() + 30000;
  for (;;) {
    const doc = await getDocupipeDocument(env, documentId);
    const status = String(doc.status || "").toLowerCase();
    if (["completed", "complete", "processed", "succeeded", "success"].includes(status)) return doc;
    if (Date.now() >= deadline) sendConfigError(`DocuPipe document ${documentId} is still ${doc.status || "processing"}. Wait for processing to complete before standardizing.`);
    await wait(1000);
  }
}

async function getDocupipeJob(env, jobId) {
  const cfg = config(env);
  if (mockJobs.has(jobId)) return { mode: "mock", ...mockJobs.get(jobId) };
  if (!isLive(env) || !cfg.docupipeApiKey) return { mode: "mock", jobId, status: "not_found", message: "Mock job not found." };
  return { mode: "live", ...(await callJson(`${cfg.docupipeBaseUrl}/job/${encodeURIComponent(jobId)}`, { method: "GET", headers: docupipeReadHeaders(env) })) };
}

async function getDocupipeDocument(env, documentId) {
  const cfg = config(env);
  if (mockDocuments.has(documentId)) return { mode: "mock", status: "processed", documentId, result: "Mock document text for dashboard testing.", document: mockDocuments.get(documentId) };
  if (!isLive(env) || !cfg.docupipeApiKey) return { mode: "mock", documentId, status: "not_found", message: "Mock document not found." };
  return { mode: "live", ...(await callJson(`${cfg.docupipeBaseUrl}/document/${encodeURIComponent(documentId)}`, { method: "GET", headers: docupipeReadHeaders(env) })) };
}

async function getStandardization(env, standardizationId) {
  const cfg = config(env);
  if (mockStandardizations.has(standardizationId)) return { mode: "mock", ...mockStandardizations.get(standardizationId) };
  if (!isLive(env) || !cfg.docupipeApiKey) return { mode: "mock", standardizationId, status: "not_found", message: "Mock standardization not found." };
  return { mode: "live", ...(await callJson(`${cfg.docupipeBaseUrl}/standardization/${encodeURIComponent(standardizationId)}`, { method: "GET", headers: docupipeReadHeaders(env) })) };
}

async function getDocupipeSchema(env, schemaId) {
  const cfg = config(env);
  if (!schemaId) sendConfigError("Missing DocuPipe schema ID.");
  if (!isLive(env) || !cfg.docupipeApiKey) return { mode: "mock", schemaId, status: "mock_valid" };
  return { mode: "live", ...(await callJson(`${cfg.docupipeBaseUrl}/schema/${encodeURIComponent(schemaId)}`, { method: "GET", headers: docupipeReadHeaders(env) })) };
}

async function listDocupipeSchemas(env, searchParams) {
  const cfg = config(env);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 1000), 1), 1000);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
  if (!isLive(env) || !cfg.docupipeApiKey) {
    const schemas = (await readModules(env)).filter(module => module.docupipeSchemaId).map(module => ({ schemaId: module.docupipeSchemaId, schemaName: `${module.name} schema`, origin: "module" }));
    return { mode: "mock", schemas, total: schemas.length, limit, offset };
  }
  const upstream = await callJson(`${cfg.docupipeBaseUrl}/schemas?limit=${limit}&offset=${offset}&exclude_payload=true`, { method: "GET", headers: docupipeReadHeaders(env) });
  const rawSchemas = Array.isArray(upstream) ? upstream : Array.isArray(upstream.schemas) ? upstream.schemas : Array.isArray(upstream.items) ? upstream.items : Array.isArray(upstream.data) ? upstream.data : [];
  const schemas = rawSchemas.map(schema => ({ schemaId: schema.schemaId || schema.id || schema._id || "", schemaName: schema.schemaName || schema.name || schema.title || "Untitled schema", description: schema.description || "", origin: schema.origin || schema.workspaceName || "", timestamp: schema.timestamp || schema.createdAt || schema.updatedAt || "" })).filter(schema => schema.schemaId);
  return { mode: "live", schemas, total: upstream.total || upstream.count || schemas.length, limit, offset };
}

async function submitToStedi(env, module, preview, body) {
  const cfg = config(env);
  if (!isLive(env) || !cfg.stediApiKey || body.confirmLiveSubmit !== true) {
    return { mode: "mock", submitted: false, message: "Mock submit complete. Set APP_MODE=live, provide STEDI_API_KEY, and pass confirmLiveSubmit=true for a live request.", referenceId: makeId("stedi_mock"), preview };
  }
  if (preview.warnings && preview.warnings.length && body.allowWarnings !== true) sendConfigError("Preview has warnings. Pass allowWarnings=true only after manual review.");
  const baseUrl = stediBaseForTarget(env, preview.target);
  if (!baseUrl || !preview.endpoint) sendConfigError(`No live Stedi endpoint configured for ${module.name}.`);
  const response = await callJson(`${baseUrl}${preview.endpoint}`, { method: "POST", headers: stediHeaders(env), body: JSON.stringify(preview.payload) });
  return { mode: "live", submitted: true, endpoint: `${baseUrl}${preview.endpoint}`, response };
}

async function callJson(url, options) {
  const response = await fetch(url, options);
  const body = await parseResponse(response);
  if (!response.ok) {
    const billingMessage = response.status === 402 ? "DocuPipe returned 402 Payment Required. Upload or parse can succeed while standardization fails when the DocuPipe account has no available standardization credits or billing access." : null;
    const notFoundMessage = response.status === 404 ? `DocuPipe returned 404 Not Found for ${new URL(url).pathname}. For V3 standardization, confirm the document ID exists and the schema ID belongs to the same DocuPipe account as this API key.` : null;
    const error = new Error(billingMessage || notFoundMessage || body.message || `Request failed with ${response.status}`);
    error.statusCode = response.status;
    error.details = { ...body, upstreamStatus: response.status, upstreamUrl: url, hint: billingMessage || notFoundMessage || undefined };
    throw error;
  }
  return body;
}

async function parseResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function docupipeHeaders(env) {
  return { "Content-Type": "application/json", "Accept": "application/json", "X-API-Key": config(env).docupipeApiKey };
}

function docupipeReadHeaders(env) {
  return { "Accept": "application/json", "X-API-Key": config(env).docupipeApiKey };
}

function stediHeaders(env) {
  return { "Content-Type": "application/json", "Accept": "application/json", "Authorization": config(env).stediApiKey };
}

function stediBaseForTarget(env, target) {
  const cfg = config(env);
  if (target === "claimAttachment275") return cfg.stediClaimsBaseUrl;
  if (target === "providerEnrollment") return cfg.stediEnrollmentsBaseUrl;
  return cfg.stediHealthcareBaseUrl;
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

function dashboardSectionForStoredTarget(target) {
  const value = String(target || "");
  if (value === "professionalClaim837P") return "claims";
  if (value === "eligibility270") return "eligibility";
  if (value === "appealsFromEra") return "appeals";
  if (value === "claimAttachment275") return "attachments";
  if (value === "providerEnrollment") return "providers";
  if (["claims", "eligibility", "providers", "payers", "enrollments", "attachments", "appeals", "cob"].includes(value)) return value;
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
  return "";
}

function defaultJsonSchema() {
  return { "$schema": "http://json-schema.org/draft-07/schema#", "description": "Extract structured billing data from the source document.", "type": "object", "properties": { "documentType": { "type": "string", "description": "Document type." } } };
}

function safeModuleId(value) {
  return String(value || "module").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "module";
}

function sendConfigError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

function mockStandardizationData(module) {
  const basePatient = { firstName: "Maya", lastName: "Rosen", fullName: "Maya Rosen", dateOfBirth: "1979-04-18", memberId: "AET123456789", accountNumber: "MR-20418" };
  if (module.stediTarget === "eligibility270") return { documentType: "eligibility", subscriber: basePatient, payer: { name: "Aetna", stediId: "AETNA", phone: "800-555-1212" }, plan: { name: "PPO Gold", type: "PPO", effectiveDate: "2026-01-01" }, encounter: { dateOfService: "2026-06-12", serviceTypeCodes: ["30"] } };
  if (module.stediTarget === "appealsFromEra") return { documentType: "era", payer: { name: "Aetna", stediId: "AETNA", paymentTraceNumber: "EFT-884201" }, denials: [{ patientName: "Maya Rosen", claimNumber: "CLM-26012", payerClaimNumber: "PC771209", dateOfService: "2026-05-22", cptCodes: ["29881"], diagnosisCodes: ["M17.11"], carcCode: "CO-50", rarcCodes: ["M127"], reason: "Medical necessity documentation requested.", billedAmount: 4820, paidAmount: 0, deniedAmount: 4820 }] };
  if (module.stediTarget === "claimAttachment275") return { documentType: "attachment", claimNumber: "CLM-26012", patientName: "Maya Rosen", payerName: "Aetna", dateOfService: "2026-05-22", attachment: { documentName: "operative-report.pdf", documentType: "Operative report", pageCount: 7, clinicalSummary: "Arthroscopic knee procedure with operative findings and postoperative plan." } };
  if (module.stediTarget === "providerEnrollment") return { documentType: "providerEnrollment", provider: { name: "Dr. Maya Rosen, MD", firstName: "Maya", lastName: "Rosen", credential: "MD", specialty: "Orthopedic surgery", npi: "1841557020", taxonomyCode: "207X00000X", taxId: "95-4412087" }, enrollment: { payerName: "Aetna", transactionType: "837P claims", submittedDate: "2026-06-12", requestedDocuments: ["W-9.pdf", "EDI agreement.pdf"] } };
  return { documentType: "claim", patient: basePatient, payer: { name: "Aetna", stediId: "AETNA", payerClaimNumber: "PC771209" }, provider: { organizationName: "Culver City Surgical Partners", renderingProviderName: "Dr. Alejandro Reyes", npi: "1841557020", taxId: "95-4412087", taxonomyCode: "207X00000X" }, claim: { claimNumber: "CLM-26012", dateOfService: "2026-05-22", placeOfService: "24", totalChargeAmount: 4820 }, serviceLines: [{ cptCode: "29881", description: "Knee arthroscopy with meniscectomy", modifiers: ["RT"], diagnosisPointers: ["M17.11"], units: 1, chargeAmount: 4820 }], diagnosisCodes: ["M17.11"] };
}

function unwrapStandardization(standardization) {
  if (!standardization || typeof standardization !== "object") return {};
  return standardization.data || standardization.result || standardization.output || standardization;
}

function buildStediPreview(env, module, standardization, overrides) {
  const data = unwrapStandardization(standardization);
  const builders = { professionalClaim837P: buildClaimPreview, eligibility270: buildEligibilityPreview, appealsFromEra: buildEraPreview, claimAttachment275: buildAttachmentPreview, providerEnrollment: buildProviderPreview };
  const target = String(overrides && overrides.target || module.stediTarget || "professionalClaim837P");
  const preview = (builders[target] || buildClaimPreview)({ ...module, stediTarget: target }, data);
  preview.module = { id: module.id, name: module.name };
  preview.standardization = data;
  preview.mode = isLive(env) ? "live" : "mock";
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
    billingProvider: { organizationName: first(provider.organizationName, providerName, "Culver City Surgical Partners"), npi: first(provider.npi, data.billingProviderNpi, data.npi, null), taxId: first(provider.taxId, data.taxId, null), taxonomyCode: first(provider.taxonomyCode, data.taxonomyCode, null) },
    subscriber: { firstName: first(patient.firstName, data.firstName, splitName(patientName).firstName, null), lastName: first(patient.lastName, data.lastName, splitName(patientName).lastName, null), dateOfBirth: compactDate(first(patient.dateOfBirth, data.dateOfBirth, null)), memberId: first(patient.memberId, data.memberId, null) },
    claimInformation: { patientControlNumber: claimNumber, placeOfServiceCode: first(claim.placeOfService, data.placeOfService, "24"), claimChargeAmount: total.toFixed(2), serviceFacilityLocation: { organizationName: serviceFacility }, serviceLines: cptLines.map((line, index) => ({ serviceLineNumber: String(index + 1), professionalService: { procedureIdentifier: "HC", procedureCode: first(line.cptCode, line.cpt, "00000"), procedureModifiers: Array.isArray(line.modifiers) ? line.modifiers.filter(Boolean) : line.modifier && line.modifier !== "-" ? [line.modifier] : [], lineItemChargeAmount: number(first(line.chargeAmount, line.charge, 0)).toFixed(2), measurementUnit: "UN", serviceUnitCount: String(first(line.units, 1)) }, diagnosisCodePointers: Array.isArray(line.diagnosisPointers) ? line.diagnosisPointers : [] })) },
    diagnosisCodes: Array.isArray(data.diagnoses) ? data.diagnoses : Array.isArray(data.diagnosisCodes) ? data.diagnosisCodes : []
  };
  const dashboardRecord = { id: claimNumber, patient: patientName, type: claimType, provider: providerName ? providerName.replace(/,.*$/, "") : "Dr. Imported", providerFull: providerName, loc: serviceFacility, payer: payerName, billed: total, paid, status: normalizeClaimStatus(first(data.status, "Draft")), dos: displayDate(first(claim.dateOfService, data.dateOfService)), lines: cptLines.map(line => ({ cpt: first(line.cptCode, line.cpt, "00000"), desc: first(line.description, "Procedure"), mod: Array.isArray(line.modifiers) ? line.modifiers.join(", ") : first(line.modifier, "") === "-" ? "" : first(line.modifier, ""), units: first(line.units, 1), charge: number(first(line.chargeAmount, line.charge, 0)) })), icds: Array.isArray(data.diagnoses) ? data.diagnoses : Array.isArray(data.diagnosisCodes) ? data.diagnosisCodes : [], payerClm: first(data.payerClaimNumber, payer.payerClaimNumber, payer.claimNumber, "Pending"), rejReason: null, denCode: null };
  return finalizePreview("professionalClaim837P", endpoint, payload, dashboardRecord, validateClaim(payload));
}

function buildEligibilityPreview(module, data) {
  const subscriber = data.subscriber || data.patient || {};
  const payer = data.payer || {};
  const plan = data.plan || {};
  const encounter = data.encounter || {};
  const name = first(subscriber.fullName, joinName(subscriber.firstName, subscriber.lastName), "Unknown Patient");
  const payload = { controlNumber: `ELG-${Date.now().toString().slice(-7)}`, tradingPartnerServiceId: first(payer.stediId, payer.name, null), provider: { organizationName: "Culver City Surgical Partners", npi: "1841557020" }, subscriber: { firstName: first(subscriber.firstName, splitName(name).firstName, null), lastName: first(subscriber.lastName, splitName(name).lastName, null), dateOfBirth: compactDate(subscriber.dateOfBirth), memberId: first(subscriber.memberId, null) }, encounter: { dateOfService: compactDate(first(encounter.dateOfService, new Date().toISOString().slice(0, 10))), serviceTypeCodes: Array.isArray(encounter.serviceTypeCodes) && encounter.serviceTypeCodes.length ? encounter.serviceTypeCodes : ["30"] } };
  const dashboardRecord = { patient: name, dob: displayDate(subscriber.dateOfBirth), member: first(subscriber.memberId, "Pending"), payer: first(payer.name, "Unknown Payer"), payerId: first(payer.stediId, payer.name, "PAYER"), plan: first(plan.name, "Imported plan"), status: "Active", copay: 0, coins: 0, dedT: 0, dedM: 0, oopT: 0, oopM: 0, group: first(subscriber.groupNumber, "Unknown"), date: displayDate(first(encounter.dateOfService, new Date().toISOString().slice(0, 10))), time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }), trn: payload.controlNumber, auth: false, planBegin: displayDate(plan.effectiveDate) };
  return finalizePreview("eligibility270", module.stediEndpoint, payload, dashboardRecord, validateEligibility(payload));
}

function buildEraPreview(module, data) {
  const payer = data.payer || {};
  const denials = Array.isArray(data.denials) ? data.denials : [];
  const denial = denials[0] || {};
  const payload = { source: "DocuPipe ERA or denial extraction", payer, denials };
  const dashboardRecord = { id: `APL-${Date.now().toString().slice(-5)}`, patientName: first(denial.patientName, "Unknown Patient"), patientDOB: "", claimNumber: first(denial.claimNumber, "Unknown"), dateOfService: displayDate(denial.dateOfService), submittedDate: displayDate(new Date().toISOString().slice(0, 10)), payer: first(payer.name, "Unknown Payer"), cptCodes: Array.isArray(denial.cptCodes) ? denial.cptCodes : [], diagnosisCodes: Array.isArray(denial.diagnosisCodes) ? denial.diagnosisCodes : [], denialCode: first(denial.carcCode, "Unknown"), denialReason: first(denial.reason, "Imported denial from DocuPipe."), appealType: "Formal Appeal", appealStatus: "Not Started", deadlineDate: displayDate(addDays(new Date(), 30).toISOString().slice(0, 10)), assignedTo: "K. Vu", amountBilled: number(first(denial.billedAmount, 0)), amountDenied: number(first(denial.deniedAmount, denial.billedAmount, 0)), appealLetterDraft: `We appeal the denial for claim ${first(denial.claimNumber, "Unknown")} under denial code ${first(denial.carcCode, "Unknown")}. ${first(denial.reason, "Please review the attached documentation and reconsider this claim.")}`, notes: "Imported from DocuPipe ERA or denial extraction.", timeline: [{ date: displayDate(new Date().toISOString().slice(0, 10)), action: "Imported denial from DocuPipe", user: "System" }] };
  const warnings = [];
  if (!denials.length) warnings.push("No denial records were extracted.");
  if (!denial.claimNumber) warnings.push("Claim number is missing.");
  if (!denial.carcCode) warnings.push("CARC denial code is missing.");
  return finalizePreview("appealsFromEra", module.stediEndpoint, payload, dashboardRecord, warnings);
}

function buildAttachmentPreview(module, data) {
  const attachment = data.attachment || {};
  const payload = { contentType: "application/pdf", claimContext: { claimNumber: first(data.claimNumber, null), patientName: first(data.patientName, null), payerName: first(data.payerName, null), dateOfService: compactDate(data.dateOfService) }, attachmentMetadata: { documentName: first(attachment.documentName, "document.pdf"), documentType: first(attachment.documentType, "Clinical document"), pageCount: number(first(attachment.pageCount, 0)), clinicalSummary: first(attachment.clinicalSummary, null) } };
  const dashboardRecord = { claim: first(data.claimNumber, "Pending"), payer: first(data.payerName, "Unknown Payer"), doc: first(attachment.documentType, "Clinical document"), req: displayDate(new Date().toISOString().slice(0, 10)), due: displayDate(addDays(new Date(), 7).toISOString().slice(0, 10)), status: "Awaiting upload", ctrl: `PWK-${Date.now().toString().slice(-6)}`, pages: number(first(attachment.pageCount, 0)) };
  const warnings = [];
  if (!data.claimNumber) warnings.push("Claim number is missing.");
  if (!data.payerName) warnings.push("Payer name is missing.");
  return finalizePreview("claimAttachment275", module.stediEndpoint, payload, dashboardRecord, warnings);
}

function buildProviderPreview(module, data) {
  const provider = data.provider || {};
  const enrollment = data.enrollment || {};
  const providerName = first(provider.name, joinName(provider.firstName, provider.lastName), "Imported Provider");
  const payload = { name: providerName, npi: first(provider.npi, null), taxId: first(provider.taxId, null), taxonomyCode: first(provider.taxonomyCode, null), specialty: first(provider.specialty, null), enrollment: { payerName: first(enrollment.payerName, null), transactionType: first(enrollment.transactionType, null), submittedDate: compactDate(enrollment.submittedDate), requestedDocuments: Array.isArray(enrollment.requestedDocuments) ? enrollment.requestedDocuments : [] } };
  const dashboardRecord = { name: providerName, last: first(provider.lastName, providerName.split(" ").slice(-1)[0], "Provider"), spec: first(provider.specialty, "Imported specialty"), tax: first(provider.taxonomyCode, "Unknown"), npi: first(provider.npi, "Pending"), live: 0, pend: 1 };
  const warnings = [];
  if (!provider.npi) warnings.push("Provider NPI is missing.");
  if (!provider.taxonomyCode) warnings.push("Taxonomy code is missing.");
  return finalizePreview("providerEnrollment", module.stediEndpoint, payload, dashboardRecord, warnings);
}

function finalizePreview(target, endpoint, payload, dashboardRecord, warnings) {
  return { target, endpoint, method: "POST", payload, dashboardRecord, warnings, summary: warnings.length ? `${warnings.length} review item(s)` : "Ready for dashboard insertion" };
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
  for (const value of values) if (value !== undefined && value !== null && String(value).trim() !== "") return value;
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
  return { firstName: parts[0] || "", lastName: parts.length > 1 ? parts[parts.length - 1] : "" };
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
