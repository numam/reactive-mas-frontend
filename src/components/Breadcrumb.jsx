import { Link, useLocation } from "react-router-dom";

const routeNames = {
  "":           "Dashboard",
  inventory:    "Inventory",
  suppliers:    "Suppliers",
  reports:      "Reports",
  simulation:   "Simulation",
};

export default function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const crumbs = [
    { label: "Home", path: "/" },
    ...segments.map((seg, i) => ({
      label: routeNames[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
      path: "/" + segments.slice(0, i + 1).join("/"),
    })),
  ];

  // Only render breadcrumb when there's more than the home segment
  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs mt-0.5">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.path} className="flex items-center gap-1.5">
            {index > 0 && (
              <svg className="w-3 h-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {isLast ? (
              <span className="text-gray-500 dark:text-gray-400 font-medium">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.path}
                className="text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
