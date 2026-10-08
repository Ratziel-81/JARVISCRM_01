import { CheckCircle2, FileText, PhoneCall, Target, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { actividadReciente, type Actividad } from "../../data/mockData";
import { api } from "../../lib/api";

const ICONS = {
  cliente: { Icon: UserPlus, cls: "border-sky-300/30 bg-sky-400/10 text-sky-300" },
  oferta: { Icon: FileText, cls: "border-violet-300/30 bg-violet-400/10 text-violet-300" },
  llamada: { Icon: PhoneCall, cls: "border-emerald-300/30 bg-emerald-400/10 text-emerald-300" },
  tarea: { Icon: CheckCircle2, cls: "border-teal-300/30 bg-teal-400/10 text-teal-300" },
  oportunidad: { Icon: Target, cls: "border-amber-300/30 bg-amber-400/10 text-amber-300" },
} as const;

export default function RecentActivity() {
  const [items, setItems] = useState<Actividad[]>(actividadReciente);

  useEffect(() => {
    let vivo = true;
    api
      .actividades()
      .then((d) => {
        if (vivo && Array.isArray(d) && d.length > 0) setItems(d);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <section className="jarvis-card anim-rise stagger-3 flex h-full flex-col p-5" aria-label="Actividad reciente">
      <h2 className="section-title">Actividad Reciente</h2>
      <ol className="relative mt-4 flex-1 space-y-1 border-l border-cyan-300/15 pl-0">
        {items.map((a) => {
          const { Icon, cls } = ICONS[a.tipo as keyof typeof ICONS] ?? ICONS.tarea;
          return (
            <li key={a.id} className="relative flex gap-3 pb-4 pl-5 last:pb-0">
              <span className={`jarvis-dot absolute -left-[13px] top-0 flex h-[26px] w-[26px] items-center justify-center rounded-full border ${cls}`}>
                <Icon size={13} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-100">{a.titulo}</p>
                <p className="truncate text-xs text-slate-400">{a.detalle}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">{a.hace}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
