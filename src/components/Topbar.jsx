import { useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import Breadcrumb from "./Breadcrumb";

const pageTitles = {
  "/": "Dashboard",
  "/inventory": "Inventory",
  "/orders": "Orders",
  "/suppliers": "Suppliers",
  "/reports": "Reports",
  "/reports/hitl": "Reports — HitL",
  "/simulation": "Simulation",
  "/simulation/hitl": "Simulation — HitL",
};

export default function Topbar() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "Page";
  const { dark, toggle } = useTheme();

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8 z-20 transition-colors duration-200">
      {/* Left: Title + Breadcrumb */}
      <div className="flex flex-col justify-center">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">{title}</h1>
        <Breadcrumb />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">

        {/* Dark Mode Toggle */}
        <button
          onClick={toggle}
          aria-label="Toggle dark mode"
          className={`cursor-pointer relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            dark ? "bg-violet-600" : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          {/* Track icons */}
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4 text-white">
            <path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clip-rule="evenodd" />
          </svg>
          </span>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          </span>
          {/* Thumb */}
          <span
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 flex items-center justify-center ${
              dark ? "translate-x-7" : "translate-x-0.5"
            }`}
          />
        </button>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 transition-colors">
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-linear-to-br from-violet-400 to-purple-600 flex items-center justify-center cursor-pointer">
          <span className="text-white text-xs font-semibold">AD</span>
        </div>
      </div>
    </header>
  );
}
