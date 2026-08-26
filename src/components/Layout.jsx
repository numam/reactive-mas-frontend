import { Outlet } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import Sidebar from "./Sidebar";

export default function Layout() {
  const { dark } = useTheme();

  return (
    <div className={`${dark ? "dark" : ""} min-h-screen font-primary`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
        {/* Navbar (replaces both Sidebar + old Topbar) */}
        <Sidebar />

        {/* Page content — full width, offset by navbar height */}
        <main className="pt-16 min-h-screen">
          <div className="max-w-screen-2xl mx-auto p-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
