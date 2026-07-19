import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

// ── Icon helpers ──────────────────────────────────────────
const IconDashboard = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const IconInventory = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const IconSuppliers = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconReports = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconSimulation = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconChevronDown = ({ open }) => (
  <svg
    className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

// ── Flat menu items ───────────────────────────────────────
const flatItems = [
  { path: "/", label: "Dashboard", icon: <IconDashboard /> },
  { path: "/inventory", label: "Inventory", icon: <IconInventory /> },
  { path: "/suppliers", label: "Suppliers", icon: <IconSuppliers /> },
];

// ── Accordion groups ──────────────────────────────────────
const accordionGroups = [
  {
    key: "simulation",
    label: "Simulation",
    icon: <IconSimulation />,
    children: [
      { path: "/simulation", label: "Basic" },
      { path: "/simulation/hitl", label: "HitL" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: <IconReports />,
    children: [
      { path: "/reports", label: "Basic" },
      { path: "/reports/hitl", label: "HitL" },
    ],
  },
];

// ── NavLink item ──────────────────────────────────────────
function MenuItem({ path, label, icon, end, indent = false }) {
  return (
    <NavLink
      to={path}
      end={end ?? path === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
          indent ? "ml-6 py-2" : ""
        } ${
          isActive
            ? "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-400"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {icon && (
            <span className={`shrink-0 transition-colors ${
              isActive
                ? "text-violet-600 dark:text-violet-400"
                : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
            }`}>
              {icon}
            </span>
          )}
          {indent && !icon && (
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-violet-500" : "bg-gray-300 dark:bg-gray-600"}`} />
          )}
          <span>{label}</span>
          {isActive && !indent && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />
          )}
        </>
      )}
    </NavLink>
  );
}

// ── Accordion group ───────────────────────────────────────
function AccordionGroup({ group }) {
  const location = useLocation();

  // Auto-open if current path matches a child
  const isChildActive = group.children.some((c) => location.pathname === c.path);
  const [open, setOpen] = useState(isChildActive);

  return (
    <div>
      {/* Group header button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
          isChildActive
            ? "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-400"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
        }`}
      >
        <span className={`shrink-0 transition-colors ${
          isChildActive
            ? "text-violet-600 dark:text-violet-400"
            : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
        }`}>
          {group.icon}
        </span>
        <span className="flex-1 text-left">{group.label}</span>
        <span className={`transition-colors ${isChildActive ? "text-violet-400 dark:text-violet-500" : "text-gray-300 dark:text-gray-600"}`}>
          <IconChevronDown open={open} />
        </span>
      </button>

      {/* Children */}
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.children.map((child) => (
            <MenuItem
              key={child.path}
              path={child.path}
              label={child.label}
              indent
              end
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────
export default function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col z-30 shadow-sm transition-colors duration-200">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none">SupplyChain</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">MAS Dashboard</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-3 mb-2">
          Main Menu
        </p>

        {/* Flat items */}
        {flatItems.map((item) => (
          <MenuItem key={item.path} path={item.path} label={item.label} icon={item.icon} />
        ))}

        {/* Divider */}
        <div className="pt-2 pb-1">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-3">
            Analysis
          </p>
        </div>

        {/* Accordion groups */}
        {accordionGroups.map((group) => (
          <AccordionGroup key={group.key} group={group} />
        ))}
      </nav>

      {/* User profile */}
      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-400 to-purple-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">AD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">Admin User</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">admin@supply.com</p>
          </div>
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>
    </aside>
  );
}
