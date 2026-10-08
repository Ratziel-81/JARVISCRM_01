import { CalendarClock, ClipboardList, MapPin, PhoneCall, Presentation, Send, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { proximasAcciones, type AccionComercial } from "../../data/mockData";
import { api } from "../../lib/api";

const HOY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();
const MANANA = (() => {
  const d = new Date(Date.now() + 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

interface Item {
  id: string;
  hora: string;
  etiqueta: string;
  empresa: string;
  icono: string;
}

function iconFor(icono: string) {
  switch (icono) {
    case "llamada":
    case "Llamada":
      return { Icon: PhoneCall, cls: "text-emerald-300 border-emerald-300/30 bg-emerald-400/10" };
    case "reunion":
    case "Reunión":
      return { Icon: Users, cls: "text-sky-300 border-sky-300/30 bg-sky-400/10" };
    case "visita":
      return { Icon: MapPin, cls: "text-teal-300 border-teal-300/30 bg-teal-400/10" };
    case "tarea":
      return { Icon: ClipboardList, cls: "text-cyan-300 border-cyan-300/30 bg-cyan-300/10" };
    case "Presentación":
      return { Icon: Presentation, cls: "text-violet-300 border-violet-300/30 bg-violet-400/10" };
    case "Enviar oferta":
      return { Icon: Send, cls: "text-amber-300 border-amber-300/30 bg-amber-400/10" };
    default:
      return { Icon: CalendarClock, cls: "text-cyan-300 border-cyan-300/30 bg-cyan-300/10" };
  }
}

function desdeMock(items: AccionComercial[], dia: "hoy" | "manana"): Item[] {
  return items
    .filter((a) => a.dia === dia)
    .map((a) => ({ id: a.id, hora: a.hora, etiqueta: a.tipo, empresa: a.empresa, icono: a.tipo }));
}

function Grupo({ titulo, items }: { titulo: string; items: Item[] }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">{titulo}</p>
      <div className="mt-2 space-y-2">
        {items.length === 0 && <p className="font-mono text-[11px] text-slate-600">Nada programado.</p>}
        {items.map((a) => {
          const { Icon, cls } = iconFor(a.icono);
          return (
            <div
              key={a.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-2.5 transition hover:border-cyan-300/30 hover:bg-cyan-300/[.05]"
            >
              <span className="num-display w-12 shrink-0 font-mono text-xs font-semibold text-cyan-200">{a.hora}</span>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
                <Icon size={15} />
              </span>
              <span className="min-w-0 truncate text-[13px] text-slate-200">
                <span className="font-semibold">{a.etiqueta}</span>
                {a.empresa ? <span className="text-slate-400"> · {a.empresa}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UpcomingActions() {
  const [hoy, setHoy] = useState<Item[]>(() => desdeMock(proximasAcciones, "hoy"));
  const [manana, setManana] = useState<Item[]>(() => desdeMock(proximasAcciones, "manana"));

  useEffect(() => {
    let vivo = true;
    api
      .acciones()
      .then((d) => {
        if (!vivo || !Array.isArray(d) || d.length === 0) return;
        const pend = d.filter((a) => a.estado === "Pendiente");
        const aItem = (a: (typeof d)[number]): Item => ({
          id: a.id,
          hora: a.hora || "—",
          etiqueta: a.titulo,
          empresa: a.clienteNombre ?? a.empresa ?? "",
          icono: a.tipo,
        });
        setHoy(pend.filter((a) => a.fecha === HOY).map(aItem));
        setManana(pend.filter((a) => a.fecha === MANANA).map(aItem));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <section className="jarvis-panel anim-rise stagger-5 h-full p-5" aria-label="Próximas acciones">
      <h2 className="section-title">Próximas Acciones</h2>
      <div className="mt-3 space-y-4">
        <Grupo titulo="Hoy" items={hoy} />
        <Grupo titulo="Mañana" items={manana} />
      </div>
    </section>
  );
}
