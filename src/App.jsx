import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Suppliers from "./pages/Suppliers";
import Reports from "./pages/Reports";
import ReportsHitl from "./pages/ReportsHitl";
import Simulation from "./pages/Simulation";
import SimulationHitl from "./pages/SimulationHitl";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/hitl" element={<ReportsHitl />} />
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/simulation/hitl" element={<SimulationHitl />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
