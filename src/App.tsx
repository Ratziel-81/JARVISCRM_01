import {
  LayoutDashboard,
} from "lucide-react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import AccionesPage from "./pages/AccionesPage";
import CalendarioPage from "./pages/CalendarioPage";
import ClientesPage from "./pages/ClientesPage";
import ConfiguracionPage from "./pages/ConfiguracionPage";
import DashboardPage from "./pages/DashboardPage";
import FichaClientePage from "./pages/FichaClientePage";
import InformesPage from "./pages/InformesPage";
import KpisPage from "./pages/KpisPage";
import OfertasPage from "./pages/OfertasPage";
import OportunidadesPage from "./pages/OportunidadesPage";
import TareasPage from "./pages/TareasPage";
import PlaceholderPage from "./pages/PlaceholderPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/:id" element={<FichaClientePage />} />
          <Route path="/oportunidades" element={<OportunidadesPage />} />
          <Route path="/acciones" element={<AccionesPage />} />
          <Route path="/ofertas" element={<OfertasPage />} />
          <Route path="/calendario" element={<CalendarioPage />} />
          <Route path="/tareas" element={<TareasPage />} />
          <Route path="/kpis" element={<KpisPage />} />
          <Route path="/informes" element={<InformesPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          {/* alias legacy */}
          <Route path="/dashboard-legacy" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<PlaceholderPage titulo="Página no encontrada" Icon={LayoutDashboard} descrip="La ruta solicitada no existe. Usa la navegación lateral para volver al centro de mando." />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
