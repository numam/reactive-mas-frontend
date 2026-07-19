import { useState } from "react";
import useFetch from "../hooks/useFetch";
import { getAgent, getAgentInitialState } from "../api/client";
import { LoadingSpinner, ErrorBanner } from "../components/StatusState";

const NODE_TYPES = ["supplier", "farm", "slaughterhouse", "wholesaler", "retail"];

const NODE_ICONS = {
  supplier: "🌾",
  farm: "🐔",
  slaughterhouse: "🏭",
  wholesaler: "🏪",
  retail: "🛒",
};

const NODE_COLORS = {
  supplier: "from-green-400 to-emerald-500",
  farm: "from-yellow-400 to-amber-500",
  slaughterhouse: "from-red-400 to-rose-500",
  wholesaler: "from-blue-400 to-indigo-500",
  retail: "from-violet-400 to-purple-500",
};

// Individual node card with its own fetch
function NodeCard({ nodeType, onClick, selected }) {
  const agent = useFetch(() => getAgent(nodeType), [nodeType]);
  const initState = useFetch(() => getAgentInitialState(nodeType), [nodeType]);

  const varCount = agent.data ? Object.keys(agent.data.variables ?? {}).length : 0;
  const threshCount = agent.data ? Object.keys(agent.data.thresholds ?? {}).length : 0;

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-900 rounded-2xl border transition-all cursor-pointer p-5 hover:shadow-sm ${
        selected
          ? "border-violet-400 dark:border-violet-600 shadow-md"
          : "border-gray-100 dark:border-gray-800"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-linear-to-br ${NODE_COLORS[nodeType]} flex items-center justify-center shrink-0`}>
            <span className="text-xl">{NODE_ICONS[nodeType]}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{nodeType}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {agent.data?.meta?.description ?? "Supply chain node"}
            </p>
          </div>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
          Active
        </span>
      </div>

      {agent.loading ? (
        <div className="space-y-1.5">
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
        </div>
      ) : (
        <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {varCount} state variables
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {threshCount} thresholds configured
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 dark:border-gray-800">
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Initial stock</p>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {initState.data?.state?.stock_level ?? initState.data?.state?.inventory ?? "—"}
          </p>
        </div>
        <button className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium border border-violet-200 dark:border-violet-800 hover:border-violet-400 dark:hover:border-violet-600 px-3 py-1.5 rounded-lg transition-colors">
          {selected ? "Hide Details" : "Details"}
        </button>
      </div>
    </div>
  );
}

// Detail panel for selected node
function NodeDetail({ nodeType }) {
  const agent = useFetch(() => getAgent(nodeType), [nodeType]);
  const initState = useFetch(() => getAgentInitialState(nodeType), [nodeType]);

  if (agent.loading || initState.loading) return <LoadingSpinner />;
  if (agent.error) return <ErrorBanner message={agent.error} />;

  const variables = agent.data?.variables ?? {};
  const thresholds = agent.data?.thresholds ?? {};
  const state = initState.data?.state ?? {};

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${NODE_COLORS[nodeType]} flex items-center justify-center shrink-0`}>
          <span className="text-lg">{NODE_ICONS[nodeType]}</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 capitalize">{nodeType} — Detail View</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">{agent.data?.meta?.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Variables */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">State Variables</h4>
          <div className="space-y-2">
            {Object.entries(variables).map(([k, v]) => (
              <div key={k} className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-semibold font-mono text-violet-700 dark:text-violet-400">{k}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{v.description}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {state[k] != null ? String(state[k]) : String(v.default)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{v.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Thresholds */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Thresholds</h4>
          <div className="space-y-2">
            <p className="text-sm font-mono font-semibold text-violet-700 dark:text-violet-400">Disruption</p>
            {Object.entries(thresholds.disruption).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{k}</p>
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{String(v)}</p>
              </div>
            ))}
            <p className="text-sm font-mono font-semibold text-violet-700 dark:text-violet-400 pt-2">Recovery</p>
            {Object.entries(thresholds.recovery).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{k}</p>
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{String(v)}</p>
              </div>
            ))}
            {Object.keys(thresholds).length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500">No thresholds configured.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Supply chain nodes — agent configurations and initial states
        </p>
      </div>

      {/* Node Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {NODE_TYPES.map((n) => (
          <NodeCard
            key={n}
            nodeType={n}
            selected={selected === n}
            onClick={() => setSelected(selected === n ? null : n)}
          />
        ))}
      </div>

      {/* Detail Panel */}
      {selected && <NodeDetail nodeType={selected} />}
    </div>
  );
}
