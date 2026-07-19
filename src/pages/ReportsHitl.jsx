import { useState, useMemo } from "react";
import useFetch from "../hooks/useFetch";
import {
  getHitlMetrics,
  getHitlSummary,
  getHitlCsvList,
  getHitlScenarioCsvJson,
  downloadHitlCsv,
  downloadHitlScenarioCsv,
} from "../api/hitl";
import { LoadingSpinner, ErrorBanner } from "../components/StatusState";

const MODE_TABS = ["reactive", "autonomous", "hitl"];

const urgencyBadge = {
  critical: "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-400 dark:ring-red-900",
  high: "bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:ring-orange-900",
  medium: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:ring-yellow-900",
  low: "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-900",
};

const decisionBadge = {
  accept: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  modify: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  override: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  timeout: "bg-red-500  text-white   dark:bg-red-800   dark:text-white",
};

// ── Lazy-loaded per-scenario detail ──────────────────────
function ScenarioDetail({ scenarioId }) {
  const [tab, setTab] = useState("metrics");

  // New endpoint: /hitl/csv/scenario/{id}/json/{datatype} — no mode in path
  const fileTypes = ["metrics", "event_log", "stock_log", "hitl_decision_log"];

  const metricsData  = useFetch(() => getHitlScenarioCsvJson(scenarioId, "metrics"),          [scenarioId]);
  const eventData    = useFetch(() => getHitlScenarioCsvJson(scenarioId, "event_log"),         [scenarioId]);
  const stockData    = useFetch(() => getHitlScenarioCsvJson(scenarioId, "stock_log"),         [scenarioId]);
  const hitlLogData  = useFetch(() => getHitlScenarioCsvJson(scenarioId, "hitl_decision_log"), [scenarioId]);

  const tabData = { metrics: metricsData, event_log: eventData, stock_log: stockData, hitl_decision_log: hitlLogData };
  const active  = tabData[tab];

  // Response shape: { scenario_id, mode, datatype, rows, data: [...] }
  // Unwrap .data field if present, otherwise use response directly as array
  const rawRows = active?.data
    ? (Array.isArray(active.data.data) ? active.data.data : Array.isArray(active.data) ? active.data : [])
    : [];

  // Filter out columns where ALL rows are null — keeps table clean for sparse data (e.g. stock_log)
  const nonNullCols = rawRows.length > 0
    ? Object.keys(rawRows[0]).filter((k) =>
        rawRows.some((r) => r[k] != null && r[k] !== "")
      )
    : [];

  const rows = rawRows.slice(0, 200).map((r) => {
    const filtered = {};
    nonNullCols.forEach((k) => { filtered[k] = r[k]; });
    return filtered;
  });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
      {/* Tab + download bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-wrap gap-2">
        <div className="flex gap-1">
          {fileTypes.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                tab === t
                  ? "bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {t.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {fileTypes.map((t) => (
            <button
              key={t}
              onClick={() => downloadHitlScenarioCsv(scenarioId, `${t}.csv`)}
              title={`Download ${t}.csv`}
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t}.csv
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {active?.loading ? (
        <LoadingSpinner />
      ) : active?.error ? (
        <p className="px-5 py-8 text-center text-sm text-red-500 dark:text-red-400">{active.error}</p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          No data — run scenario {scenarioId} ({mode}) first.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 dark:border-gray-800">
                {Object.keys(rows[0]).map((k) => (
                  <th key={k} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {k.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {rows.slice(0, 100).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 odd:bg-gray-50 dark:odd:bg-gray-800">
                  {Object.entries(row).map(([k, v]) => {
                    const isUrgency = k === "urgency_level" || k === "urgency";
                    const isDecision = k === "decision" || k === "manager_decision";
                    const urgKey = isUrgency ? String(v ?? "").toLowerCase() : null;
                    const decKey = isDecision ? String(v ?? "").toLowerCase() : null;
                    return (
                      <td key={k} className={`px-4 py-2.5 text-xs whitespace-nowrap ${
                        k === "scenario_id" ? "font-mono text-violet-700 dark:text-violet-400 font-medium" : "text-gray-700 dark:text-gray-300"
                      }`}>
                        {isUrgency && urgKey ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-md font-medium capitalize ${urgencyBadge[urgKey] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>{v}</span>
                        ) : isDecision && decKey ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-md font-medium capitalize ${decisionBadge[decKey] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>{v}</span>
                        ) : typeof v === "number" ? v.toFixed(2) : String(v ?? "-")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {rawRows.length > 200 && (
            <p className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-gray-800">
              Showing first 200 of {rawRows.length} rows
            </p>
          )}
        </div>
      )}
    </div>
  );
}


// ── Main Reports HITL ─────────────────────────────────────
export default function ReportsHitl() {
  const [activeTab, setActiveTab] = useState("autonomous");
  const [expandedScenario, setExpandedScenario] = useState(null);

  // Fetch data only when tab is active (lazy)
  const reactiveMetrics = useFetch(() => getHitlMetrics({ mode: "reactive" }),   []);
  const autoMetrics     = useFetch(() => getHitlMetrics({ mode: "autonomous" }), []);
  const hitlMetrics     = useFetch(() => getHitlMetrics({ mode: "hitl" }),       []);
  const reactiveSummary = useFetch(() => getHitlSummary({ mode: "reactive" }),   []);
  const autoSummary     = useFetch(() => getHitlSummary({ mode: "autonomous" }), []);
  const hitlSummary     = useFetch(() => getHitlSummary({ mode: "hitl" }),       []);
  const csvList = useFetch(getHitlCsvList);

  const savedScenarioIds = useMemo(() => {
    const rawDirs = csvList.data?.scenario_dirs ?? {};
    // New structure: keys like "scenario_01" (no mode suffix)
    const ids = new Set();
    for (const key of Object.keys(rawDirs)) {
      const m = key.match(/^scenario_(\d+)/);
      if (m) ids.add(parseInt(m[1], 10));
    }
    return [...ids].sort((a, b) => a - b);
  }, [csvList.data]);

  // For accordion: just flat per-scenario, no mode grouping
  const scenarioDirMap = useMemo(() => {
    return csvList.data?.scenario_dirs ?? {};
  }, [csvList.data]);

  // Which mode to show in per-scenario panel
  // const detailMode = activeTab === "comparison" ? "autonomous" : activeTab;

  const combinedFiles = csvList.data?.combined_files ?? [];

  const metricsForTab = activeTab === "hitl" ? hitlMetrics : activeTab === "reactive" ? reactiveMetrics : autoMetrics;
  const summaryForTab = activeTab === "hitl" ? hitlSummary : activeTab === "reactive" ? reactiveSummary : autoSummary;

  const chartData = useMemo(() => {
    const d = metricsForTab.data;
    if (!d || !Array.isArray(d)) return [];
    return d.map((r) => ({
      label: `S${r.scenario_id}`,
      disruptions: Number(r.total_disruptions) || 0,
      events: Number(r.total_events) || 0,
    }));
  }, [metricsForTab.data]);

  const maxDisruptions = Math.max(...chartData.map((d) => d.disruptions), 1);

  return (
    <div className="space-y-6">
      
      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {MODE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
              activeTab === t
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      
      {/* ── Charts ── */}
      {activeTab !== "comparison" && (
        <div className="grid grid-cols-1 gap-5">
          {/* Metrics table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
                {activeTab} Metrics Table
              </h2>
              <button
                onClick={() => downloadHitlCsv("scenario_metrics.csv")}
                className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
            {metricsForTab.loading ? <LoadingSpinner /> : metricsForTab.data && Array.isArray(metricsForTab.data) && metricsForTab.data.length > 0 ? (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900">
                    <tr className="border-b border-gray-50 dark:border-gray-800">
                      {Object.keys(metricsForTab.data[0]).map((k) => (
                        <th key={k} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">
                          {k.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {metricsForTab.data.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 odd:bg-gray-50 dark:odd:bg-gray-800">
                        {Object.entries(row).map(([k, v]) => (
                          <td key={k} className={`px-4 py-2.5 text-xs whitespace-nowrap ${k === "scenario_id" ? "font-mono text-violet-700 dark:text-violet-400 font-medium" : "text-gray-700 dark:text-gray-300"}`}>
                            {typeof v === "number" ? v.toFixed(2) : String(v ?? "-")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">No data yet.</p>
            )}
          </div>
        </div>
      )}

      
      {/* ── Per-scenario accordion (lazy load) ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Per-Scenario CSV Data</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Click a scenario to load data on-demand
          </p>
        </div>

        {csvList.loading ? (
          <LoadingSpinner message="Loading saved scenarios…" />
        ) : savedScenarioIds.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">No HITL simulations run yet.</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Go to Simulation → HITL to run scenarios.</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {savedScenarioIds.map((id) => {
              const key   = `scenario_${String(id).padStart(3, "0")}`;
              const files = scenarioDirMap[key] ?? [];
              const hasFiles = files.length > 0;
              return (
                <div key={id}>
                  <button
                    onClick={() => setExpandedScenario(expandedScenario === id ? null : id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left group ${
                      hasFiles
                        ? "border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-800 hover:bg-violet-50/30 dark:hover:bg-violet-950/20"
                        : "border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed"
                    }`}
                    disabled={!hasFiles}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-violet-700 dark:text-violet-400">
                        scenario_{String(id).padStart(3, "0")}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {files.length} file{files.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {hasFiles && (
                      <svg className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${expandedScenario === id ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>

                  {expandedScenario === id && hasFiles && (
                    <div className="mt-2">
                      <ScenarioDetail scenarioId={id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
