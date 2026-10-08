import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PRIORIDAD_STYLES, formatEur, ofertasDestacadas, type Oferta } from "../../data/mockData";
import { api } from "../../lib/api";

function diasRestantesDe(o: Oferta): number {
  if (o.diasRestantes !== undefined) return o.diasRestantes;
  if (!o.fechaVencimiento) return 0;
  const ms = new Date(`${o.fechaVencimiento}T00:00:00`).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export default function FeaturedOffers() {
  const [items, setItems] = useState<Oferta[]>(ofertasDestacadas);

  useEffect(() => {
    let vivo = true;
    api
      .ofertas()
      .then((d) => {
        if (vivo && Array.isArray(d) && d.length > 0) setItems(d.slice(0, 4));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <section className="jarvis-panel anim-rise stagger-4 flex h-full flex-col p-5" aria-label="Ofertas destacadas">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title">Ofertas Destacadas</h2>
        <Link to="/ofertas" className="flex items-center gap-1 text-xs font-semibold text-cyan-300 transition hover:text-cyan-100">
          Ver <ArrowRight size={13} />
        </Link>
      </div>
      <div className="mt-3 flex-1 space-y-2.5">
        {items.map((o) => {
          const dias = diasRestantesDe(o);
          return (
          <article
            key={o.id}
            className="cursor-pointer rounded-xl border border-white/[.07] bg-white/[.02] p-3 transition hover:border-cyan-300/30 hover:bg-cyan-300/[.05]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate text-[13px] font-semibold text-slate-100">{o.titulo}</p>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${PRIORIDAD_STYLES[o.prioridad]}`}>
                {o.prioridad}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="num-display text-sm font-extrabold text-cyan-200">{formatEur(o.importe)}</span>
              <span className={`font-mono text-[11px] ${dias <= 7 ? "text-amber-300" : "text-slate-400"}`}>
                {dias} días restantes
              </span>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}
