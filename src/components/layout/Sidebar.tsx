import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  FileText,
  Gem,
  Home,
  LayoutDashboard,
  Settings,
  Tags,
  Target,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export interface NavItem {
  to: string;
  label: string;
  Icon: typeof Home;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Inicio", Icon: Home },
  { to: "/clientes", label: "Clientes", Icon: Users },
  { to: "/oportunidades", label: "Oportunidades", Icon: Gem },
  { to: "/acciones", label: "Acciones", Icon: Tags },
  { to: "/ofertas", label: "Ofertas", Icon: FileText },
  { to: "/calendario", label: "Calendario", Icon: CalendarDays },
  { to: "/tareas", label: "Tareas", Icon: CheckSquare },
  { to: "/kpis", label: "KPIs", Icon: Target },
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/informes", label: "Informes", Icon: BarChart3 },
  { to: "/configuracion", label: "Configuración", Icon: Settings },
];

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: Props) {
  return (
    <>
      {/* overlay móvil */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`jarvis-sidebar fixed inset-y-0 left-0 z-40 flex w-[200px] shrink-0 flex-col border-r border-cyan-300/10 pt-[70px] backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:pt-[70px] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                  isActive ? "jarvis-navitem-active" : "jarvis-navitem"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`jarvis-navitem-indicator absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full transition-all ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <Icon
                    size={17}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className="nav-ic shrink-0"
                  />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-cyan-300/10 p-4">
          <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/[.06] p-3">
            <div className="flex items-center gap-2">
              <span className="anim-pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium tracking-wide text-slate-400">Sistema operativo</span>
            </div>
            <p className="mt-1 font-mono text-[11px] font-semibold tracking-[0.18em] text-emerald-300">
              J.A.R.V.I.S. ONLINE
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
