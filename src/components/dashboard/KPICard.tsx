import { BarChart3, TrendingUp, Users, Tag, Target } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { KpiCard } from "../../data/mockData";

const ICONS: Record<string, typeof Users> = {
  clientes: Users,
  oportunidades: Target,
  ofertas: Tag,
  ventas: TrendingUp,
  conversion: BarChart3,
};

export default function KPICard({ kpi, index }: { kpi: KpiCard; index: number }) {
  const Icon = ICONS[kpi.id] ?? TrendingUp;
  const data = kpi.spark.map((v, i) => ({ i, v }));

  return (
    <article
      className={`jarvis-panel jarvis-panel-hover anim-rise reveal stagger-${Math.min(index + 1, 6)} p-4`}
      style={{ opacity: 1 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-300 shadow-[0_0_14px_-4px_rgba(34,211,238,.6)]">
          <Icon size={17} />
        </div>
        <span className="flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
          <TrendingUp size={12} />
          {kpi.delta}
        </span>
      </div>
      <p className="mt-3 text-xs font-medium tracking-wide text-slate-400">{kpi.titulo}</p>
      <p className="num-display mt-0.5 text-2xl font-extrabold text-white">{kpi.valor}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">vs. mes anterior</p>
      <div className="mt-2 h-10" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={`spark-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="#22d3ee" strokeWidth={1.6} fill={`url(#spark-${kpi.id})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
