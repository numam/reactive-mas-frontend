const BASE_URL = "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Info ────────────────────────────────────────────────
export const getServerStatus = () => request("/");

// ─── Agent Database ──────────────────────────────────────
export const getAgents = () => request("/agents");
export const getAgent = (nodeType) => request(`/agents/${nodeType}`);
export const getAgentInitialState = (nodeType) =>
  request(`/agents/${nodeType}/initial-state`);

// ─── Disruption Engine ───────────────────────────────────
export const checkDisruption = (body) =>
  request("/check-disruption", { method: "POST", body: JSON.stringify(body) });
export const checkRecovery = (body) =>
  request("/check-recovery", { method: "POST", body: JSON.stringify(body) });

// ─── Orchestrator Rules ──────────────────────────────────
export const getRules = () => request("/rules");
export const getRule = (ruleId) => request(`/rules/${ruleId}`);
export const matchRule = (params) =>
  request(`/match-rule?${new URLSearchParams(params)}`);

// ─── Reactive Scenarios (100 scenarios via /hitl/scenarios) ──────────────────
/**
 * GET /hitl/scenarios — fetch all 100 reactive scenarios
 * page_size=100 returns all at once
 */
export const getReactiveScenarios = (params = {}) => {
  const q = new URLSearchParams();
  if (params.severity)        q.set("severity",        params.severity);
  if (params.disruption_type) q.set("disruption_type", params.disruption_type);
  q.set("page",      String(params.page      ?? 1));
  q.set("page_size", String(params.page_size ?? 100));
  return request(`/hitl/scenarios?${q}`);
};

export const getReactiveScenarioById = (id) => request(`/hitl/scenarios/${id}`);

// ─── Reactive Simulation ─────────────────────────────────
/**
 * POST /hitl/simulate/scenario — mode fixed to "reactive"
 * Supports AbortSignal for cancellation
 */
export const simulateReactiveScenario = (body, signal) =>
  request("/hitl/simulate/scenario", {
    method: "POST",
    body: JSON.stringify({ ...body, mode: "reactive" }),
    ...(signal ? { signal } : {}),
  });

// ─── Reactive Results ────────────────────────────────────
export const getReactiveMetrics = (params = {}) => {
  const q = new URLSearchParams();
  q.set("mode", "reactive");
  if (params.severity)            q.set("severity",    params.severity);
  if (params.scenario_id != null) q.set("scenario_id", params.scenario_id);
  return request(`/hitl/results/metrics?${q}`);
};

export const getReactiveSummary = () =>
  request("/hitl/results/summary?mode=reactive");

export const getReactiveEventLog = (params = {}) => {
  const q = new URLSearchParams();
  q.set("mode", "reactive");
  if (params.scenario_id != null) q.set("scenario_id", params.scenario_id);
  if (params.rule_id)             q.set("rule_id",     params.rule_id);
  if (params.limit)               q.set("limit",       String(params.limit));
  return request(`/hitl/results/event-log?${q}`);
};

export const getReactiveStockLog = (params = {}) => {
  const q = new URLSearchParams();
  q.set("mode", "reactive");
  if (params.scenario_id != null) q.set("scenario_id", params.scenario_id);
  if (params.node_type)           q.set("node_type",   params.node_type);
  if (params.limit)               q.set("limit",       String(params.limit));
  return request(`/hitl/results/stock-log?${q}`);
};

// ─── Reactive CSV Management ─────────────────────────────
export const getReactiveCsvList = () => request("/hitl/csv/list");

export const getReactiveScenarioCsvJson = (scenarioId, datatype) =>
  request(`/hitl/csv/scenario/${scenarioId}/json/${datatype}`);

export function downloadReactiveCsv(filename) {
  const a = document.createElement("a");
  a.href = `${BASE_URL}/hitl/csv/download/${encodeURIComponent(filename)}`;
  a.download = filename;
  a.click();
}

export function downloadReactiveScenarioCsv(scenarioId, filename) {
  const a = document.createElement("a");
  a.href = `${BASE_URL}/hitl/csv/scenario/${scenarioId}/${encodeURIComponent(filename)}`;
  a.download = filename;
  a.click();
}

// ─── Legacy endpoints (used by Reports page) ─────────────
export const getMetrics       = () => getReactiveMetrics();
export const getSummary       = () => getReactiveSummary();
export const getCsvList       = () => getReactiveCsvList();
export const getScenarioCsvJson = (scenarioId, datatype) =>
  getReactiveScenarioCsvJson(scenarioId, datatype);
export const downloadCsv      = (filename) => downloadReactiveCsv(filename);
export const downloadScenarioCsv = (scenarioId, filename) =>
  downloadReactiveScenarioCsv(scenarioId, filename);

export const getRuleFrequency = (scenarioId) =>
  request(`/results/rule-frequency${scenarioId != null ? `?scenario_id=${scenarioId}` : ""}`);
export const getDecisionDistribution = (scenarioId) =>
  request(`/results/decision-distribution${scenarioId != null ? `?scenario_id=${scenarioId}` : ""}`);

// Alias used by Dashboard
export const getScenarios = () => getReactiveScenarios({ page_size: 100 });
