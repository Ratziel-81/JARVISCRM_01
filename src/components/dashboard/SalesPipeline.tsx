import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PRIORIDAD_STYLES, etapasPipeline, formatEur, oportunidades, type EtapaPipeline, type Oportunidad } from "../../data/mockData";
import { api } from "../../lib/api";
import AvatarTile from "../common/AvatarTile";

export default function SalesPipeline() {
  const [activeEtapa, setActiveEtapa] = useState<string | null>(null);
  const [etapas, setEtapas] = useState<EtapaPipeline[]>(etapasPipeline);
  const [ops, setOps] = useState<Oportunidad[]>(oportunidades);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [e, o] = await Promise.all([api.etapas(), api.oportunidades()]);
        if (!vivo) return;
        if (Array.isArray(e) && e.length > 0) setEtapas(e);
        if (Array.isArray(o) && o.length > 0) setOps(o.filter((x) => (x.estado ?? "Abierta") === "Abierta"));
      } catch {
        /* sin API: mocks */
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const totales = useMemo(() => {
    const m = new Map<string, number>();
    ops.forEach((o) => m.set(o.etapa, (m.get(o.etapa) ?? 0) + 1));
    return m;
  }, [ops]);
  const max = Math.max(1, ...totales.values());
  const visibles = activeEtapa ? ops.filter((o) => o.etapa === activeEtapa) : ops.slice(0, 3);

  return (
    <section className="jarvis-card anim-rise stagger-2 p-5" aria-label="Pipeline de ventas">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Pipeline de Ventas</h2>
          <p className="mt-1 text-sm text-slate-400">Arrastra conceptualmente · click en etapa para filtrar</p>
        </div>
        <Link
          to="/oportunidades"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-300/25 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:shadow-[0_0_16px_-4px_rgba(34,211,238,.6)]"
        >
          Ver todas <ArrowRight size={14} />
        </Link>
      </div>

      {/* etapas */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5" role="list">
        {etapas.map((e) => {
          const active = activeEtapa === e.id;
          const total = totales.get(e.id) ?? 0;
          return (
            <button
              key={e.id}
              role="listitem"
              onClick={() => setActiveEtapa(active ? null : e.id)}
              className={`jarvis-stage rounded-xl p-3 text-left ${active ? "jarvis-stage-active" : ""}`}
              style={active ? { boxShadow: `0 0 22px -6px ${e.glow}` } : undefined}
            >
              <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                {e.nombre}
              </span>
              <span className="num-display mt-1 block text-2xl font-extrabold text-slate-100">{total}</span>
              <span className="jarvis-track mt-2 block h-1.5 overflow-hidden rounded-full">
                <span
                  className="block h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (total / max) * 100)}%`, background: e.color, boxShadow: `0 0 10px ${e.glow}` }}
                />
              </span>
            </button>
          );
        })}
      </div>

      {/* oportunidades */}
      <div className="mt-4 space-y-2.5">
        {visibles.map((o) => (
            <article
              key={o.id}
              className="jarvis-row group flex cursor-pointer items-center gap-3 rounded-xl p-3"
            >
            <AvatarTile color={o.avatarColor} iniciales={o.iniciales} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-100">{o.empresa}</span>
              <span className="mt-0.5 block font-mono text-xs text-slate-400">
                {formatEur(o.importe)} · <span className="text-cyan-300/80">{o.probabilidad}% prob.</span>
              </span>
            </span>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${PRIORIDAD_STYLES[o.prioridad]}`}>
              {o.prioridad}
            </span>
          </article>
        ))}
        {visibles.length === 0 && (
          <p className="rounded-xl border border-dashed border-cyan-300/20 p-4 text-center text-sm text-slate-400">
            Sin oportunidades en esta etapa.
          </p>
        )}
      </div>
    </section>
  );
}
