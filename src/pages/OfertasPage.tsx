import { ArrowRight, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import VersionOferta from "../components/oportunidades/VersionOferta";
import {
  formatEur,
  type EstadoOferta,
  type Oferta,
  type Oportunidad,
} from "../data/mockData";
import { api } from "../lib/api";

const ESTADOS_OFERTA: ("Todos" | EstadoOferta)[] = ["Todos", "Borrador", "Enviada", "Aceptada", "Rechazada", "Descartada", "Expirada"];
type OrdenOf = "empresa" | "vencimiento" | "importe";

function diasParaVencer(of: Oferta, hoy = new Date()): number | null {
  if (!of.fechaVencimiento) return null;
  const d = new Date(`${of.fechaVencimiento}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - hoy.getTime()) / 86_400_000);
}

export default function OfertasPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [ops, setOps] = useState<Oportunidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState<(typeof ESTADOS_OFERTA)[number]>("Todos");
  const [soloActivas, setSoloActivas] = useState(false);
  const [orden, setOrden] = useState<OrdenOf>("empresa");
  const [actuando, setActuando] = useState<string | null>(null);
  const navigate = useNavigate();

  async function recargar() {
    const [ofs, oportunidades] = await Promise.all([api.ofertas(), api.oportunidades()]);
    setOfertas(ofs);
    setOps(oportunidades);
  }

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await recargar();
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

  const activaDe = useMemo(() => {
    const m = new Map<string, string>();
    ops.forEach((o) => {
      if (o.ofertaActivaId) m.set(o.ofertaActivaId, o.id);
    });
    return m;
  }, [ops]);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = ofertas.filter((o) => {
      const okEstado = estado === "Todos" || o.estado === estado;
      const okActiva = !soloActivas || activaDe.has(o.id);
      const okQ =
        q.length === 0 ||
        o.titulo.toLowerCase().includes(q) ||
        (o.oportunidadEmpresa ?? "").toLowerCase().includes(q);
      return okEstado && okActiva && okQ;
    });
    list = [...list].sort((a, b) => {
      if (orden === "importe") return b.importe - a.importe;
      if (orden === "vencimiento") {
        const da = a.fechaVencimiento ?? "9999";
        const db = b.fechaVencimiento ?? "9999";
        return da.localeCompare(db);
      }
      return `${a.oportunidadEmpresa ?? ""} ${a.numero ?? 0}`.localeCompare(`${b.oportunidadEmpresa ?? ""} ${b.numero ?? 0}`, "es");
    });
    return list;
  }, [ofertas, query, estado, soloActivas, orden, activaDe]);

  const stats = useMemo(() => {
    const activas = ofertas.filter((o) => activaDe.has(o.id));
    const porVencer = ofertas.filter((o) => {
      if (o.estado !== "Enviada") return false;
      const d = diasParaVencer(o);
      return d !== null && d <= 7;
    });
    return {
      total: ofertas.length,
      importe: ofertas.filter((o) => ["Enviada", "Borrador"].includes(o.estado)).reduce((s, o) => s + o.importe, 0),
      activas: activas.length,
      porVencer: porVencer.length,
    };
  }, [ofertas, activaDe]);

  async function correr(clave: string, fn: () => Promise<unknown>) {
    if (actuando) return;
    setActuando(clave);
    try {
      await fn();
      await recargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Operación no permitida");
    } finally {
      setActuando(null);
    }
  }

  return (
    <div className="anim-rise space-y-4">
      {/* cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-300/70">PRESUPUESTOS</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white">Ofertas</h1>
          <p className="mt-1 text-sm text-slate-400">
            {cargando
              ? "Sincronizando…"
              : `${filtradas.length} de ${stats.total} ofertas · ${formatEur(stats.importe)} en juego · ${stats.activas} activas`}
            {!cargando && stats.porVencer > 0 && (
              <span className="ml-2 font-semibold text-amber-300">· {stats.porVencer} por vencer</span>
            )}
          </p>
        </div>
        <button
          onClick={() => navigate("/oportunidades")}
          className="flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
        >
          <Plus size={16} /> Nueva oferta
        </button>
      </div>

      {/* filtros */}
      <div className="jarvis-panel flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-300/70" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título u oportunidad…"
            className="w-full rounded-xl border border-cyan-300/15 bg-white/[.04] py-2.5 pl-10 pr-9 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-300/50"
            aria-label="Buscar ofertas"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200" aria-label="Limpiar búsqueda">
              <X size={15} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ESTADOS_OFERTA.map((s) => (
            <button
              key={s}
              onClick={() => setEstado(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                estado === s
                  ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 bg-white/[.02] text-slate-400 hover:border-cyan-300/30 hover:text-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as OrdenOf)}
            className="rounded-xl border border-white/10 bg-[#041321] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-300/50"
            aria-label="Ordenar"
          >
            <option value="empresa">Por oportunidad</option>
            <option value="vencimiento">Por vencimiento</option>
            <option value="importe">Mayor importe</option>
          </select>
          <button
            onClick={() => setSoloActivas((v) => !v)}
            aria-pressed={soloActivas}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              soloActivas
                ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 bg-white/[.02] text-slate-400 hover:text-slate-200"
            }`}
          >
            Solo activas
          </button>
        </div>
      </div>

      {/* listado */}
      {cargando ? (
        <div className="jarvis-panel p-10 text-center font-mono text-xs tracking-widest text-cyan-200/70">SINCRONIZANDO CON EL NÚCLEO…</div>
      ) : filtradas.length === 0 ? (
        <div className="jarvis-panel p-10 text-center">
          <p className="text-sm font-semibold text-slate-200">Sin ofertas para esos filtros.</p>
          <p className="mt-1 text-xs text-slate-500">Las ofertas se crean versionadas dentro de cada oportunidad.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtradas.map((of) => {
            const opId = of.oportunidadId ?? activaDe.get(of.id);
            const op = ops.find((o) => o.id === opId);
            const dias = diasParaVencer(of);
            const urge = of.estado === "Enviada" && dias !== null && dias <= 7;
            return (
              <li key={of.id}>
                <div className="mb-1 flex flex-wrap items-center gap-2 px-1">
                  {op ? (
                    <Link
                      to={`/oportunidades?sel=${op.id}`}
                      className="flex items-center gap-1 text-xs font-bold text-cyan-200 transition hover:text-white"
                    >
                      {op.empresa} <ArrowRight size={12} />
                    </Link>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">{of.oportunidadEmpresa ?? "—"}</span>
                  )}
                  {op && (op.estado ?? "Abierta") !== "Abierta" && (
                    <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                      Oportunidad {op.estado}
                    </span>
                  )}
                  {urge && (
                    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${dias! < 0 ? "border-red-300/40 bg-red-400/10 text-red-300" : "border-amber-300/40 bg-amber-400/10 text-amber-300"}`}>
                      {dias! < 0 ? `Vencida hace ${-dias!} días` : dias === 0 ? "Vence hoy" : `Vence en ${dias} días`}
                    </span>
                  )}
                </div>
                <VersionOferta
                  of={of}
                  esActiva={activaDe.has(of.id)}
                  abierta={op ? (op.estado ?? "Abierta") === "Abierta" : true}
                  busy={actuando !== null}
                  onActivar={() => correr(`act-${of.id}`, () => api.activarOferta(of.id))}
                  onEstado={(sig) => correr(`${sig}-${of.id}`, () => api.estadoOferta(of.id, sig))}
                  onBorrar={() =>
                    correr(`del-${of.id}`, async () => {
                      const res = await fetch(`/api/ofertas/${of.id}`, { method: "DELETE" });
                      if (!res.ok) throw new Error("No se puede borrar");
                    })
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
