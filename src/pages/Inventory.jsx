import { useState, useMemo } from "react";
import useFetch from "../hooks/useFetch";
import { getAgents } from "../api/client";
import { LoadingSpinner, ErrorBanner } from "../components/StatusState";

const NODE_TYPES = ["supplier", "farm", "slaughterhouse", "wholesaler", "retail"];

const NODE_ICONS = {
  supplier: "🌾",
  farm: "🐔",
  slaughterhouse: "🏭",
  wholesaler: "🏪",
  retail: "🛒",
};

export default function Inventory() {
  const { data, loading, error, refetch } = useFetch(getAgents);
  const [search, setSearch] = useState("");
  const [selectedNode, setSelectedNode] = useState("all");

  const rows = useMemo(() => {
    if (!data) return [];
    const result = [];
    for (const nodeType of NODE_TYPES) {
      const agent = data[nodeType];
      if (!agent) continue;
      const vars = agent.variables ?? {};
      Object.entries(vars).forEach(([varName, info]) => {
        result.push({
          node_type: nodeType,
          variable: varName,
          default: info.default,
          unit: info.unit ?? "-",
          description: info.description ?? "-",
          status: getStatus(nodeType, varName, info.default, agent.thresholds),
        });
      });
    }
    return result;
  }, [data]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchNode = selectedNode === "all" || r.node_type === selectedNode;
      const matchSearch =
        !search ||
        r.variable.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase());
      return matchNode && matchSearch;
    });
  }, [rows, search, selectedNode]);

  const nodeCounts = useMemo(() => {
    if (!data) return {};
    const counts = {};
    for (const nodeType of NODE_TYPES) {
      const agent = data[nodeType];
      counts[nodeType] = agent ? Object.keys(agent.variables ?? {}).length : 0;
    }
    return counts;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Agent state variables & default values across all supply chain nodes
        </p>
        <button
          onClick={refetch}
          className="flex items-center gap-2 bg-sage-600 hover:bg-sage-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {loading ? (
        <LoadingSpinner message="Loading agent data..." />
      ) : (
        <>
          {/* Node Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {NODE_TYPES.map((n) => (
              <button
                key={n}
                onClick={() => setSelectedNode(selectedNode === n ? "all" : n)}
                className={`cursor-pointer rounded-xl border p-4 text-left transition-all ${
                  selectedNode === n
                    ? "bg-sage-50 dark:bg-sage-950 border-sage-300 dark:border-sage-700"
                    : "bg-white dark:bg-gray-900 border-sage-100 dark:border-gray-800 hover:border-sage-200 dark:hover:border-sage-800"
                }`}
              >
                <div className="text-xl mb-1">{NODE_ICONS[n]}</div>
                <p className={`text-xs font-semibold capitalize ${selectedNode === n ? "text-sage-700 dark:text-sage-400" : "text-gray-900 dark:text-gray-100"}`}>
                  {n}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {nodeCounts[n]} variables
                </p>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-sage-100 dark:border-gray-800 shadow-xs">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sage-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Agent Variables
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                  {filtered.length} of {rows.length}
                </span>
              </h2>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search variables..."
                className="text-sm border border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sage-300 dark:focus:ring-sage-700 w-52"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sage-50 dark:border-gray-800">
                    {["Node", "Variable", "Default Value", "Unit", "Description"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-50 dark:divide-gray-800">
                  {filtered.map((row, i) => (
                    <tr key={`${row.node_type}-${row.variable}-${i}`} className="hover:bg-sage-50/60 dark:hover:bg-gray-800/50 transition-colors odd:bg-sage-50/30 dark:odd:bg-gray-800/30">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                          <span>{NODE_ICONS[row.node_type]}</span>
                          {row.node_type}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-sage-700 dark:text-sage-400 font-medium">
                        {row.variable}
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-900 dark:text-gray-100">
                        {row.default != null ? String(row.default) : "-"}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                        {row.unit}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate" title={row.description}>
                        {row.description}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                        No variables match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getStatus(nodeType, varName, defaultVal, thresholds) {
  if (!thresholds || defaultVal == null) return null;
  const val = Number(defaultVal);
  if (isNaN(val)) return null;
  const keys = Object.keys(thresholds);
  for (const k of keys) {
    if (varName.includes(k.replace("_min", "").replace("_max", ""))) {
      return val <= 0 ? "critical" : val < thresholds[k] ? "low" : "normal";
    }
  }
  return null;
}
