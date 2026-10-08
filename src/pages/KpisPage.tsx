import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEur, type Accion, type Cliente, type Oferta, type Oportunidad } from "../data/mockData";
import { api } from "../lib/api";
import { estadoCobertura } from "../lib/cobertura";

const PALETA = ["#22d3ee", "#2f7bff", "#a78bfa", "#f5c542", "#2dd4bf", "#ff5470", "#94a3b8"];

function Tarjeta({ titulo, valor, sub, to }: { titulo: string; valor: string; sub: string; to?: string }) {
  const inner = (
    <>
      <p className="section-title">{titulo}</p>
      <p className="num-display mt-2 text-2xl font-extrabold text-white sm:text-3xl">{valor}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </>
  );
  return to ? (
    <Link to={to} className="jarvis-panel jarvis-panel-hover block p-5">{inner}</Link>
  ) : (
    <div className="jarvis-panel p-5">{inner}</div>
  );
}

const tooltipOscuro = {
  contentStyle: { background: "#041321", border: "1px solid rgba(103,232,249,.25)", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#a5e8ff" },
};

export default function KpisPage() {
  const [ops, setOps] = useState<Oportunidad[]>([]);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [o, of, c, a] = await Promise.all([api.oportunidades(), api.ofertas(), api.clientes(), api.acciones()]);
        if (!vivo) return;
        setOps(o);
        setOfertas(of);
        setClientes(c);
        setAcciones(a);
      } catch {
        /* sin API */
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const k = useMemo(() => {
    const abiertas = ops.filter((o) => (o.estado ?? "Abierta") === "Abierta");
    const ganadas = ops.filter((o) => o.estado === "Ganada");
    const perdidas = ops.filter((o) => o.estado === "Perdida");
    const pipeline = abiertas.reduce((s, o) => s + o.importe, 0);
    const ticket = abiertas.length === 0 ? 0 : pipeline / abiertas.length;
    const prevision = abiertas.reduce((s, o) => s + (o.importe * o.probabilidad) / 100, 0);
    const cerradas = ganadas.length + perdidas.length;
    const winRate = cerradas === 0 ? 0 : (ganadas.length / cerradas) * 100;
    const aceptadas = ofertas.filter((o) => o.estado === "Aceptada").length;
    const activas = new Set(ops.map((o) => o.ofertaActivaId).filter(Boolean)).size;
    const tareas = acciones.filter((a) => a.tipo === "tarea" && a.estado !== "Cancelada");
    const tareasHechas = tareas.filter((a) => a.estado === "Hecha").length;
    const conCob = clientes.filter((c) => c.coberturaId && !c.fechaBaja);
    const alDia = conCob.filter((c) => estadoCobertura(c).cara === "ok").length;
    const porEtapa = new Map<string, { nombre: string; valor: number; n: number }>();
    abiertas.forEach((o) => {
      const e = porEtapa.get(o.etapa) ?? { nombre: o.etapaNombre ?? o.etapa, valor: 0, n: 0 };
      e.valor += o.importe;
      e.n += 1;
      porEtapa.set(o.etapa, e);
    });
    const estadosOferta = new Map<string, number>();
    ofertas.forEach((o) => estadosOferta.set(o.estado, (estadosOferta.get(o.estado) ?? 0) + 1));
    return {
      abiertas: abiertas.length,
      pipeline,
      ticket,
      prevision,
      winRate,
      ganadas: ganadas.length,
      perdidas: perdidas.length,
      aceptadas,
      activas,
      tareasPct: tareas.length === 0 ? 0 : Math.round((tareasHechas / tareas.length) * 100),
      tareasHechas,
      tareasTotal: tareas.length,
      coberturaPct: conCob.length === 0 ? 0 : Math.round((alDia / conCob.length) * 100),
      embudo: [...porEtapa.values()].map((e) => ({ nombre: e.nombre, valor: Math.round(e.valor / 100) / 10, n: e.n })),
      tarta: [...estadosOferta.entries()].map(([name, value]) => ({ name, value })),
    };
  }, [ops, ofertas, clientes, acciones]);

  return (
    <div className="anim-rise space-y-4">
      <div>
        <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-300/70">RENDIMIENTO</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">KPIs Comerciales</h1>
        <p className="mt-1 text-sm text-slate-400">{cargando ? "Sincronizando…" : "Calculados en tiempo real sobre tu base de datos"}</p>
      </div>

      {cargando ? (
        <div className="jarvis-panel p-10 text-center font-mono text-xs tracking-widest text-cyan-200/70">SINCRONIZANDO CON EL NÚCLEO…</div>
      ) : ops.length === 0 ? (
        <div className="jarvis-panel p-10 text-center">
          <p className="text-sm font-semibold text-slate-200">Sin conexión con la API.</p>
          <p className="mt-1 font-mono text-xs text-slate-500">Arranca con `./dev.sh` o `npm run server`.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <Tarjeta titulo="Pipeline abierto" valor={formatEur(k.pipeline)} sub={`${k.abiertas} oportunidades abiertas`} to="/oportunidades" />
            <Tarjeta titulo="Previsión ponderada" valor={formatEur(Math.round(k.prevision))} sub={`Ticket medio ${formatEur(Math.round(k.ticket))}`} to="/oportunidades" />
            <Tarjeta titulo="Win rate" valor={`${k.winRate.toFixed(1)}%`} sub={`${k.ganadas} ganadas · ${k.perdidas} perdidas`} to="/oportunidades" />
            <Tarjeta titulo="Ofertas" valor={`${k.aceptadas} aceptadas`} sub={`${k.activas} activas sincronizadas`} to="/ofertas" />
            <Tarjeta titulo="Tareas completadas" valor={`${k.tareasPct}%`} sub={`${k.tareasHechas} de ${k.tareasTotal} no canceladas`} to="/tareas" />
            <Tarjeta titulo="Cobertura al día" valor={`${k.coberturaPct}%`} sub="Clientes con contacto en plazo" to="/clientes" />
          </div>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            <section className="jarvis-panel p-5" aria-label="Embudo por etapa">
              <h2 className="section-title">Embudo por etapa · miles de €</h2>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={k.embudo} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
                    <CartesianGrid stroke="rgba(103,232,249,.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#7d8aa0", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nombre" width={100} tick={{ fill: "#a5e8ff", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipOscuro} formatter={(v, _n, p) => [`€${Number(v).toLocaleString("es-ES")}k · ${p?.payload?.n ?? 0} ops`, "Pipeline"]} />
                    <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                      {k.embudo.map((_, i) => (
                        <Cell key={i} fill={PALETA[i % PALETA.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="jarvis-panel p-5" aria-label="Ofertas por estado">
              <h2 className="section-title">Ofertas por estado</h2>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={k.tarta} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                      {k.tarta.map((_, i) => (
                        <Cell key={i} fill={PALETA[i % PALETA.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipOscuro} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {k.tarta.map((t, i) => (
                  <span key={t.name} className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETA[i % PALETA.length] }} />
                    {t.name} · {t.value}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
