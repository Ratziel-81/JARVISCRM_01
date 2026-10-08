import { useEffect, useState } from "react";
import { kpisCirculares, type KpiCircular } from "../../data/mockData";
import { api } from "../../lib/api";

function Ring({ valor }: { valor: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c - (valor / 100) * c;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(103,232,249,.12)" strokeWidth="7" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="url(#kpiGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 36 36)"
        style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,.55))", transition: "stroke-dashoffset 1s ease" }}
      />
      <defs>
        <linearGradient id="kpiGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2f7bff" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
      <text x="36" y="41" textAnchor="middle" fontSize="15" fontWeight="800" fontFamily="Inter,sans-serif" style={{ fill: "var(--jarvis-text)" }}>
        {valor}%
      </text>
    </svg>
  );
}

export default function KPIOverview() {
  const [items, setItems] = useState<KpiCircular[]>(kpisCirculares);

  useEffect(() => {
    let vivo = true;
    api
      .kpisCirculares()
      .then((d) => {
        if (vivo && Array.isArray(d) && d.length > 0) setItems(d);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <section className="jarvis-card anim-rise stagger-4 flex h-full flex-col p-5" aria-label="KPIs clave">
      <h2 className="section-title">KPIs Clave</h2>
      <div className="mt-4 grid flex-1 grid-cols-2 content-center gap-4">
        {items.map((k) => (
          <div key={k.id} className="flex flex-col items-center gap-1.5 text-center">
            <Ring valor={k.valor} />
            <p className="max-w-[130px] text-xs leading-snug text-slate-300">{k.etiqueta}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
