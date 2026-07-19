import { Outlet } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const { dark } = useTheme();

  return (
    <div className={`${dark ? "dark" : ""} min-h-screen font-primary`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
        <Sidebar />
        <Topbar />
        <main className="ml-64 pt-16 min-h-screen">
          <div className="p-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
