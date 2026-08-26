import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

// ── Nav items ─────────────────────────────────────────────
const navItems = [
  { path: "/", label: "Dashboard", end: true },
  { path: "/inventory", label: "Inventory" },
  { path: "/suppliers", label: "Suppliers" },
  { path: "/simulation", label: "Simulation" },
  { path: "/reports", label: "Reports" },
];

// ── Hamburger icon ────────────────────────────────────────
const IconMenu = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
const IconClose = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ── Shared NavLink class helper ───────────────────────────
function navLinkClass({ isActive }) {
  return `text-sm font-medium transition-colors duration-150 px-1 py-0.5 rounded ${
    isActive
      ? "text-violet-600 dark:text-violet-400"
      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
  }`;
}

// ── Mobile NavLink (pill style) ───────────────────────────
function mobileNavLinkClass({ isActive }) {
  return `block w-full text-left px-4 py-3 text-sm font-medium rounded-xl transition-colors duration-150 ${
    isActive
      ? "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-400"
      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
  }`;
}

// ── Topbar / Navbar ───────────────────────────────────────
export default function Sidebar() {
  const { dark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Main navbar ── */}
      <header className="fixed top-0 inset-x-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-30 transition-colors duration-200">
        <div className="max-w-screen-2xl mx-auto h-full flex items-center justify-between gap-4 px-4 sm:px-6">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="leading-none">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">SupplyChain</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">MAS Dashboard</p>
            </div>
          </div>

          {/* ── Desktop nav links ── */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-400"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* ── Right actions ── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              aria-label="Toggle dark mode"
              className={`cursor-pointer relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                dark ? "bg-violet-600" : "bg-gray-200"
              }`}
            >
              {/* Moon icon — left side */}
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clipRule="evenodd" />
                </svg>
              </span>
              {/* Sun icon — right side */}
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
              </span>
              {/* Thumb: light → covers moon (left), dark → covers sun (right) */}
              <span
                className={`absolute top-0.5 left-0 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                  dark ? "translate-x-7.5" : "translate-x-0.5"
                }`}
              />
            </button>

            {/* Notification */}
            <button className="hidden sm:flex relative w-9 h-9 items-center justify-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
            </button>

            {/* Avatar */}
            <div className="hidden sm:flex w-9 h-9 rounded-full bg-linear-to-br from-violet-400 to-purple-600 items-center justify-center cursor-pointer shrink-0">
              <span className="text-white text-xs font-semibold">AD</span>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile dropdown menu ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-20 bg-black/20 dark:bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Menu panel */}
          <div className="fixed top-16 inset-x-0 z-20 md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-lg p-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={mobileNavLinkClass}
              >
                {item.label}
              </NavLink>
            ))}
            {/* Mobile-only avatar row */}
            <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 px-4 py-2">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-400 to-purple-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-semibold">AD</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Admin User</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">admin@supply.com</p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
