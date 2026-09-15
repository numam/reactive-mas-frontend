import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  simulateReactiveScenario,
  getReactiveScenarios,
  getReactiveCsvList,
  downloadReactiveCsv,
  downloadReactiveScenarioCsv,
  getEffectiveRules,
  getCustomRules,
} from "../api/client";
import useFetch from "../hooks/useFetch";
import { ErrorBanner } from "../components/StatusState";

// ── Constants ─────────────────────────────────────────────
const SEV_STYLE = {
  low:    "text-green-600  dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  high:   "text-orange-600 dark:text-orange-400",
  crisis: "text-red-600    dark:text-red-400",
};

const STATUS_LEFT_BAR = {
  idle:    "bg-gray-200 dark:bg-gray-700",
  queued:  "bg-gray-300 dark:bg-gray-600",
  running: "bg-sage-500",
  done:    "bg-green-500",
  error:   "bg-red-500",
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
    } else {
      setElapsed(0);
    }
  }, [running]);
  return elapsed;
}

function fmtTime(s) {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ── Progress Banner ───────────────────────────────────────
function ProgressBanner({ currentId, currentIdx, total, elapsed, doneIds, errorIds, useCustomRules }) {
  const pct = total > 0 ? Math.round((doneIds.length / total) * 100) : 0;
  const DOTS_SHOW = 50;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-sage-200 dark:border-sage-800 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-sage-300 dark:border-sage-700 border-t-sage-600 rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Running Scenario{" "}
              <span className="text-sage-600 dark:text-sage-400 font-mono">#{currentId}</span>
              <span className="text-gray-400 dark:text-gray-500 font-normal text-xs ml-1">
                ({currentIdx}/{total})
              </span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Mode: <span className="font-medium">Reactive</span>
              {" · "}Rules:{" "}
              <span className={`font-medium ${useCustomRules ? "text-sage-500 dark:text-sage-400" : "text-gray-500 dark:text-gray-400"}`}>
                {useCustomRules ? "Custom" : "Default"}
              </span>
              {" · "}Elapsed: <span className="font-mono">{fmtTime(elapsed)}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-sage-600 dark:text-sage-400">{pct}%</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {doneIds.length} done
            {errorIds.length > 0 && <span className="text-red-500 ml-1">· {errorIds.length} error</span>}
          </p>
        </div>
      </div>

      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-sage-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
          Scenarios 1–{DOTS_SHOW}
          {total > DOTS_SHOW && (
            <span className="ml-1 text-gray-300 dark:text-gray-600">(showing first {DOTS_SHOW} of {total})</span>
          )}
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
                  isRunning ? "bg-sage-500 text-white scale-110 shadow-sm"
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
function ScenarioCard({ scenario, status, elapsed, result, isSelected, onClick }) {
  const id        = scenario?.scenario_id;
  const sev       = scenario?.severity ?? "medium";
  const isRunning = status === "running";
  const isDone    = status === "done";
  const isError   = status === "error";
  const metrics   = isDone ? (result?.metrics ?? {}) : null;

  return (
    <div onClick={onClick}
      className={`relative flex rounded-xl border cursor-pointer select-none transition-all duration-150 overflow-hidden ${
        isSelected && status === "idle"
          ? "bg-white dark:bg-gray-900 border-sage-300 dark:border-sage-700"
          : isRunning ? "bg-white dark:bg-gray-900 border-sage-200 dark:border-sage-800"
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
              <span className="flex items-center gap-1 text-xs text-sage-600 dark:text-sage-400 font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-sage-400 opacity-75" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-sage-500" />
                </span>
                {fmtTime(elapsed)}
              </span>
            )}
            {isDone && (
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isError  && <span className="text-xs text-red-400">✕</span>}
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
            <div className="h-full bg-sage-400 rounded-full animate-pulse" style={{ width: "55%" }} />
          </div>
        )}

        {isDone && metrics && (() => {
          const sar = metrics["Stock Availability Rate (%)"] ?? metrics["sar"] ?? metrics["SAR"];
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

// ── Saved CSV Panel ───────────────────────────────────────
function SavedCsvPanel({ refreshKey }) {
  const csvList = useFetch(getReactiveCsvList, [refreshKey]);

  if (csvList.loading) return (
    <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
      <div className="w-3.5 h-3.5 border-2 border-gray-300 dark:border-gray-600 border-t-sage-500 rounded-full animate-spin" />
      Loading…
    </div>
  );
  if (csvList.error) return <p className="text-xs text-red-500 py-2">{csvList.error}</p>;
  const data = csvList.data;
  if (!data) return null;

  const combined     = data.combined_files ?? [];
  const rawDirs      = data.scenario_dirs  ?? {};
  const scenarioKeys = Object.keys(rawDirs).sort();
  const hasAny       = combined.length > 0 || scenarioKeys.length > 0;

  if (!hasAny) return (
    <p className="text-xs text-gray-400 py-4 text-center">No CSV files yet. Run simulations first.</p>
  );

  return (
    <div className="space-y-4">
      {combined.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Combined Output
          </p>
          <div className="flex flex-wrap gap-1.5">
            {combined.map((f) => (
              <button key={f} onClick={() => downloadReactiveCsv(f)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-sage-300 dark:hover:border-sage-700 transition-colors text-xs text-gray-600 dark:text-gray-400 group">
                <svg className="w-3 h-3 text-gray-400 group-hover:text-sage-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
              const files   = rawDirs[key] ?? [];
              const idMatch = key.match(/scenario_?(\d+)/i);
              const id      = idMatch ? parseInt(idMatch[1], 10) : key;
              return (
                <div key={key} className="rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-800/60">
                    <span className="text-xs font-mono font-bold text-sage-700 dark:text-sage-400">
                      #{String(id).padStart(3, "0")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-1">
                    {files.map((f) => (
                      <button key={f} onClick={() => downloadReactiveScenarioCsv(id, f)}
                        className="text-left text-xs text-gray-500 dark:text-gray-400 hover:text-sage-600 dark:hover:text-sage-400 truncate px-1 transition-colors">
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

// ── Main Page ─────────────────────────────────────────────
export default function Simulation() {
  const scenariosData = useFetch(() => getReactiveScenarios({ page_size: 100 }));
  const scenarios = useMemo(() => {
    const d = scenariosData.data;
    if (!d) return [];
    if (Array.isArray(d))           return d;
    if (Array.isArray(d.scenarios)) return d.scenarios;
    if (Array.isArray(d.data))      return d.data;
    return [];
  }, [scenariosData.data]);

  const PAGE_SIZE = 25;
  const [page,           setPage]           = useState(0);
  const [verbose,        setVerbose]        = useState(false);
  const [statuses,       setStatuses]       = useState({});
  const [results,        setResults]        = useState({});
  const [selectedId,     setSelectedId]     = useState(1);
  const [activeRunId,    setActiveRunId]    = useState(null);
  const [activeIdx,      setActiveIdx]      = useState(0);
  const [globalRunning,  setGlobalRunning]  = useState(false);
  const [doneIds,        setDoneIds]        = useState([]);
  const [errorIds,       setErrorIds]       = useState([]);
  const [error,          setError]          = useState(null);
  const [csvRefreshKey,  setCsvRefreshKey]  = useState(0);
  const [rulesUsed,      setRulesUsed]      = useState({});

  // ── Rule selection ────────────────────────────────────────
  const [useCustomRules,     setUseCustomRules]     = useState(false);
  const [customRuleExists,   setCustomRuleExists]   = useState(false);
  const [rulePreview,        setRulePreview]        = useState(null);
  const [rulePreviewOpen,    setRulePreviewOpen]    = useState(false);
  const [rulePreviewLoading, setRulePreviewLoading] = useState(false);

  useEffect(() => {
    getCustomRules()
      .then(() => setCustomRuleExists(true))
      .catch((e) => {
        if (e.message.includes("404") || e.message.includes("not found")) {
          setCustomRuleExists(false);
        }
      });
  }, []);

  const elapsed    = useElapsedTimer(globalRunning);
  const refreshCsv = useCallback(() => setCsvRefreshKey((k) => k + 1), []);
  const abortRef   = useRef(null);

  function setStatus(id, s) { setStatuses((prev) => ({ ...prev, [id]: s })); }

  // ── Run single ────────────────────────────────────────────
  async function handleRun() {
    if (globalRunning) return;
    setError(null);
    setGlobalRunning(true);
    setActiveRunId(selectedId);
    setActiveIdx(1);
    setStatus(selectedId, "running");
    setResults((prev) => ({ ...prev, [selectedId]: null }));
    setRulesUsed((prev) => ({ ...prev, [selectedId]: useCustomRules ? "custom" : "default" }));
    abortRef.current = new AbortController();
    try {
      const res = await simulateReactiveScenario(
        { scenario_id: selectedId, mode: "reactive", verbose, use_custom: useCustomRules },
        abortRef.current.signal
      );
      setStatus(selectedId, "done");
      setResults((prev) => ({ ...prev, [selectedId]: res }));
      setDoneIds((prev) => [...new Set([...prev, selectedId])]);
      setTimeout(() => refreshCsv(), 300);
    } catch (e) {
      if (e.name === "AbortError") {
        setStatus(selectedId, "idle");
      } else {
        setStatus(selectedId, "error");
        setResults((prev) => ({ ...prev, [selectedId]: { error: e.message } }));
        setErrorIds((prev) => [...new Set([...prev, selectedId])]);
        setError(e.message);
      }
    } finally {
      setGlobalRunning(false);
      setActiveRunId(null);
      abortRef.current = null;
    }
  }

  // ── Run all ───────────────────────────────────────────────
  async function handleRunAll() {
    if (globalRunning || !scenarios.length) return;
    setError(null);
    setGlobalRunning(true);
    setDoneIds([]);
    setErrorIds([]);
    setResults({});
    const initS = {};
    scenarios.forEach((s) => { initS[s.scenario_id] = "queued"; });
    setStatuses(initS);
    abortRef.current = new AbortController();

    for (let i = 0; i < scenarios.length; i++) {
      if (abortRef.current?.signal.aborted) break;
      const sc = scenarios[i];
      const id = sc.scenario_id;
      setActiveRunId(id);
      setActiveIdx(i + 1);
      setSelectedId(id);
      setPage(Math.floor(i / PAGE_SIZE));
      setStatus(id, "running");
      setRulesUsed((prev) => ({ ...prev, [id]: useCustomRules ? "custom" : "default" }));
      try {
        const res = await simulateReactiveScenario(
          { scenario_id: id, mode: "reactive", verbose: false, use_custom: useCustomRules },
          abortRef.current.signal
        );
        setStatus(id, "done");
        setResults((prev) => ({ ...prev, [id]: res }));
        setDoneIds((prev) => [...new Set([...prev, id])]);
      } catch (e) {
        if (e.name === "AbortError") break;
        setStatus(id, "error");
        setResults((prev) => ({ ...prev, [id]: { error: e.message } }));
        setErrorIds((prev) => [...new Set([...prev, id])]);
      }
    }

    setGlobalRunning(false);
    setActiveRunId(null);
    setActiveIdx(0);
    abortRef.current = null;
    setTimeout(() => refreshCsv(), 500);
  }

  function handleStop()  { abortRef.current?.abort(); }

  function handleReset() {
    if (globalRunning) return;
    setStatuses({});
    setResults({});
    setDoneIds([]);
    setErrorIds([]);
    setRulesUsed({});
    setError(null);
  }

  const anyDone      = doneIds.length > 0;
  const selectedResult = results[selectedId];

  const resultData = useMemo(() => {
    if (!selectedResult || selectedResult.error) return null;
    if (Array.isArray(selectedResult.results) && selectedResult.results.length > 0) {
      return selectedResult.results[0];
    }
    return selectedResult;
  }, [selectedResult]);

  const pagedScenarios = scenarios.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages     = Math.ceil(scenarios.length / PAGE_SIZE);

  return (
    <div className="space-y-5">

      {error && <ErrorBanner message={error} onRetry={handleRun} />}

      {/* ── Progress Banner ── */}
      {globalRunning && activeRunId && (
        <ProgressBanner
          currentId={activeRunId}
          currentIdx={activeIdx}
          total={scenarios.length}
          elapsed={elapsed}
          doneIds={doneIds}
          errorIds={errorIds}
          useCustomRules={useCustomRules}
        />
      )}

      {/* ── Controls ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Reactive Simulation</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {scenarios.length || 100} scenarios · fixed reorder policy · no MAS coordination
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Verbose</span>
              <div
                onClick={() => !globalRunning && setVerbose((v) => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                  verbose ? "bg-sage-600" : "bg-gray-200 dark:bg-gray-700"
                } ${globalRunning ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${verbose ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </div>
            {anyDone && !globalRunning && (
              <button onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-900 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset All
              </button>
            )}
          </div>
        </div>

        {/* ── Rule selector ── */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide shrink-0">
              Rule Mode
            </span>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => !globalRunning && setUseCustomRules(false)}
                disabled={globalRunning}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  !useCustomRules
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                🔒 Default Rules
              </button>
              <button
                onClick={() => !globalRunning && setUseCustomRules(true)}
                disabled={globalRunning}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  useCustomRules
                    ? "bg-sage-100 dark:bg-sage-950 text-sage-700 dark:text-sage-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                ⚙️ Custom Rules
                {customRuleExists && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                )}
              </button>
            </div>

            {useCustomRules && (
              customRuleExists ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Custom rules aktif akan digunakan
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  Belum ada custom rules —{" "}
                  <a href="/rules" className="underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300">
                    buat di Rule Management
                  </a>
                </span>
              )
            )}

            <button
              onClick={async () => {
                setRulePreviewLoading(true);
                try {
                  const data = await getEffectiveRules(useCustomRules);
                  setRulePreview(data);
                  setRulePreviewOpen(true);
                } catch (_e) {
                  // silently ignore
                } finally {
                  setRulePreviewLoading(false);
                }
              }}
              disabled={rulePreviewLoading}
              className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-sage-600 dark:hover:text-sage-400 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-sage-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {rulePreviewLoading ? (
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
              Preview rules yang akan dipakai
            </button>
          </div>
        </div>
      </div>

      {/* ── Rule preview modal ── */}
      {rulePreviewOpen && rulePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Effective Rules Preview</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Mode:{" "}
                  <span className={`font-medium ${useCustomRules ? "text-sage-500" : "text-gray-500"}`}>
                    {useCustomRules ? "Custom" : "Default"}
                  </span>
                  {" — "}rules yang akan digunakan saat simulasi dijalankan
                </p>
              </div>
              <button onClick={() => setRulePreviewOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-auto flex-1 p-6">
              <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(rulePreview, null, 2)}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button onClick={() => setRulePreviewOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 text-gray-500 dark:text-gray-400 hover:border-sage-300 transition-colors">
                ‹
              </button>
              {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`w-6 h-6 text-xs rounded border transition-colors ${
                    page === i
                      ? "bg-sage-600 text-white border-sage-600"
                      : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-sage-300"
                  }`}>
                  {i + 1}
                </button>
              ))}
              {totalPages > 8 && <span className="text-xs text-gray-400">…{totalPages}</span>}
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 text-gray-500 dark:text-gray-400 hover:border-sage-300 transition-colors">
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
                onClick={() => !globalRunning && setSelectedId(sc.scenario_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={handleRun} disabled={globalRunning}
          className="flex items-center gap-2 bg-sage-600 hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
          {statuses[selectedId] === "running" ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running S{selectedId}…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run S{String(selectedId).padStart(3, "0")}
            </>
          )}
        </button>

        <button onClick={handleRunAll} disabled={globalRunning || !scenarios.length}
          className="flex items-center gap-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 text-sm font-medium px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
          {globalRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-300/40 border-t-gray-500 rounded-full animate-spin" />
              Running all ({activeIdx}/{scenarios.length})…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Run All {scenarios.length}
            </>
          )}
        </button>

        {globalRunning && (
          <button onClick={handleStop}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Stop
          </button>
        )}
      </div>

      {/* ── Selected scenario result ── */}
      {statuses[selectedId] === "done" && resultData && (
        <div className="space-y-4">
          {resultData.saved_dir && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Saved — Scenario {selectedId} [Reactive]
              </p>
            </div>
          )}

          {/* Metrics */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Results — Scenario {selectedId}{" "}
              <span className="text-xs font-normal text-gray-400">[Reactive]</span>
              {rulesUsed[selectedId] && (
                <span className={`ml-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${
                  rulesUsed[selectedId] === "custom"
                    ? "bg-sage-50 dark:bg-sage-950 text-sage-700 dark:text-sage-400 ring-sage-200 dark:ring-sage-900"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 ring-gray-200 dark:ring-gray-700"
                }`}>
                  {rulesUsed[selectedId] === "custom" ? "⚙️ Custom Rules" : "🔒 Default Rules"}
                </span>
              )}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {Object.entries(resultData.metrics ?? {}).map(([k, v]) => (
                <div key={k} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-1 leading-tight">
                    {k.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {typeof v === "number" ? v.toFixed(2) : String(v ?? "—")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Event log */}
          {Array.isArray(resultData.event_log) && resultData.event_log.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Event Log
                  <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                    (first {Math.min(50, resultData.event_log.length)} of {resultData.event_log.length})
                  </span>
                </h2>
                <button onClick={() => downloadReactiveScenarioCsv(selectedId, "event_log.csv")}
                  className="flex items-center gap-1.5 text-xs text-sage-600 dark:text-sage-400 hover:text-sage-800 dark:hover:text-sage-300 font-medium transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download CSV
                </button>
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
                    {resultData.event_log.slice(0, 50).map((e, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {e.hour != null ? `h${e.hour}` : e.tick != null ? `t${e.tick}` : e.timestamp ?? "-"}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-700 dark:text-gray-300 capitalize">
                          {String(e.node_type ?? e.node ?? "-").replace(/_/g, " ")}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-sage-700 dark:text-sage-400">
                          {e.matched_rule ?? e.rule_id ?? "-"}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-xs truncate"
                          title={e.orchestrator_decision ?? e.decision}>
                          {e.orchestrator_decision ?? e.decision ?? "-"}
                        </td>
                        <td className="px-5 py-3">
                          {(e.urgency_level ?? e.urgency) && (
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium capitalize ${
                              (e.urgency_level ?? e.urgency) === "crisis"
                                ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                                : (e.urgency_level ?? e.urgency) === "high"
                                ? "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
                                : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                            }`}>
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
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Reactive simulation output</p>
          </div>
          <button onClick={refreshCsv}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-sage-600 dark:hover:text-sage-400 font-medium transition-colors">
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
