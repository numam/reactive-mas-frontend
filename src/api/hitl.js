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

// ─── HITL Scenarios ──────────────────────────────────────
/**
 * GET /hitl/scenarios
 * Supports pagination: page, page_size (default 20, max 100)
 * Also supports filters: severity, disruption_type
 * To get all 100: page_size=100
 */
export const getHitlScenarios = (params = {}) => {
  const q = new URLSearchParams();
  if (params.severity)        q.set("severity",        params.severity);
  if (params.disruption_type) q.set("disruption_type", params.disruption_type);
  q.set("page",      String(params.page      ?? 1));
  q.set("page_size", String(params.page_size ?? 100)); // fetch all by default
  return request(`/hitl/scenarios?${q}`);
};

export const getHitlScenarioById   = (id) => request(`/hitl/scenarios/${id}`);
export const getHitlScenarioEvents = (id) => request(`/hitl/scenarios/${id}/events`);
export const getHitlSeverityDist   = ()   => request("/hitl/scenarios/meta/severity-distribution");
export const getHitlTypeDist       = ()   => request("/hitl/scenarios/meta/type-distribution");

// ─── Manager Profiles ─────────────────────────────────────
export const getManagerProfiles = ()     => request("/hitl/manager-profiles");
export const getManagerProfile  = (tier) => request(`/hitl/manager-profiles/${tier}`);

// ─── Simulation ───────────────────────────────────────────
/**
 * POST /hitl/simulate/scenario
 * mode: "reactive" | "autonomous" | "hitl" | "all"
 * mode "all" runs all 3 modes and returns comparison
 */
export const hitlSimulateScenario = (body) =>
  request("/hitl/simulate/scenario", { method: "POST", body: JSON.stringify(body) });

/**
 * POST /hitl/simulate/batch
 * body: { mode, rng_seed, scenario_ids }
 * scenario_ids: null → all 100
 */
export const hitlSimulateBatch = (body) =>
  request("/hitl/simulate/batch", { method: "POST", body: JSON.stringify(body) });

// ─── Results ──────────────────────────────────────────────
export const getHitlMetrics = (params = {}) => {
  const q = new URLSearchParams();
  if (params.mode)                q.set("mode",        params.mode);
  if (params.severity)            q.set("severity",    params.severity);
  if (params.scenario_id != null) q.set("scenario_id", params.scenario_id);
  return request(`/hitl/results/metrics?${q}`);
};

export const getHitlComparison = () => request("/hitl/results/comparison");

export const getHitlSummary = (params = {}) => {
  const q = new URLSearchParams();
  if (params.mode) q.set("mode", params.mode); // mode required
  return request(`/hitl/results/summary?${q}`);
};

export const getHitlLog = (params = {}) => {
  const q = new URLSearchParams();
  if (params.scenario_id != null) q.set("scenario_id", params.scenario_id);
  if (params.tier)                q.set("tier",        params.tier);
  if (params.decision)            q.set("decision",    params.decision);
  if (params.limit)               q.set("limit",       params.limit);
  return request(`/hitl/results/hitl-log?${q}`);
};

export const getHitlLogStats = (params = {}) => {
  const q = new URLSearchParams();
  if (params.scenario_id != null) q.set("scenario_id", params.scenario_id);
  return request(`/hitl/results/hitl-log/stats?${q}`);
};

export const getHitlStockLog = (params = {}) => {
  const q = new URLSearchParams();
  if (params.scenario_id != null) q.set("scenario_id", params.scenario_id);
  if (params.mode)                q.set("mode",        params.mode);
  if (params.node_type)           q.set("node_type",   params.node_type);
  if (params.limit)               q.set("limit",       params.limit);
  return request(`/hitl/results/stock-log?${q}`);
};

export const getHitlEventLog = (params = {}) => {
  const q = new URLSearchParams();
  if (params.scenario_id != null) q.set("scenario_id", params.scenario_id);
  if (params.mode)                q.set("mode",        params.mode);
  if (params.rule_id)             q.set("rule_id",     params.rule_id);
  if (params.limit)               q.set("limit",       params.limit);
  return request(`/hitl/results/event-log?${q}`);
};

export const getHitlSarBySeverity = () => request("/hitl/results/sar-by-severity");

// ─── CSV Files ────────────────────────────────────────────
export const getHitlCsvList = () => request("/hitl/csv/list");

/**
 * GET /hitl/csv/scenario/{id}/json/{datatype}
 * datatype: metrics | stock_log | event_log | hitl_decision_log
 */
export const getHitlScenarioCsvJson = (scenarioId, datatype) =>
  request(`/hitl/csv/scenario/${scenarioId}/json/${datatype}`);

/** Download combined CSV files from hitl/output_3mode/ */
export function downloadHitlCsv(filename) {
  const a = document.createElement("a");
  a.href = `${BASE_URL}/hitl/csv/download/${encodeURIComponent(filename)}`;
  a.download = filename;
  a.click();
}

/** Download per-scenario CSV file */
export function downloadHitlScenarioCsv(scenarioId, filename) {
  const a = document.createElement("a");
  a.href = `${BASE_URL}/hitl/csv/scenario/${scenarioId}/${encodeURIComponent(filename)}`;
  a.download = filename;
  a.click();
}

// ─── Combined CSV filenames (for download buttons) ────────
export const HITL_COMBINED_FILES = [
  "scenario_metrics_3mode.csv",
  "stock_log_all.csv",
  "event_log_all.csv",
  "hitl_decision_log.csv",
  "summary_reactive.csv",
  "summary_autonomous.csv",
  "summary_hitl.csv",
  "comparison_3mode.csv",
];
