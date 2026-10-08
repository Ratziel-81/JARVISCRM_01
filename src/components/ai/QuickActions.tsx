import { FilePlus2, PhoneCall, Search, TrendingUp, Users } from "lucide-react";

export interface QuickAction {
  id: string;
  label: string;
  Icon: typeof Users;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "clientes", label: "Resumen de clientes", Icon: Users },
  { id: "oportunidades", label: "Buscar oportunidades", Icon: Search },
  { id: "oferta", label: "Crear oferta", Icon: FilePlus2 },
  { id: "llamada", label: "Programar llamada", Icon: PhoneCall },
  { id: "kpis", label: "Analizar KPIs", Icon: TrendingUp },
];

export default function QuickActions({
  onSelect,
  pending,
}: {
  onSelect: (id: string) => void;
  pending: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {QUICK_ACTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          disabled={pending}
          onClick={() => onSelect(id)}
          className="group flex items-center gap-2.5 rounded-xl border border-cyan-300/15 bg-white/[.03] px-3 py-2.5 text-left text-[13px] font-medium text-slate-200 transition-all duration-200 hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-white hover:shadow-[0_0_18px_-6px_rgba(34,211,238,.7)] disabled:cursor-wait disabled:opacity-60"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-300 transition group-hover:text-cyan-100">
            <Icon size={14} />
          </span>
          {label}
        </button>
      ))}
    </div>
  );
}
