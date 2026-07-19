import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  hitlSimulateScenario,
  getHitlScenarios,
  getHitlCsvList,
  getHitlLog,
  downloadHitlCsv,
  downloadHitlScenarioCsv,
} from "../api/hitl";
import useFetch from "../hooks/useFetch";
import { ErrorBanner } from "../components/StatusState";

// ── Constants ─────────────────────────────────────────────
const MODE_OPTS = [
  { value: "reactive",   label: "Reactive",   desc: "Fixed reorder policy, no MAS coordination" },
  { value: "autonomous", label: "Autonomous", desc: "MAS coordinator active, no human review"    },
  { value: "hitl",       label: "HITL",       desc: "MAS + manager advisory (accept/modify/override)" },
  { value: "all",        label: "All 3",      desc: "Run all modes and show 3-way comparison"    },
];

const SEV_STYLE = {
  low:    "text-green-600  dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  high:   "text-orange-600 dark:text-orange-400",
  crisis: "text-red-600    dark:text-red-400",
};

const STATUS_LEFT_BAR = {
  idle:    "bg-gray-200   dark:bg-gray-700",
  queued:  "bg-gray-300   dark:bg-gray-600",
  running: "bg-violet-500",
  done:    "bg-green-500",
  error:   "bg-red-500",
};

const MODE_BADGE = {
  reactive:   "bg-gray-100   text-gray-600   dark:bg-gray-800  dark:text-gray-400",
  autonomous: "bg-blue-50    text-blue-700   dark:bg-blue-950  dark:text-blue-400",
  hitl:       "bg-violet-50  text-violet-700 dark:bg-violet-950 dark:text-violet-400",
};

const urgencyBadge = {
  crisis: "bg-red-50    text-red-700    dark:bg-red-950    dark:text-red-400",
  high:     "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  normal:   "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
};

const decisionBadge = {
  accept:   "bg-green-50  text-green-700  dark:bg-green-950  dark:text-green-400",
  modify:   "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  override: "bg-red-50    text-red-700    dark:bg-red-950    dark:text-red-400",
  timeout:  "bg-red-500  text-white   dark:bg-red-800   dark:text-white",
};

// ── Elapsed timer ─────────────────────────────────────────
function useElapsedTimer(running) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (running) {
      ref.current = Date.now();
      setElapsed(0);
      const id = setInterval(() => setElapsed(Math.floor((Date.now() - ref.current) / 1000)), 1000);
      return () => clearInterval(id);
    } else { setElapsed(0); }
  }, [running]);
  return elapsed;
}

function fmtTime(s) { return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; }

