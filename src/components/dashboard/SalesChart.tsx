import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import { ventasMensuales, type VentaMensual } from "../../data/mockData";
import { api } from "../../lib/api";
import { chartTema } from "../../lib/chartTheme";
import { useSkin } from "../../lib/skin";

export default function SalesChart() {
  const [items, setItems] = useState<VentaMensual[]>(ventasMensuales);

  useEffect(() => {
    let vivo = true;
    api
      .ventasMensuales()
      .then((d) => {
        if (vivo && Array.isArray(d) && d.length > 0) setItems(d);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const data = items.map((v) => ({ ...v, k: v.ventas / 1000 }));
  const { skin } = useSkin();
  const ct = chartTema(skin);
  return (
    <section className="jarvis-card anim-rise stagger-3 p-5" aria-label="Evolución de ventas">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Evolución de Ventas</h2>
          <p className="mt-1 text-xs text-slate-400">Últimos 7 meses · miles de €</p>
        </div>
        <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-300">
          +289% YTD
        </span>
      </div>
      <div className="mt-3 h-64" role="img" aria-label="Gráfico de evolución de ventas de enero a julio">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="salesStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2f7bff" />
                <stop offset="60%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#2dd4bf" />
              </linearGradient>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
              <CartesianGrid stroke={ct.rejilla} vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: ct.tick, fontSize: 11 }} axisLine={{ stroke: ct.eje }} tickLine={false} />
              <YAxis tick={{ fill: ct.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}k`} />
              <Tooltip
                formatter={(value) => [`€${Number(value).toLocaleString("es-ES")}`, "Ventas"]}
                labelStyle={{ color: ct.etiqueta }}
              />
            <Line type="monotone" dataKey="k" name="Ventas" stroke="url(#salesStroke)" strokeWidth={2.5} dot={{ r: 3, fill: "#041321", stroke: "#22d3ee", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#22d3ee", stroke: "#e0f2fe" }} fill="url(#salesFill)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
