import { useMemo } from "react";
import useFetch from "../hooks/useFetch";
import { getSummary, getMetrics, getRuleFrequency, getScenarios } from "../api/client";
import { LoadingSpinner, ErrorBanner } from "../components/StatusState";

const urgencyColor = {
  critical: "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-400 dark:ring-red-900",
  high: "bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:ring-orange-900",
  medium: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:ring-yellow-900",
  low: "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-900",
};

export default function Dashboard() {
  const summary = useFetch(getSummary);
  const metrics = useFetch(getMetrics);
  const ruleFreq = useFetch(getRuleFrequency);
  const scenarios = useFetch(getScenarios);

  // Aggregate stat cards from metrics
  const stats = useMemo(() => {
    if (!metrics.data || !Array.isArray(metrics.data)) return null;
    const rows = metrics.data;
    const totalDisruptions = rows.reduce((s, r) => s + (Number(r.total_disruptions) || 0), 0);
    const totalEvents = rows.reduce((s, r) => s + (Number(r.total_events) || 0), 0);
    const avgRecovery = rows.length
      ? (rows.reduce((s, r) => s + (Number(r.avg_recovery_time) || 0), 0) / rows.length).toFixed(1)
      : "-";
    const totalRules = rows.reduce((s, r) => s + (Number(r.rules_triggered_count) || 0), 0);
    return { totalDisruptions, totalEvents, avgRecovery, totalRules, scenarios: rows.length };
  }, [metrics.data]);

  // Top 5 most-triggered rules
  const topRules = useMemo(() => {
    if (!ruleFreq.data || !Array.isArray(ruleFreq.data)) return [];
    return [...ruleFreq.data].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [ruleFreq.data]);

  // Max rule count for bar scaling
  const maxRuleCount = topRules[0]?.count || 1;

  const loading = summary.loading || metrics.loading;
  const error = summary.error || metrics.error;

  return (
    <div className="space-y-8">
      {error && (
        <ErrorBanner
          message={error}
          onRetry={() => { summary.refetch(); metrics.refetch(); ruleFreq.refetch(); }}
        />
      )}

      {/* Stat Cards */}
      {loading ? (
        <LoadingSpinner message="Loading dashboard data..." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              { label: "Scenarios Simulated", value: stats?.scenarios ?? "-", icon: "🔬", sub: "total scenario runs" },
              { label: "Total Disruptions", value: stats?.totalDisruptions?.toLocaleString() ?? "-", icon: "⚡", sub: "across all scenarios" },
              { label: "Rules Triggered", value: stats?.totalRules?.toLocaleString() ?? "-", icon: "📋", sub: "orchestrator activations" },
              { label: "Avg Recovery Time", value: stats?.avgRecovery ? `${stats.avgRecovery}h` : "-", icon: "⏱️", sub: "mean recovery hours" },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-xs hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{s.value}</p>
                  </div>
                  <span className="text-2xl">{s.icon}</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Scenarios Table */}
            <div className="xl:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Simulation Scenarios</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {scenarios.data?.length ?? 0} scenarios
                </span>
              </div>
              {scenarios.loading ? (
                <LoadingSpinner />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-50 dark:border-gray-800">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">ID</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Disruption Type</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Severity</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Seed Node</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Events</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {(scenarios.data ?? []).map((sc) => (
                        <tr key={sc.scenario_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-xs text-violet-700 dark:text-violet-400 font-medium">
                            S{sc.scenario_id}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-gray-100 capitalize">
                            {sc.disruption_type?.replace(/_/g, " ")}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${urgencyColor[sc.severity] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                              {sc.severity}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300 capitalize">
                            {sc.seed_node?.replace(/_/g, " ")}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-gray-900 dark:text-gray-100">
                            {sc.n_events}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Rules + Summary */}
            <div className="space-y-4">
              {/* Top Rules */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Rules Triggered</h2>
                {ruleFreq.loading ? (
                  <LoadingSpinner />
                ) : (
                  <div className="space-y-3">
                    {topRules.map((r) => (
                      <div key={r.rule_id}>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{r.rule_id}</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{r.count}×</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-violet-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${(r.count / maxRuleCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {topRules.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No rule data yet</p>
                    )}
                  </div>
                )}
              </div>

              {/* Summary Stats */}
              {summary.data && Array.isArray(summary.data) && summary.data.length > 0 && (
                <div className="bg-linear-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white">
                  <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Summary Statistics</p>
                  {(() => {
                    const row = summary.data[0];
                    return (
                      <>
                        <p className="text-2xl font-bold mt-1">
                          {row.mean_disruptions != null
                            ? Number(row.mean_disruptions).toFixed(1)
                            : "—"}
                        </p>
                        <p className="text-xs opacity-70 mt-0.5">Mean disruptions / scenario</p>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          {row.std_disruptions != null && (
                            <div>
                              <p className="opacity-70">Std Dev</p>
                              <p className="font-semibold">{Number(row.std_disruptions).toFixed(2)}</p>
                            </div>
                          )}
                          {row.ci_95_lower != null && (
                            <div>
                              <p className="opacity-70">95% CI Lower</p>
                              <p className="font-semibold">{Number(row.ci_95_lower).toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
