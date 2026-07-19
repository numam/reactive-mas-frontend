import { useState, useMemo } from "react";
import useFetch from "../hooks/useFetch";
import { getEventLog, getStockLog } from "../api/client";
import { LoadingSpinner, ErrorBanner } from "../components/StatusState";

const urgencyStyle = {
  critical: "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-400 dark:ring-red-900",
  high: "bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:ring-orange-900",
  medium: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:ring-yellow-900",
  low: "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-900",
};

const URGENCY_FILTERS = ["All", "critical", "high", "medium", "low"];
const SCENARIO_FILTERS = [1, 2, 3, 4, 5];

export default function Orders() {
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [scenarioFilter, setScenarioFilter] = useState(null);

  const eventLog = useFetch(
    () => getEventLog({
      ...(scenarioFilter != null && { scenario_id: scenarioFilter }),
      ...(urgencyFilter !== "All" && { urgency: urgencyFilter }),
    }),
    [urgencyFilter, scenarioFilter]
  );

  const stockLog = useFetch(
    () => getStockLog({ limit: 100, ...(scenarioFilter != null && { scenario_id: scenarioFilter }) }),
    [scenarioFilter]
  );

  const events = useMemo(() => {
    if (!eventLog.data || !Array.isArray(eventLog.data)) return [];
    return eventLog.data.slice(0, 200);
  }, [eventLog.data]);

  const stockRows = useMemo(() => {
    if (!stockLog.data || !Array.isArray(stockLog.data)) return [];
    return stockLog.data.slice(0, 50);
  }, [stockLog.data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Event log and stock snapshots from simulation runs
        </p>
      </div>

      {(eventLog.error || stockLog.error) && (
        <ErrorBanner
          message={eventLog.error ?? stockLog.error}
          onRetry={() => { eventLog.refetch(); stockLog.refetch(); }}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Scenario filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Scenario:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setScenarioFilter(null)}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                scenarioFilter === null
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700"
              }`}
            >
              All
            </button>
            {SCENARIO_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setScenarioFilter(s)}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                  scenarioFilter === s
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700"
                }`}
              >
                S{s}
              </button>
            ))}
          </div>
        </div>

        {/* Urgency filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Urgency:</span>
          <div className="flex gap-1 flex-wrap">
            {URGENCY_FILTERS.map((u) => (
              <button
                key={u}
                onClick={() => setUrgencyFilter(u)}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors capitalize ${
                  urgencyFilter === u
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Event Log Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Event Log
            {!eventLog.loading && (
              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                {events.length} events
              </span>
            )}
          </h2>
        </div>
        {eventLog.loading ? (
          <LoadingSpinner message="Loading event log..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800">
                  {["Scenario", "Hour", "Node", "Rule", "Decision", "Urgency"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {events.map((e, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-violet-700 dark:text-violet-400 font-medium">
                      S{e.scenario_id}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs">
                      {e.hour != null ? `h${e.hour}` : e.timestamp ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300 capitalize text-xs">
                      {String(e.node_type ?? e.node ?? "-").replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {e.rule_id ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs max-w-xs truncate" title={e.orchestrator_decision ?? e.decision}>
                      {e.orchestrator_decision ?? e.decision ?? "-"}
                    </td>
                    <td className="px-5 py-3">
                      {e.urgency_level ?? e.urgency ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${urgencyStyle[e.urgency_level ?? e.urgency] ?? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>
                          {e.urgency_level ?? e.urgency}
                        </span>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                      No events found. Run a simulation first or adjust filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Log Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Stock Log
            {!stockLog.loading && (
              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                {stockRows.length} records (latest 50)
              </span>
            )}
          </h2>
        </div>
        {stockLog.loading ? (
          <LoadingSpinner message="Loading stock log..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800">
                  {["Scenario", "Hour", "Node", "Stock Level", "Capacity", "Disrupted"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {stockRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-violet-700 dark:text-violet-400 font-medium">
                      S{row.scenario_id}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {row.hour != null ? `h${row.hour}` : row.timestamp ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300 capitalize text-xs">
                      {String(row.node_type ?? "-").replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900 dark:text-gray-100">
                      {row.stock_level != null ? Number(row.stock_level).toLocaleString() : "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {row.capacity != null ? Number(row.capacity).toLocaleString() : "-"}
                    </td>
                    <td className="px-5 py-3">
                      {row.disrupted != null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          String(row.disrupted) === "true" || row.disrupted === 1
                            ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                            : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                        }`}>
                          {String(row.disrupted) === "true" || row.disrupted === 1 ? "Yes" : "No"}
                        </span>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
                {stockRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                      No stock log found. Run a simulation first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
