import { useState, useEffect, useMemo } from "react";
import useFetch from "../hooks/useFetch";
import {
  getMetrics,
  getDecisionDistribution,
  getRuleFrequency,
  getSummary,
  getCsvList,
  getScenarioCsvJson,
  downloadCsv,
  downloadScenarioCsv,
} from "../api/client";
import { LoadingSpinner, ErrorBanner } from "../components/StatusState";

const SCENARIO_IDS = [1, 2, 3, 4, 5];
const SCENARIO_OPTS = [null, ...SCENARIO_IDS];

const urgencyColors = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-yellow-400",
  low: "bg-blue-400",
};

const urgencyBadge = {
  critical: "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-400 dark:ring-red-900",
  high: "bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:ring-orange-900",
  medium: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:ring-yellow-900",
  low: "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-900",
};

// ── Per-scenario detail panel (fetches from /csv/scenario/{id}/json/{type}) ──
function ScenarioDetail({ scenarioId, availableIds }) {
  const [tab, setTab] = useState("metrics");

  const metricsData = useFetch(() => getScenarioCsvJson(scenarioId, "metrics"), [scenarioId]);
  const eventData = useFetch(() => getScenarioCsvJson(scenarioId, "event_log"), [scenarioId]);
  const stockData = useFetch(() => getScenarioCsvJson(scenarioId, "stock_log"), [scenarioId]);

  const active = { metrics: metricsData, event_log: eventData, stock_log: stockData }[tab];
  // API returns { scenario_id, datatype, rows, data: [...] }
  const rows = Array.isArray(active.data?.data) ? active.data.data : 
               Array.isArray(active.data) ? active.data : [];

  

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl rounded-t-none border border-gray-100 dark:border-gray-800 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-gray-700 dark:text-gray-200">
            Result detail of <span className="uppercase">scenario</span> {String(scenarioId).padStart(2)}
          </span>
          {/* Tab switcher */}
          <div className="flex gap-1">
            {["metrics", "event_log", "stock_log"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`cursor-pointer text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                  tab === t
                    ? "bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Download buttons */}
        <div className="flex items-center gap-2">
          {["metrics.csv", "event_log.csv", "stock_log.csv"].map((fname) => (
            <button
              key={fname}
              onClick={() => downloadScenarioCsv(scenarioId, fname)}
              title={`Download ${fname}`}
              className="cursor-pointer flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {fname}
            </button>
          ))}
        </div>
      </div>

      {/* Table content */}
      {active.loading ? (
        <LoadingSpinner />
      ) : active.error ? (
        <div className="px-5 py-8 text-center text-sm text-red-500 dark:text-red-400">
          {active.error}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          No data — run scenario {scenarioId} first.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 dark:border-gray-800">
                {Object.keys(rows[0]).map((k) => (
                  <th key={k} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {k.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.slice(0, 100).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors odd:bg-gray-50 dark:odd:bg-gray-800">
                  {Object.entries(row).map(([k, v]) => {
                    const isUrgency = k === "urgency_level" || k === "urgency";
                    const urgKey = isUrgency ? String(v ?? "").toLowerCase() : null;
                    return (
                      <td key={k} className={`px-5 py-2.5 text-xs whitespace-nowrap ${
                        k === "scenario_id" ? "font-mono text-violet-700 dark:text-violet-400 font-medium" : "text-gray-700 dark:text-gray-300"
                      }`}>
                        {isUrgency && urgKey ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-md font-medium capitalize ${urgencyBadge[urgKey] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                            {v}
                          </span>
                        ) : typeof v === "number" ? v.toFixed(2) : String(v ?? "-")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 100 && (
            <p className="px-5 py-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-gray-800">
              Showing first 100 of {rows.length} rows
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Reports page ─────────────────────────────────────────────────────────
export default function Reports() {
  const [scenarioFilter, setScenarioFilter] = useState(null);
  const [expandedScenario, setExpandedScenario] = useState(null);

  // Combined result endpoints
  const metrics = useFetch(getMetrics);
  const summary = useFetch(getSummary);
  const ruleFreq = useFetch(() => getRuleFrequency(scenarioFilter), [scenarioFilter]);
  const decisionDist = useFetch(() => getDecisionDistribution(scenarioFilter), [scenarioFilter]);

  // CSV list to know which scenarios have been run
  // Use a refresh trigger to re-fetch when new simulations are added
  const [csvRefreshTrigger, setCsvRefreshTrigger] = useState(0);
  const csvList = useFetch(getCsvList, [csvRefreshTrigger]);
  
  // Auto-refresh CSV list every 2 seconds when Reports page is visible
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     csvList.refetch?.();
  //   }, 2000);
  //   return () => clearInterval(interval);
  // }, [csvList]);
  
  const savedScenarioIds = useMemo(() => {
    if (!csvList.data?.scenario_dirs) return [];
    // Parse scenario keys like "scenario_01" -> 1
    return Object.keys(csvList.data.scenario_dirs)
      .map(key => {
        const match = key.match(/scenario_(\d+)/);
        return match ? parseInt(match[1]) : null;
      })
      .filter(id => id !== null)
      .sort((a, b) => a - b);
  }, [csvList.data]);

  const combinedFiles = csvList.data?.combined_files ?? [];

  // Chart data
  const chartData = useMemo(() => {
    if (!metrics.data) return [];
    // Handle both array and single object responses
    const data = Array.isArray(metrics.data) ? metrics.data : [metrics.data];
    return data
      .map((r) => {
        const scenarioId = r.scenario_id;
        return {
          label: `S${scenarioId}`,
          disruptions: Math.max(0, Number(r.total_disruptions) || Number(r.disruptions) || 0),
          events: Math.max(0, Number(r.total_events) || Number(r.events) || 0),
          recovery: Math.max(0, Number(r.avg_recovery_time) || Number(r.recovery_time) || 0),
        };
      })
      .sort((a, b) => parseInt(a.label.substring(1)) - parseInt(b.label.substring(1)));
  }, [metrics.data]);

  const maxDisruptions = Math.max(...chartData.map((d) => d.disruptions), 1);
  const maxEvents = Math.max(...chartData.map((d) => d.events), 1);

  const topRules = useMemo(() => {
    if (!ruleFreq.data || !Array.isArray(ruleFreq.data)) return [];
    return [...ruleFreq.data].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [ruleFreq.data]);
  const maxRuleCount = topRules[0]?.count || 1;

  const decisions = useMemo(() => {
    if (!decisionDist.data || !Array.isArray(decisionDist.data)) return [];
    return decisionDist.data;
  }, [decisionDist.data]);
  const totalDecisions = decisions.reduce((s, d) => s + (Number(d.count) || 0), 0);

  const anyError = metrics.error || ruleFreq.error;

  return (
    <div className="space-y-6">
      
      {/* {anyError && (
        <ErrorBanner
          message={anyError}
          onRetry={() => { metrics.refetch(); ruleFreq.refetch(); decisionDist.refetch(); }}
        />
      )} */}

      {/* ── KPI Summary cards ── */}
      {!summary.loading && summary.data && Array.isArray(summary.data) && summary.data.length > 0 && (() => {
        const row = summary.data[0];
        const kpis = Object.entries(row).filter(([k]) => k !== "scenario_id" && row[k] != null);
        if (!kpis.length) return null;
        return (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.slice(0, 4).map(([k, v]) => (
              <div key={k} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-xs">
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
                  {k.replace(/_/g, " ")}
                </p>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-1 truncate">
                  {typeof v === "number" ? v.toFixed(2) : String(v)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">all scenarios</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Scenario filter ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Filter:</span>
        {SCENARIO_OPTS.map((s) => {
          const hasCsv = s === null || savedScenarioIds.includes(s);
          return (
            <button
              key={String(s)}
              onClick={() => setScenarioFilter(s)}
              className={`cursor-pointer relative text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                scenarioFilter === s
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700"
              }`}
            >
              {s === null ? "All" : `S${s}`}
              {/* Green dot if CSV exists */}
              {s !== null && hasCsv && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white dark:border-gray-900" />
              )}
            </button>
          );
        })}
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
          {savedScenarioIds.length === 0
            ? "No simulations run yet"
            : `${savedScenarioIds.length} scenario${savedScenarioIds.length > 1 ? "s" : ""} saved`}
        </span>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Decision distribution */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Decision Distribution</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">event_log_all.csv</p>
          </div>
          {decisionDist.loading ? (
            <LoadingSpinner />
          ) : decisions.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
              No data — run a simulation first.
            </p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-72 overflow-y-auto">
              {decisions.map((d, i) => {
                const pct = totalDecisions > 0 ? Math.round((d.count / totalDecisions) * 100) : 0;
                const urgKey = (d.urgency_level ?? "").toLowerCase();
                return (
                  <div key={i} className="px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate" title={d.orchestrator_decision}>
                          {d.orchestrator_decision ?? "-"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {urgKey && (
                            <span className={`inline-flex px-1.5 py-0 rounded text-xs font-medium capitalize ${urgencyBadge[urgKey] ?? ""}`}>
                              {urgKey}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{d.count}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{pct}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                      <div
                        className={`${urgencyColors[urgKey] ?? "bg-violet-500"} h-1 rounded-full`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* ── Rule frequency ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Rule Activation Frequency
                {!ruleFreq.loading && topRules.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                    top {topRules.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">event_log_all.csv</p>
            </div>
          </div>
          {ruleFreq.loading ? (
            <LoadingSpinner />
          ) : topRules.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
              No rule data — run a simulation first.
            </p>
          ) : (
            <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-x-10 gap-y-3">
              {topRules.map((r) => (
                <div key={r.rule_id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{r.rule_id}</span>
                    <span className="text-gray-500 dark:text-gray-400">{r.count} ×</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-violet-500 dark:bg-violet-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${(r.count / maxRuleCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      

      {/* ── Per-Scenario Metrics table (from combined CSV) ── */}
      {!metrics.loading && metrics.data && Array.isArray(metrics.data) && metrics.data.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Per-Scenario Metrics</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">scenario_metrics.csv</p>
            </div>
            <button
              onClick={() => downloadCsv("scenario_metrics.csv")}
              className="cursor-pointer flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800">
                  {Object.keys(metrics.data[0]).map((k) => (
                    <th key={k} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {k.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {metrics.data.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors odd:bg-gray-50 dark:odd:bg-gray-800">
                    {Object.entries(row).map(([k, v]) => (
                      <td key={k} className={`px-5 py-3 text-xs whitespace-nowrap ${
                        k === "scenario_id"
                          ? "font-mono text-violet-700 dark:text-violet-400 font-medium"
                          : "text-gray-700 dark:text-gray-300"
                      }`}>
                        {typeof v === "number" ? v.toFixed(2) : String(v ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Per-Scenario CSV detail (expandable) ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Per-Scenario CSV Data</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Browse metrics, event log, and stock log per scenario
          </p>
        </div>

        {csvList.loading ? (
          <LoadingSpinner message="Loading saved scenarios…" />
        ) : csvList.error ? (
          <ErrorBanner message={`Failed to load scenarios: ${csvList.error}`} />
        ) : savedScenarioIds.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">No simulation results yet.</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Run a simulation from the Simulation page first.</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {savedScenarioIds.map((id) => (
              <div key={id}>
                {/* Accordion header */}
                <button
                  onClick={() => setExpandedScenario(expandedScenario === id ? null : id)}
                  className={`cursor-pointer w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-800 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all text-left group ${
                    expandedScenario === id ? "rounded-b-none" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">
                      Scenario {String(id).padStart(2)}
                    </span>
                    <div className="flex gap-1.5">
                      {["metrics.csv", "event_log.csv", "stock_log.csv"].map((f) => (
                        <span
                          key={f}
                          className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-mono"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${
                      expandedScenario === id ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Accordion content */}
                {expandedScenario === id && (
                  <div>
                    <ScenarioDetail scenarioId={id} availableIds={savedScenarioIds} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
