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
            className="jarvis-qa group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-200 transition-all duration-200 disabled:opacity-60"
          >
            <span className="jarvis-qa-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition group-hover:text-cyan-100">
              <Icon size={14} />
            </span>
            {label}
          </button>
      ))}
    </div>
  );
}
