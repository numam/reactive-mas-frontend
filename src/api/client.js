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

// ─── Scenarios ───────────────────────────────────────────
export const getScenarios = () => request("/scenarios");
export const getScenario = (id) => request(`/scenarios/${id}`);
export const getScenarioEvents = (id) => request(`/scenarios/${id}/events`);

// ─── Simulation ──────────────────────────────────────────
export const simulateScenario = (body) =>
  request("/simulate/scenario", { method: "POST", body: JSON.stringify(body) });
export const simulateAll = (body = { verbose: false }) =>
  request("/simulate/all", { method: "POST", body: JSON.stringify(body) });
export const simulateCustom = (body) =>
  request("/simulate/custom", { method: "POST", body: JSON.stringify(body) });

// ─── Results (combined CSVs) ──────────────────────────────
export const getMetrics = () => request("/results/metrics");

export const getStockLog = (params = {}) => {
  const q = new URLSearchParams();
  if (params.scenario_id != null) q.set("scenario_id", params.scenario_id);
  if (params.node_type) q.set("node_type", params.node_type);
  if (params.limit) q.set("limit", params.limit);
  return request(`/results/stock-log?${q}`);
};

export const getEventLog = (params = {}) => {
  const q = new URLSearchParams();
  if (params.scenario_id != null) q.set("scenario_id", params.scenario_id);
  if (params.rule_id) q.set("rule_id", params.rule_id);
  if (params.urgency) q.set("urgency", params.urgency);
  return request(`/results/event-log?${q}`);
};

export const getSummary = () => request("/results/summary");
export const getRuleFrequency = (scenarioId) =>
  request(`/results/rule-frequency${scenarioId != null ? `?scenario_id=${scenarioId}` : ""}`);
export const getDecisionDistribution = (scenarioId) =>
  request(`/results/decision-distribution${scenarioId != null ? `?scenario_id=${scenarioId}` : ""}`);

// ─── CSV Management ──────────────────────────────────────
/** List all available CSV files in output/ */
export const getCsvList = () => request("/csv/list");

/**
 * Get per-scenario CSV data as JSON for charts/tables.
 * datatype: "metrics" | "stock_log" | "event_log"
 */
export const getScenarioCsvJson = (scenarioId, datatype) => {
  return request(`/csv/scenario/${scenarioId}/json/${datatype}`);
};

// src/api/simulationApi.js
export const getDisruptionsSummary = () => request("/results/disruptions-per-scenario");

/**
 * Trigger browser download of a combined CSV file.
 * filename: e.g. "scenario_metrics.csv", "stock_log_all.csv"
 */
export function downloadCsv(filename) {
  const a = document.createElement("a");
  a.href = `${BASE_URL}/csv/download/${encodeURIComponent(filename)}`;
  a.download = filename;
  a.click();
}

/**
 * Trigger browser download of a per-scenario CSV file.
 * filename: e.g. "metrics.csv", "event_log.csv"
 * Backend endpoint expects integer scenario ID
 */
export function downloadScenarioCsv(scenarioId, filename) {
  const a = document.createElement("a");
  a.href = `${BASE_URL}/csv/scenario/${scenarioId}/${encodeURIComponent(filename)}`;
  a.download = filename;
  a.click();
}
