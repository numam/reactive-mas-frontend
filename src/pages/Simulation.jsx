import { useState, useCallback, useEffect, useRef } from "react";
import {
  simulateScenario,
  getScenarios,
  getCsvList,
  downloadCsv,
  downloadScenarioCsv,
} from "../api/client";
import useFetch from "../hooks/useFetch";
import { ErrorBanner } from "../components/StatusState";

// ── Constants ─────────────────────────────────────────────
const SCENARIO_DESCS = {
  1: "Supplier disruption cascade",
  2: "Farm disease outbreak",
  3: "Slaughterhouse shutdown",
  4: "Wholesaler logistics failure",
  5: "Multi-node simultaneous disruption",
};

const SEV_STYLE = {
  low:    "text-green-600  dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  high:   "text-orange-600 dark:text-orange-400",
  crisis: "text-red-600    dark:text-red-400",
};

const STATUS_LEFT_BAR = {
  idle:    "bg-gray-200    dark:bg-gray-700",
  queued:  "bg-gray-300    dark:bg-gray-600",
  running: "bg-violet-500  dark:bg-violet-500",
  done:    "bg-green-500   dark:bg-green-500",
  error:   "bg-red-500     dark:bg-red-500",
};

const urgencyStyle = {
  critical: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  high:     "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  medium:   "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  low:      "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
};

// ── Elapsed timer hook ────────────────────────────────────
function useElapsedTimer(running) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      setElapsed(0);
      const id = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
      return () => clearInterval(id);
    } else {
      setElapsed(0);
    }
  }, [running]);

  return elapsed;
}

function fmtTime(s) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ── Status dot ────────────────────────────────────────────
function StatusDot({ status }) {
  if (status === "running") return (
    <span className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-medium">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
      </span>
      Running
    </span>
  );
  if (status === "done") return (
    <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Done
    </span>
  );
  if (status === "error") return (
    <span className="text-xs text-red-600 dark:text-red-400 font-medium">Error</span>
  );
  if (status === "queued") return (
    <span className="text-xs text-gray-400 dark:text-gray-500">Queued</span>
  );
  return null;
}