// ── Progress Banner ───────────────────────────────────────
function ProgressBanner({ currentId, currentIdx, total, mode, elapsed, doneIds, errorIds }) {
  const pct = total > 0 ? Math.round((doneIds.length / total) * 100) : 0;
  const DOTS_SHOW = 50; // show first 50 dots

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-violet-200 dark:border-violet-800 p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-violet-300 dark:border-violet-700 border-t-violet-600 rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Running Scenario{" "}
              <span className="text-violet-600 dark:text-violet-400 font-mono">#{currentId}</span>
              <span className="text-gray-400 dark:text-gray-500 font-normal text-xs ml-1">
                ({currentIdx}/{total})
              </span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Mode: <span className="font-medium capitalize">{mode}</span>
              {" · "}Elapsed: <span className="font-mono">{fmtTime(elapsed)}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-violet-600 dark:text-violet-400">{pct}%</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {doneIds.length} done
            {errorIds.length > 0 && <span className="text-red-500 ml-1">· {errorIds.length} error</span>}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* Scenario dots — first 50 */}
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
          Scenarios 1–{DOTS_SHOW}
          {total > DOTS_SHOW && <span className="ml-1 text-gray-300 dark:text-gray-600">(showing first {DOTS_SHOW} of {total})</span>}
        </p>
        <div className="flex flex-wrap gap-0.5">
          {Array.from({ length: Math.min(total, DOTS_SHOW) }, (_, i) => {
            const id = i + 1;
            const isDone    = doneIds.includes(id);
            const isError   = errorIds.includes(id);
            const isRunning = id === currentId;
            return (
              <div key={id} title={`S${id}`}
                className={`w-5 h-5 rounded text-xs font-mono flex items-center justify-center transition-all ${
                  isRunning ? "bg-violet-500 text-white scale-110 shadow-sm"
                  : isDone   ? "bg-green-500 text-white"
                  : isError  ? "bg-red-400 text-white"
                  : id < currentId ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600"
                }`}>
                {isRunning ? "▶" : isDone ? "✓" : isError ? "✕" : id}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Scenario Card ─────────────────────────────────────────
function ScenarioCard({ scenario, status, elapsed, result, isSelected, mode, onClick }) {
  const id  = scenario?.scenario_id;
  const sev = scenario?.severity ?? "medium";
  const isRunning = status === "running";
  const isDone    = status === "done";
  const isError   = status === "error";

  // For mode=all, show first result's metrics
  const doneMetrics = isDone
    ? (Array.isArray(result?.results) ? result.results[0]?.metrics : result?.metrics) ?? {}
    : null;

  return (
    <div onClick={onClick}
      className={`relative flex rounded-xl border cursor-pointer select-none transition-all duration-150 overflow-hidden ${
        isSelected && status === "idle"
          ? "bg-white dark:bg-gray-900 border-violet-300 dark:border-violet-700"
          : isRunning ? "bg-white dark:bg-gray-900 border-violet-200 dark:border-violet-800"
          : isDone    ? "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
          : isError   ? "bg-white dark:bg-gray-900 border-red-200 dark:border-red-900"
          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
      }`}>
      <div className={`w-0.5 shrink-0 rounded-l-xl transition-colors duration-300 ${STATUS_LEFT_BAR[status]}`} />
      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-start justify-between gap-1 mb-1">
          <div>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 font-mono">S{String(id).padStart(3, "0")}</p>
            <p className={`text-xs capitalize ${SEV_STYLE[sev]}`}>{sev}</p>
          </div>
          <div className="shrink-0">
            {isRunning && (
              <span className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-violet-500" />
                </span>
                {fmtTime(elapsed)}
              </span>
            )}
            {isDone && (
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isError   && <span className="text-xs text-red-400">✕</span>}
            {status === "queued" && <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
          </div>
        </div>

        {scenario?.disruption_type && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize leading-tight">
            {scenario.disruption_type.replace(/_/g, " ")}
          </p>
        )}

        {isRunning && (
          <div className="mt-1.5 h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-violet-400 rounded-full animate-pulse" style={{ width: "55%" }} />
          </div>
        )}

        {isDone && doneMetrics && (() => {
          const sar = doneMetrics["Stock Availability Rate (%)"] ?? doneMetrics["sar"] ?? doneMetrics["SAR"];
          if (sar == null) return null;
          return (
            <div className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 dark:text-gray-500">SAR</p>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                {typeof sar === "number" ? sar.toFixed(1) : sar}%
              </p>
            </div>
          );
        })()}

        {isError && result?.error && (
          <p className="mt-1 text-xs text-red-400 truncate" title={result.error}>{result.error}</p>
        )}
      </div>
    </div>
  );
}

// ── 3-way comparison table ────────────────────────────────
function ComparisonTable({ data }) {
  if (!data || !Array.isArray(data) || !data.length) return null;
  const keys = Object.keys(data[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-50 dark:border-gray-800">
            {keys.map((k) => (
              <th key={k} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">
                {k.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
              {Object.entries(row).map(([k, v]) => {
                const num      = typeof v === "number" ? v : null;
                const isPct    = k.includes("pct") || k.includes("_vs_");
                const isSig    = k.includes("sig");
                const isMetric = k === "Metric" || k === "metric";
                const isPos    = isPct && num != null && num > 0;
                const isNeg    = isPct && num != null && num < 0;
                return (
                  <td key={k} className={`px-4 py-2.5 text-xs whitespace-nowrap ${
                    isMetric ? "font-medium text-gray-900 dark:text-gray-100"
                    : isSig   ? "font-mono font-bold text-violet-700 dark:text-violet-400"
                    : isPos   ? "text-green-600 dark:text-green-400 font-medium"
                    : isNeg   ? "text-red-500 dark:text-red-400 font-medium"
                    : "text-gray-700 dark:text-gray-300"
                  }`}>
                    {num != null ? (isPct && num > 0 ? `+${num.toFixed(1)}%` : isPct ? `${num.toFixed(1)}%` : num.toFixed(2)) : String(v ?? "-")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Saved CSV Panel ───────────────────────────────────────
function SavedCsvPanel({ refreshKey }) {
  const csvList = useFetch(getHitlCsvList, [refreshKey]);
  if (csvList.loading) return (
    <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
      <div className="w-3.5 h-3.5 border-2 border-gray-300 dark:border-gray-600 border-t-violet-500 rounded-full animate-spin" />
      Loading…
    </div>
  );
  if (csvList.error) return <p className="text-xs text-red-500 py-2">{csvList.error}</p>;
  const data = csvList.data;
  if (!data) return null;

  const combined   = data.combined_files ?? [];
  const rawDirs    = data.scenario_dirs  ?? {};
  const scenarioKeys = Object.keys(rawDirs).sort();
  const hasAny = combined.length > 0 || scenarioKeys.length > 0;

  if (!hasAny) return (
    <p className="text-xs text-gray-400 py-4 text-center">No CSV files yet. Run simulations first.</p>
  );

  return (
    <div className="space-y-4">
      {combined.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Combined Output (hitl/output_3mode/)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {combined.map((f) => (
              <button key={f} onClick={() => downloadHitlCsv(f)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors text-xs text-gray-600 dark:text-gray-400 group">
                <svg className="w-3 h-3 text-gray-400 group-hover:text-violet-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {scenarioKeys.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Per-Scenario ({scenarioKeys.length} saved)
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-8 gap-1.5">
            {scenarioKeys.map((key) => {
              const files    = rawDirs[key] ?? [];
              const idMatch  = key.match(/scenario_?(\d+)/i);
              const id       = idMatch ? parseInt(idMatch[1], 10) : key;
              return (
                <div key={key} className="rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-800/60">
                    <span className="text-xs font-mono font-bold text-violet-700 dark:text-violet-400">
                      #{String(id).padStart(3, "0")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-1">
                    {files.map((f) => (
                      <button key={f} onClick={() => downloadHitlScenarioCsv(id, f)}
                        className="text-left text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 truncate px-1 transition-colors">
                        {f.replace(".csv", "")}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable Decision Log Table with pagination ───────────
function DecisionLogTable({ log, title, showScenarioCol = false, pageSize = 20, onDownload }) {
  const [logPage, setLogPage] = useState(0);
  const totalLogPages = Math.ceil(log.length / pageSize);
  const pageRows = log.slice(logPage * pageSize, (logPage + 1) * pageSize);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{log.length} decisions</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Pagination controls */}
          {totalLogPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setLogPage((p) => Math.max(0, p - 1))} disabled={logPage === 0}
                className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 text-gray-500 dark:text-gray-400 hover:border-violet-300 transition-colors">
                ‹
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium px-1">
                {logPage + 1} / {totalLogPages}
              </span>
              <button onClick={() => setLogPage((p) => Math.min(totalLogPages - 1, p + 1))} disabled={logPage === totalLogPages - 1}
                className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 text-gray-500 dark:text-gray-400 hover:border-violet-300 transition-colors">
                ›
              </button>
            </div>
          )}
          {onDownload && (
            <button onClick={onDownload}
              className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 dark:border-gray-800">
              {showScenarioCol && (
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">Scenario</th>
              )}
              {["Tick", "Timestamp", "Tier", "Rule", "Mod. Factor", "Rationale", "Resp. Time", "Action", "Urgency"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {pageRows.map((e, i) => {
              const action = (e.decision ?? e.manager_decision ?? "").toLowerCase();
              const urg    = (e.urgency_level ?? e.urgency ?? "").toLowerCase();
              return (
                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  {showScenarioCol && (
                    <td className="px-4 py-2.5 text-xs font-mono text-violet-700 dark:text-violet-400 whitespace-nowrap">
                      S{String(e.scenario_id ?? "?").padStart(3, "0")}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{e.tick ?? "-"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">{e.timestamp ?? "-"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 capitalize whitespace-nowrap">{e.tier ?? e.node_type ?? "-"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono">{e.rule_id ?? "-"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{e.modification_factor != null ? Number(e.modification_factor).toFixed(2) : "-"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300 truncate" title={e.rationale}>{e.rationale ?? "-"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{e.response_time != null ? `${Number(e.response_time).toFixed(2)}h` : "-"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {action && <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium capitalize ${decisionBadge[action] ?? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>{action}</span>}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {urg && <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium capitalize ${urgencyBadge[urg] ?? ""}`}>{urg}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalLogPages > 1 && (
        <div className="px-5 py-2 border-t border-gray-50 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
          Showing {logPage * pageSize + 1}–{Math.min((logPage + 1) * pageSize, log.length)} of {log.length} decisions
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function SimulationHitl() {
  // Fetch all 100 scenarios at once
  const scenariosData = useFetch(() => getHitlScenarios({ page_size: 100 }));
  const scenarios = useMemo(() => {
    const d = scenariosData.data;
    if (!d) return [];
    if (Array.isArray(d))            return d;
    if (Array.isArray(d.scenarios))  return d.scenarios;
    if (Array.isArray(d.data))       return d.data;
    return [];
  }, [scenariosData.data]);

  const PAGE_SIZE = 25;
  const [page,          setPage]          = useState(0);
  const [mode,          setMode]          = useState("all");
  const [verbose,       setVerbose]       = useState(false);
  const [statuses,      setStatuses]      = useState({});
  const [results,       setResults]       = useState({});
  const [selectedId,    setSelectedId]    = useState(1);
  const [activeRunId,   setActiveRunId]   = useState(null);
  const [activeIdx,     setActiveIdx]     = useState(0);
  const [globalRunning, setGlobalRunning] = useState(false);
  const [doneIds,       setDoneIds]       = useState([]);
  const [errorIds,      setErrorIds]      = useState([]);
  const [error,         setError]         = useState(null);
  const [csvRefreshKey, setCsvRefreshKey] = useState(0);
  // Track whether last action was "run all" and combined log data
  const [runAllDone,    setRunAllDone]    = useState(false);
  const [combinedHitlLog, setCombinedHitlLog] = useState([]);

  const elapsed    = useElapsedTimer(globalRunning);
  const refreshCsv = useCallback(() => setCsvRefreshKey((k) => k + 1), []);

  function setStatus(id, s) { setStatuses((prev) => ({ ...prev, [id]: s })); }

  async function handleRun() {
    if (globalRunning) return;
    setError(null);
    setRunAllDone(false);
    setCombinedHitlLog([]);
    setGlobalRunning(true);
    setActiveRunId(selectedId);
    setActiveIdx(1);
    setStatus(selectedId, "running");
    setResults((prev) => ({ ...prev, [selectedId]: null }));
    try {
      const res = await hitlSimulateScenario({ scenario_id: selectedId, mode, verbose });
      setStatus(selectedId, "done");
      setResults((prev) => ({ ...prev, [selectedId]: res }));
      setDoneIds((prev) => [...new Set([...prev, selectedId])]);
      setTimeout(() => refreshCsv(), 300);
    } catch (e) {
      setStatus(selectedId, "error");
      setResults((prev) => ({ ...prev, [selectedId]: { error: e.message } }));
      setErrorIds((prev) => [...new Set([...prev, selectedId])]);
      setError(e.message);
    } finally {
      setGlobalRunning(false);
      setActiveRunId(null);
    }
  }

  async function handleRunAll() {
    if (globalRunning || !scenarios.length) return;
    setError(null);
    setRunAllDone(false);
    setCombinedHitlLog([]);
    setGlobalRunning(true);
    setDoneIds([]);
    setErrorIds([]);
    setResults({});
    const initS = {};
    scenarios.forEach((s) => { initS[s.scenario_id] = "queued"; });
    setStatuses(initS);

    for (let i = 0; i < scenarios.length; i++) {
      const sc = scenarios[i];
      const id = sc.scenario_id;
      setActiveRunId(id);
      setActiveIdx(i + 1);
      setSelectedId(id);
      setPage(Math.floor(i / PAGE_SIZE));
      setStatus(id, "running");
      try {
        const res = await hitlSimulateScenario({ scenario_id: id, mode, verbose: false });
        setStatus(id, "done");
        setResults((prev) => ({ ...prev, [id]: res }));
        setDoneIds((prev) => [...new Set([...prev, id])]);
      } catch (e) {
        setStatus(id, "error");
        setResults((prev) => ({ ...prev, [id]: { error: e.message } }));
        setErrorIds((prev) => [...new Set([...prev, id])]);
      }
    }

    setGlobalRunning(false);
    setActiveRunId(null);
    setActiveIdx(0);
    setRunAllDone(true);
    // Fetch combined HITL log from saved CSV after all runs
    setTimeout(async () => {
      refreshCsv();
      try {
        const logData = await getHitlLog({ limit: 500 });
        const rows = Array.isArray(logData) ? logData
          : Array.isArray(logData?.data) ? logData.data
          : [];
        setCombinedHitlLog(rows);
      } catch (_) { /* silently ignore — data accessible via Reports */ }
    }, 500);
  }

  function handleReset() {
    if (globalRunning) return;
    setStatuses({});
    setResults({});
    setDoneIds([]);
    setErrorIds([]);
    setError(null);
    setRunAllDone(false);
    setCombinedHitlLog([]);
  }

  const anyDone = doneIds.length > 0;
  const selectedResult = results[selectedId];
  const isAll = mode === "all";

  // Results for display
  // mode=all → nested results array; mode=hitl/autonomous/reactive → flat response
  const allModeResults = isAll ? (selectedResult?.results ?? []) : [];
  const singleResult   = !isAll && selectedResult && !selectedResult.error ? selectedResult : null;
  const comparisonData = isAll ? selectedResult?.comparison : null;

  // Extract HITL log from single result — handle all possible shapes
  const singleData = useMemo(() => {
    if (!singleResult) return null;

    // Jika ada results[] nested, cari entry yang mode-nya cocok (atau ambil yang pertama)
    if (Array.isArray(singleResult.results) && singleResult.results.length > 0) {
      const matched = singleResult.results.find((r) => r.mode === mode) ?? singleResult.results[0];
      return {
        ...matched,
        saved_dir: singleResult.saved_dir ?? matched.saved_dir,
      };
    }

    // Struktur flat — langsung pakai apa adanya
    return singleResult;
  }, [singleResult, mode]);

  const singleHitlLog = useMemo(() => {
    if (!singleData) return [];
    if (Array.isArray(singleData.hitl_log))          return singleData.hitl_log;
    if (Array.isArray(singleData.hitl_decision_log)) return singleData.hitl_decision_log;
    return [];
  }, [singleData]);

  // Pagination
  const pagedScenarios = scenarios.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages     = Math.ceil(scenarios.length / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-400 dark:text-gray-500">
        HITL Simulation — {scenarios.length || 100} scenarios × 3 modes (Reactive / Autonomous / HITL)
      </p>

      {error && <ErrorBanner message={error} onRetry={handleRun} />}

      {/* ── Progress banner ── */}
      {globalRunning && activeRunId && (
        <ProgressBanner
          currentId={activeRunId}
          currentIdx={activeIdx}
          total={scenarios.length}
          mode={mode}
          elapsed={elapsed}
          doneIds={doneIds}
          errorIds={errorIds}
        />
      )}

      {/* ── Controls ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-5">
        <div className="flex items-start gap-6 flex-wrap">
          {/* Mode */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Simulation Mode
            </label>
            <div className="flex flex-wrap gap-1">
              {MODE_OPTS.map((o) => (
                <button key={o.value} onClick={() => !globalRunning && setMode(o.value)}
                  disabled={globalRunning}
                  title={o.desc}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    mode === o.value
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-300"
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              {MODE_OPTS.find((o) => o.value === mode)?.desc}
            </p>
          </div>

          {/* Verbose */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Verbose
            </label>
            <div onClick={() => !globalRunning && setVerbose((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${verbose ? "bg-violet-600" : "bg-gray-200 dark:bg-gray-700"} ${globalRunning ? "opacity-50 cursor-not-allowed" : ""}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${verbose ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
          </div>

          {anyDone && !globalRunning && (
            <div className="ml-auto self-end">
              <button onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-900 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Scenario Cards ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Scenarios
            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
              {scenarios.length} total
              {anyDone && ` · ${doneIds.length} done`}
              {errorIds.length > 0 && ` · ${errorIds.length} error`}
            </span>
          </h2>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 text-gray-500 dark:text-gray-400 hover:border-violet-300 transition-colors">
                ‹
              </button>
              {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`w-6 h-6 text-xs rounded border transition-colors ${
                    page === i ? "bg-violet-600 text-white border-violet-600"
                    : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-violet-300"
                  }`}>
                  {i + 1}
                </button>
              ))}
              {totalPages > 8 && <span className="text-xs text-gray-400">…{totalPages}</span>}
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 text-gray-500 dark:text-gray-400 hover:border-violet-300 transition-colors">
                ›
              </button>
            </div>
          )}
        </div>

        {scenariosData.loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 animate-pulse h-20">
                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-6 gap-2">
            {pagedScenarios.map((sc) => (
              <ScenarioCard
                key={sc.scenario_id}
                scenario={sc}
                status={statuses[sc.scenario_id] ?? "idle"}
                elapsed={activeRunId === sc.scenario_id ? elapsed : 0}
                result={results[sc.scenario_id]}
                isSelected={selectedId === sc.scenario_id}
                mode={mode}
                onClick={() => !globalRunning && setSelectedId(sc.scenario_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={handleRun} disabled={globalRunning}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
          {statuses[selectedId] === "running" ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Running S{selectedId}…</>
          ) : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>Run S{String(selectedId).padStart(3, "0")} [{mode}]</>
          )}
        </button>

        <button onClick={handleRunAll} disabled={globalRunning || !scenarios.length}
          className="flex items-center gap-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 text-sm font-medium px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
          {globalRunning ? (
            <><div className="w-4 h-4 border-2 border-gray-300/40 border-t-gray-500 rounded-full animate-spin" />
            Running all ({activeIdx}/{scenarios.length})…</>
          ) : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>Run All {scenarios.length} [{mode}]</>
          )}
        </button>
      </div>

      {/* ── Single mode result ── */}
      {statuses[selectedId] === "done" && singleData && (
        <div className="space-y-4">
          {singleData.saved_dir && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Saved — Scenario {selectedId} [{mode}]
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md capitalize ${MODE_BADGE[mode] ?? MODE_BADGE.autonomous}`}>{mode}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Scenario {selectedId} Metrics</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {Object.entries(singleData.metrics ?? {}).map(([k, v]) => (
                <div key={k} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-1 leading-tight">{k.replace(/_/g, " ")}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {typeof v === "number" ? v.toFixed(2) : String(v ?? "—")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* HITL decision log for single scenario run */}
          {(mode === "hitl") && singleHitlLog.length > 0 && (
            <DecisionLogTable
              log={singleHitlLog}
              title={`HITL Decision Log — Scenario ${selectedId}`}
              showScenarioCol={false}
              pageSize={20}
              onDownload={() => downloadHitlScenarioCsv(selectedId, "hitl_decision_log.csv")}
            />
          )}
          {(mode === "hitl") && !globalRunning && singleHitlLog.length === 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No HITL decision log in response — check{" "}
                <span className="text-violet-500">Reports → HITL</span> or download the scenario CSV.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── All-mode result ── */}
      {statuses[selectedId] === "done" && isAll && allModeResults.length > 0 && (
        <div className="space-y-4">
          {/* Metrics per mode */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {allModeResults.map((r, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md capitalize ${MODE_BADGE[r.mode] ?? MODE_BADGE.autonomous}`}>
                    {r.mode}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">S{selectedId}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(r.metrics ?? {}).slice(0, 6).map(([k, v]) => (
                    <div key={k} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                      <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-0.5 leading-tight truncate">{k.replace(/_/g, " ")}</p>
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {typeof v === "number" ? v.toFixed(2) : String(v ?? "—")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 3-way comparison */}
          {comparisonData && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">3-Way Comparison</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Reactive vs Autonomous vs HITL — delta % + statistical significance
                </p>
              </div>
              <ComparisonTable data={Array.isArray(comparisonData) ? comparisonData : [comparisonData]} />
            </div>
          )}

          {/* HITL decision log — per single scenario (mode=all) */}
          {(() => {
            const hitlR = allModeResults.find((r) => r.mode === "hitl");
            const log   = hitlR?.hitl_log ?? hitlR?.hitl_decision_log ?? [];
            if (!log.length) return null;
            return (
              <DecisionLogTable
                log={log}
                title={`HITL Decision Log — Scenario ${selectedId}`}
                showScenarioCol={false}
                pageSize={20}
                onDownload={() => downloadHitlScenarioCsv(selectedId, "hitl_decision_log.csv")}
              />
            );
          })()}
        </div>
      )}

      {/* ── Combined HITL log after Run All ── */}
      {runAllDone && (mode === "hitl" || mode === "all") && (
        combinedHitlLog.length > 0 ? (
          <DecisionLogTable
            log={combinedHitlLog}
            title="HITL Decision Log — All Scenarios"
            showScenarioCol={true}
            pageSize={20}
            onDownload={() => downloadHitlCsv("hitl_decision_log.csv")}
          />
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs px-5 py-6 flex items-center justify-between">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Full log available via{" "}
              <span className="font-medium text-violet-600 dark:text-violet-400">Reports → HITL</span>
              {" "}or download below.
            </p>
            <button onClick={() => downloadHitlCsv("hitl_decision_log.csv")}
              className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 font-medium transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download CSV
            </button>
          </div>
        )
      )}

      {/* ── Saved CSV panel ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Saved CSV Files</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">hitl/output_3mode/</p>
          </div>
          <button onClick={refreshCsv}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 font-medium transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <div className="p-5">
          <SavedCsvPanel refreshKey={csvRefreshKey} />
        </div>
      </div>
    </div>
  );
}