// ── Scenario Card ─────────────────────────────────────────
function ScenarioCard({ scenario, status, elapsed, result, isSelected, onClick }) {
  const id  = scenario.scenario_id;
  const sev = scenario.severity ?? "medium";

  const isRunning = status === "running";
  const isDone    = status === "done";
  const isError   = status === "error";

  return (
    <div
      onClick={onClick}
      className={`relative flex rounded-xl border-2 cursor-pointer select-none transition-all duration-150 overflow-hidden ${
        isSelected && status === "idle"
          ? "bg-blue-100 dark:bg-gray-900 border-blue-300 dark:border-blue-700"
          : isRunning
          ? "bg-white dark:bg-gray-900 border-violet-200 dark:border-violet-800"
          : isDone
          ? "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
          : isError
          ? "bg-white dark:bg-gray-900 border-red-200 dark:border-red-900"
          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
      }`}
    >
      {/* Left status bar */}
      <div className={`w-0.5 shrink-0 rounded-l-xl transition-colors duration-300 ${STATUS_LEFT_BAR[status]}`} />

      {/* Content */}
      <div className="flex-1 p-4 min-w-0">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-none">
              S{id}
            </p>
            <p className={`text-xs font-medium mt-0.5 capitalize ${SEV_STYLE[sev]}`}>
              {sev}
            </p>
          </div>
          <StatusDot status={status} />
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug mb-2">
          {scenario.disruption_type
            ? scenario.disruption_type.replace(/_/g, " ")
            : SCENARIO_DESCS[id]}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          {scenario.seed_node && (
            <span className="capitalize">{scenario.seed_node.replace(/_/g, " ")}</span>
          )}
          {scenario.n_events && (
            <>
              <span>·</span>
              <span>{scenario.n_events} events</span>
            </>
          )}
        </div>

        {/* Running: progress bar + timer */}
        {isRunning && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400 dark:text-gray-500">Elapsed</span>
              <span className="font-mono text-violet-600 dark:text-violet-400">{fmtTime(elapsed)}</span>
            </div>
            <div className="h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-violet-400 dark:bg-violet-500 rounded-full animate-pulse" style={{ width: "55%" }} />
            </div>
          </div>
        )}

        {/* Done: 2 key metrics */}
        {isDone && result?.metrics && (() => {
          const entries = Object.entries(result.metrics).slice(0, 2);
          if (!entries.length) return null;
          return (
            <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              {entries.map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-20">
                    {k.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {typeof v === "number" ? v.toFixed(1) : String(v ?? "—")}
                  </p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Error */}
        {isError && result?.error && (
          <p className="mt-2 text-xs text-red-500 dark:text-red-400 truncate" title={result.error}>
            {result.error}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Saved CSV Panel ───────────────────────────────────────
function SavedCsvPanel({ refreshKey }) {
  const csvList = useFetch(getCsvList, [refreshKey]);

  const data = csvList.data;
  if (csvList.loading) return (
    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 py-4">
      <div className="w-3.5 h-3.5 border-2 border-gray-300 dark:border-gray-600 border-t-violet-500 rounded-full animate-spin" />
      Loading saved files…
    </div>
  );
  if (csvList.error) return (
    <p className="text-xs text-red-500 dark:text-red-400 py-2">{csvList.error}</p>
  );
  if (!data) return null;

  const combined   = Array.isArray(data.combined_files) ? data.combined_files : [];
  const scenarioDirs = data.scenario_dirs ?? {};
  const scenarioIds = [...new Set(
    Object.keys(scenarioDirs)
      .map((k) => { const m = k.match(/scenario_(\d+)/); return m ? parseInt(m[1]) : null; })
      .filter(Boolean)
  )].sort((a, b) => a - b);

  if (combined.length === 0 && scenarioIds.length === 0) return (
    <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">
      No CSV files yet. Run a simulation to generate output.
    </p>
  );

  function getKey(id) {
    const padded = `scenario_${String(id).padStart(2, "0")}`;
    return scenarioDirs[padded] ? padded : `scenario_${id}`;
  }

  return (
    <div className="space-y-4">
      {combined.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Combined Output
          </p>
          <div className="flex flex-wrap gap-2">
            {combined.map((f) => (
              <button key={f} onClick={() => downloadCsv(f)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950 transition-colors text-xs text-gray-700 dark:text-gray-300 group">
                <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-violet-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {scenarioIds.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Per-Scenario ({scenarioIds.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {scenarioIds.map((id) => {
              const key   = getKey(id);
              const files = scenarioDirs[key] ?? [];
              return (
                <div key={id} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/60">
                    <span className="text-xs font-mono font-bold text-violet-700 dark:text-violet-400">S{id}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{files.length} files</span>
                  </div>                  <div className="flex flex-wrap gap-1.5 p-2">
                    {files.map((f) => (
                      <button key={f} onClick={() => downloadScenarioCsv(id, f)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-violet-300 dark:hover:border-violet-700 transition-colors text-xs text-gray-600 dark:text-gray-400 group">
                        <svg className="w-3 h-3 text-gray-400 group-hover:text-violet-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {f}
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

// ── Main Page ─────────────────────────────────────────────
export default function Simulation() {
  const scenariosData = useFetch(getScenarios);

  // Per-scenario status: idle | queued | running | done | error
  const [statuses, setStatuses] = useState({ 1: "idle", 2: "idle", 3: "idle", 4: "idle", 5: "idle" });
  const [results, setResults] = useState({});
  const [selectedId, setSelectedId] = useState(1);
  const [verbose, setVerbose] = useState(false);
  const [activeRunId, setActiveRunId] = useState(null); // which scenario is currently running
  const [globalRunning, setGlobalRunning] = useState(false);
  const [error, setError] = useState(null);
  const [csvRefreshKey, setCsvRefreshKey] = useState(0);

  const elapsed = useElapsedTimer(globalRunning);
  const refreshCsv = useCallback(() => setCsvRefreshKey((k) => k + 1), []);

  function setStatus(id, s) {
    setStatuses((prev) => ({ ...prev, [id]: s }));
  }

  async function handleRunSingle() {
    if (globalRunning) return;
    setError(null);
    setGlobalRunning(true);
    setActiveRunId(selectedId);
    setStatus(selectedId, "running");
    setResults((prev) => ({ ...prev, [selectedId]: null }));
    try {
      const res = await simulateScenario({ scenario_id: selectedId, verbose });
      setStatus(selectedId, "done");
      setResults((prev) => ({ ...prev, [selectedId]: { metrics: res.metrics, event_log: res.event_log, saved_files: res.saved_files } }));
      setTimeout(() => refreshCsv(), 300);
    } catch (e) {
      setStatus(selectedId, "error");
      setResults((prev) => ({ ...prev, [selectedId]: { error: e.message } }));
      setError(e.message);
    } finally {
      setGlobalRunning(false);
      setActiveRunId(null);
    }
  }

  async function handleRunAll() {
    if (globalRunning) return;
    setError(null);
    setGlobalRunning(true);
    // Reset all to queued
    setStatuses({ 1: "queued", 2: "queued", 3: "queued", 4: "queued", 5: "queued" });
    setResults({});

    for (let id = 1; id <= 5; id++) {
      setActiveRunId(id);
      setSelectedId(id);
      setStatus(id, "running");
      try {
        const res = await simulateScenario({ scenario_id: id, verbose: false });
        setStatus(id, "done");
        setResults((prev) => ({ ...prev, [id]: { metrics: res.metrics, event_log: res.event_log, saved_files: res.saved_files } }));
      } catch (e) {
        setStatus(id, "error");
        setResults((prev) => ({ ...prev, [id]: { error: e.message } }));
      }
    }

    setGlobalRunning(false);
    setActiveRunId(null);
    setTimeout(() => refreshCsv(), 500);
  }

  function handleReset() {
    if (globalRunning) return;
    setStatuses({ 1: "idle", 2: "idle", 3: "idle", 4: "idle", 5: "idle" });
    setResults({});
    setError(null);
  }

  const scenarios = scenariosData.data ?? [];
  const doneCount = Object.values(statuses).filter((s) => s === "done").length;
  const errorCount = Object.values(statuses).filter((s) => s === "error").length;
  const anyDone = doneCount > 0;

  // Selected scenario result
  const selectedResult = results[selectedId];
  const selectedEvents = selectedResult?.event_log?.slice(0, 50) ?? [];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Run disruption simulations — results are automatically saved as CSV files per scenario
      </p>

      {error && <ErrorBanner message={error} onRetry={handleRunSingle} />}

      {/* ── Global status bar ── */}
      {globalRunning && (
        <div className="flex items-center gap-3 bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 rounded-xl px-5 py-3">
          <div className="w-4 h-4 border-2 border-violet-300 dark:border-violet-700 border-t-violet-600 rounded-full animate-spin shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">
              {activeRunId ? `Running Scenario ${activeRunId}…` : "Initializing…"}
            </p>
            <p className="text-xs text-violet-600 dark:text-violet-400">
              Elapsed: {fmtTime(elapsed)} · Results saved automatically to CSV
            </p>
          </div>
          {doneCount > 0 && (
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
              {doneCount}/5 done
            </span>
          )}
        </div>
      )}

      {/* ── Scenario Cards Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Scenarios
            {anyDone && (
              <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
                {doneCount} completed{errorCount > 0 ? `, ${errorCount} error` : ""}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {/* Verbose toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => !globalRunning && setVerbose((v) => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${verbose ? "bg-violet-600" : "bg-gray-200 dark:bg-gray-700"} ${globalRunning ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${verbose ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Verbose</span>
            </label>

            {/* Reset */}
            {anyDone && !globalRunning && (
              <button onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((id) => {
            const sc = scenarios.find((s) => s.scenario_id === id);
            if (!sc && !scenariosData.loading) return (
              <div key={id} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            );
            if (!sc) return (
              <div key={id} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            );
            return (
              <ScenarioCard
                key={id}
                scenario={sc}
                status={statuses[id]}
                elapsed={activeRunId === id ? elapsed : 0}
                result={results[id]}
                isSelected={selectedId === id}
                onClick={() => !globalRunning && setSelectedId(id)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleRunSingle}
          disabled={globalRunning}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {statuses[selectedId] === "running" ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Running S{selectedId}…</>
          ) : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>Run Scenario {selectedId}</>
          )}
        </button>

        <button
          onClick={handleRunAll}
          disabled={globalRunning}
          className="flex items-center gap-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 text-sm font-medium px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
        >
          {globalRunning && activeRunId ? (
            <><div className="w-4 h-4 border-2 border-gray-300/40 border-t-gray-500 rounded-full animate-spin" />Running all…</>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Run All 5
            </>
          )}
        </button>
      </div>

      {/* ── Selected scenario result ── */}
      {statuses[selectedId] === "done" && selectedResult?.metrics && (
        <div className="space-y-4">
          {/* Save banner */}
          {selectedResult.saved_files && Object.keys(selectedResult.saved_files).length > 0 && (
            <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-xl px-5 py-3">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Scenario {selectedId} results saved to CSV
              </p>
            </div>
          )}

          {/* Metrics */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Results — Scenario {selectedId}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {Object.entries(selectedResult.metrics).map(([k, v]) => (
                <div key={k} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-1">
                    {k.replace(/_/g, " ")}
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {typeof v === "number" ? v.toFixed(2) : String(v ?? "—")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Event log */}
          {selectedEvents.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Event Log
                  <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                    (first {selectedEvents.length} of {selectedResult.event_log?.length})
                  </span>
                </h2>
                {selectedResult.saved_files?.event_log && (
                  <button onClick={() => downloadScenarioCsv(selectedId, "event_log.csv")}
                    className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download CSV
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 dark:border-gray-800">
                      {["Hour", "Node", "Rule", "Decision", "Urgency"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {selectedEvents.map((e, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {e.hour != null ? `h${e.hour}` : e.timestamp ?? "-"}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-700 dark:text-gray-300 capitalize">
                          {String(e.node_type ?? e.node ?? "-").replace(/_/g, " ")}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-violet-700 dark:text-violet-400">
                          {e.matched_rule ?? e.rule_id ?? "-"}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-xs truncate" title={e.orchestrator_decision ?? e.decision}>
                          {e.orchestrator_decision ?? e.decision ?? "-"}
                        </td>
                        <td className="px-5 py-3">
                          {(e.urgency_level ?? e.urgency) && (
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium capitalize ${urgencyStyle[e.urgency_level ?? e.urgency] ?? ""}`}>
                              {e.urgency_level ?? e.urgency}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Saved CSV panel ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Saved CSV Files</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Backend output/ folder</p>
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
