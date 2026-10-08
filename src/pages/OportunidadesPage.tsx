import {
  FilePlus2,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Search,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import VersionOferta, { btnGhost } from "../components/oportunidades/VersionOferta";
import {
  ESTADO_OFERTA_STYLES,
  ESTADO_OPORTUNIDAD_STYLES,
  PRIORIDAD_STYLES,
  etapasPipeline,
  formatEur,
  type EtapaPipeline,
  type Oferta,
  type Oportunidad,
} from "../data/mockData";
import { api } from "../lib/api";
import { fmtFecha } from "../lib/cobertura";

type FiltroEstado = "Todas" | "Abiertas" | "Ganadas" | "Perdidas";
type VistaOp = "kanban" | "lista";

function OfertaActivaPill({ op, ofertas }: { op: Oportunidad; ofertas: Oferta[] }) {
  const act = ofertas.find((o) => o.id === op.ofertaActivaId);
  if (!act) return <span className="font-mono text-[10px] text-slate-600">sin oferta</span>;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ESTADO_OFERTA_STYLES[act.estado]}`}>
      v{act.numero ?? "?"} · {act.estado}
    </span>
  );
}

export default function OportunidadesPage() {
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [etapas, setEtapas] = useState<EtapaPipeline[]>(etapasPipeline);
  const [cargando, setCargando] = useState(true);
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<FiltroEstado>("Todas");
  const [vista, setVista] = useState<VistaOp>("kanban");
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [colOver, setColOver] = useState<string | null>(null);
  const [actuando, setActuando] = useState<string | null>(null);
  const [modalOp, setModalOp] = useState(false);
  const [formOp, setFormOp] = useState({ empresa: "", importe: "", prioridad: "Media", etapa: "prospeccion", probabilidad: "10" });
  const [nuevaVersion, setNuevaVersion] = useState(false);
  const [formOf, setFormOf] = useState({ titulo: "", importe: "", fechaVencimiento: "", notas: "" });
  const [motivo, setMotivo] = useState("");

  async function recargar() {
    const [ops, ofs] = await Promise.all([api.oportunidades(), api.ofertas()]);
    setOportunidades(ops);
    setOfertas(ofs);
  }

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [ops, ofs, ets] = await Promise.all([api.oportunidades(), api.ofertas(), api.etapas()]);
        if (!vivo) return;
        setOportunidades(ops);
        setOfertas(ofs);
        if (Array.isArray(ets) && ets.length > 0) setEtapas(ets);
      } catch {
        /* sin API: kanban vacío con aviso */
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const selected = useMemo(
    () => oportunidades.find((o) => o.id === (selectedId ?? params.get("sel"))) ?? null,
    [oportunidades, selectedId, params],
  );
  const versiones = useMemo(
    () => ofertas.filter((o) => o.oportunidadId === selectedId).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0)),
    [ofertas, selectedId],
  );

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return oportunidades.filter((o) => {
      const okF =
        filtro === "Todas" ||
        (filtro === "Abiertas" && (o.estado ?? "Abierta") === "Abierta") ||
        (filtro === "Ganadas" && o.estado === "Ganada") ||
        (filtro === "Perdidas" && o.estado === "Perdida");
      return okF && (q.length === 0 || o.empresa.toLowerCase().includes(q));
    });
  }, [oportunidades, query, filtro]);

  const porEtapa = useMemo(() => {
    const m = new Map<string, Oportunidad[]>();
    etapas.forEach((e) => m.set(e.id, []));
    filtradas.forEach((o) => {
      if (!m.has(o.etapa)) m.set(o.etapa, []);
      m.get(o.etapa)!.push(o);
    });
    return m;
  }, [etapas, filtradas]);

  const totalAbierto = useMemo(
    () => oportunidades.filter((o) => (o.estado ?? "Abierta") === "Abierta").reduce((s, o) => s + o.importe, 0),
    [oportunidades],
  );

  function cerrarDetalle() {
    setSelectedId(null);
    setParams({}, { replace: true });
  }

  async function correr(clave: string, fn: () => Promise<unknown>) {    if (actuando) return;
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

  async function soltarEn(etapaId: string) {
    setColOver(null);
    if (!dragId) return;
    const op = oportunidades.find((o) => o.id === dragId);
    setDragId(null);
    if (!op || op.etapa === etapaId || (op.estado ?? "Abierta") !== "Abierta") return;
    await correr(`mover-${op.id}`, () => api.moverOportunidad(op.id, etapaId));
  }

  async function crearOportunidad(e: FormEvent) {
    e.preventDefault();
    if (!formOp.empresa.trim()) return;
    await correr("nueva-op", async () => {
      const nueva = await api.crearOportunidad({
        empresa: formOp.empresa.trim(),
        importe: Number(formOp.importe) || 0,
        prioridad: formOp.prioridad,
        etapa: formOp.etapa,
        probabilidad: Number(formOp.probabilidad) || 0,
      });
      setFormOp({ empresa: "", importe: "", prioridad: "Media", etapa: "prospeccion", probabilidad: "10" });
      setModalOp(false);
      setSelectedId(nueva.id);
    });
  }

  async function crearVersion(e: FormEvent) {
    e.preventDefault();
    if (!selected || !formOf.titulo.trim()) return;
    await correr("nueva-version", async () => {
      await api.crearOferta(selected.id, {
        titulo: formOf.titulo.trim(),
        importe: Number(formOf.importe) || selected.importe,
        fechaVencimiento: formOf.fechaVencimiento || undefined,
        notas: formOf.notas || undefined,
      });
      setFormOf({ titulo: "", importe: "", fechaVencimiento: "", notas: "" });
      setNuevaVersion(false);
    });
  }

  const btnBase =
    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-40";

  return (
    <div className="anim-rise space-y-4">
      {/* cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-300/70">PIPELINE COMERCIAL</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-100">Oportunidades</h1>
          <p className="mt-1 text-sm text-slate-400">
            {cargando ? "Sincronizando…" : `${filtradas.length} oportunidades · ${formatEur(totalAbierto)} en abierto`}
          </p>
        </div>
        <button
          onClick={() => setModalOp(true)}
          className="flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
        >
          <Plus size={16} /> Nueva oportunidad
        </button>
      </div>

      {/* filtros */}
      <div className="jarvis-panel flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-300/70" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por empresa…"
            className="w-full rounded-xl border border-cyan-300/15 bg-white/[.04] py-2.5 pl-10 pr-9 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-300/50"
            aria-label="Buscar oportunidades"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200" aria-label="Limpiar búsqueda">
              <X size={15} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["Todas", "Abiertas", "Ganadas", "Perdidas"] as FiltroEstado[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                filtro === f
                  ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 bg-white/[.02] text-slate-400 hover:border-cyan-300/30 hover:text-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
          <div className="flex overflow-hidden rounded-xl border border-white/10" role="tablist" aria-label="Modo de vista">
            {(
              [
                { id: "kanban", label: "Kanban", Icon: LayoutGrid },
                { id: "lista", label: "Lista", Icon: List },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={vista === id}
                title={label}
                onClick={() => setVista(id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition ${
                  vista === id ? "bg-cyan-300/15 text-cyan-100" : "bg-white/[.02] text-slate-500 hover:text-slate-200"
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* kanban / lista */}
      {cargando ? (
        <div className="jarvis-panel p-10 text-center font-mono text-xs tracking-widest text-cyan-200/70">SINCRONIZANDO CON EL NÚCLEO…</div>
      ) : oportunidades.length === 0 ? (
        <div className="jarvis-panel p-10 text-center">
          <p className="text-sm font-semibold text-slate-200">Sin conexión con la API.</p>
          <p className="mt-1 font-mono text-xs text-slate-500">Arranca con `./dev.sh` o `npm run server`.</p>
        </div>
      ) : vista === "lista" ? (
        <div className="jarvis-panel overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-cyan-300/10 font-mono text-[11px] uppercase tracking-widest text-slate-500">
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Etapa</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3 text-right">Importe</th>
                <th className="px-4 py-3 text-right">Prob.</th>
                <th className="px-4 py-3">Oferta activa</th>
                <th className="px-4 py-3 text-right">Versiones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  className="cursor-pointer border-b border-white/5 transition last:border-0 hover:bg-cyan-300/[.04]"
                >
                  <td className="px-4 py-2.5 font-semibold text-slate-100">{o.empresa}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{etapas.find((e) => e.id === o.etapa)?.nombre ?? o.etapa}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ESTADO_OPORTUNIDAD_STYLES[o.estado ?? "Abierta"]}`}>
                      {o.estado ?? "Abierta"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORIDAD_STYLES[o.prioridad]}`}>
                      {o.prioridad}
                    </span>
                  </td>
                  <td className="num-display px-4 py-2.5 text-right font-semibold text-cyan-100">{formatEur(o.importe)}</td>
                  <td className="num-display px-4 py-2.5 text-right text-slate-400">{o.probabilidad}%</td>
                  <td className="px-4 py-2.5"><OfertaActivaPill op={o} ofertas={ofertas} /></td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-500">
                    {o.numOfertas ?? ofertas.filter((f) => f.oportunidadId === o.id).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 2xl:grid-cols-5">
          {etapas.map((et) => {
            const cards = porEtapa.get(et.id) ?? [];
            const suma = cards.reduce((s, o) => s + o.importe, 0);
            return (
              <section
                key={et.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setColOver(et.id);
                }}
                onDragLeave={() => setColOver((c) => (c === et.id ? null : c))}
                onDrop={() => soltarEn(et.id)}
                className={`jarvis-panel flex min-h-[220px] flex-col p-3 transition ${
                  colOver === et.id ? "border-cyan-300/60 shadow-[0_0_24px_-6px_rgba(34,211,238,.5)]" : ""
                }`}
                aria-label={et.nombre}
              >
                <header className="flex items-center gap-2 px-1 pb-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: et.color, boxShadow: `0 0 10px ${et.glow}` }} />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-200">{et.nombre}</h2>
                  <span className="ml-auto font-mono text-[11px] text-slate-500">
                    {cards.length} · {formatEur(suma)}
                  </span>
                </header>
                <div className="space-y-2.5">
                  {cards.map((o) => {
                    const terminal = (o.estado ?? "Abierta") !== "Abierta";
                    return (
                      <article
                        key={o.id}
                        draggable={!terminal}
                        onDragStart={() => setDragId(o.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setColOver(null);
                        }}
                        onClick={() => setSelectedId(o.id)}
                        className={`cursor-pointer rounded-xl border border-white/[.07] bg-white/[.02] p-3 transition hover:border-cyan-300/30 hover:bg-cyan-300/[.05] ${
                          dragId === o.id ? "opacity-40" : ""
                        } ${terminal ? "opacity-75" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-bold text-slate-100">{o.empresa}</p>
                          {(o.estado ?? "Abierta") !== "Abierta" && (
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ESTADO_OPORTUNIDAD_STYLES[o.estado!]}`}>
                              {o.estado === "Ganada" ? "Ganada" : "Perdida"}
                            </span>
                          )}
                        </div>
                        <p className="num-display mt-1 text-lg font-extrabold text-cyan-100">{formatEur(o.importe)}</p>
                        <div className="jarvis-track mt-2 h-1 overflow-hidden rounded-full">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${o.probabilidad}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORIDAD_STYLES[o.prioridad]}`}>
                            {o.prioridad}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">{o.probabilidad}%</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                          <OfertaActivaPill op={o} ofertas={ofertas} />
                          <span className="font-mono text-[10px] text-slate-600">
                            {(o.numOfertas ?? ofertas.filter((f) => f.oportunidadId === o.id).length) || 0} ofertas
                          </span>
                        </div>
                      </article>
                    );
                  })}
                  {cards.length === 0 && (
                    <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center font-mono text-[11px] text-slate-600">
                      Arrastra aquí
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* detalle oportunidad */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={cerrarDetalle}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="jarvis-panel max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto p-6"
            role="dialog"
            aria-label={`Oportunidad ${selected.empresa}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-300/70">
                  OPORTUNIDAD · {selected.etapaNombre ?? selected.etapa}
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-100">{selected.empresa}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ESTADO_OPORTUNIDAD_STYLES[selected.estado ?? "Abierta"]}`}>
                    {selected.estado ?? "Abierta"}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORIDAD_STYLES[selected.prioridad]}`}>
                    {selected.prioridad}
                  </span>
                  <span className="num-display text-sm font-bold text-cyan-100">{formatEur(selected.importe)}</span>
                  <span className="font-mono text-[11px] text-slate-500">{selected.probabilidad}% prob.</span>
                </div>
                {selected.estado !== undefined && selected.estado !== "Abierta" && (
                  <p className="mt-2 text-xs text-slate-400">
                    Cerrada el {fmtFecha(selected.fechaCierre)}{selected.motivo ? ` · ${selected.motivo}` : ""}
                  </p>
                )}
              </div>
              <button onClick={cerrarDetalle} className="text-slate-500 hover:text-slate-200" aria-label="Cerrar detalle">
                <X size={18} />
              </button>
            </div>

            {/* versiones */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="section-title">Ofertas · {versiones.length} versiones</h3>
                {(selected.estado ?? "Abierta") === "Abierta" && (
                  <button onClick={() => setNuevaVersion((v) => !v)} className={btnGhost}>
                    <FilePlus2 size={13} /> Nueva versión
                  </button>
                )}
              </div>
              {nuevaVersion && (
                <form onSubmit={crearVersion} className="mt-2 space-y-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[.03] p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      value={formOf.titulo}
                      onChange={(e) => setFormOf((f) => ({ ...f, titulo: e.target.value }))}
                      placeholder="Título de la versión"
                      required
                      className="rounded-lg border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-300/50 sm:col-span-2"
                    />
                    <input
                      type="number"
                      min="0"
                      value={formOf.importe}
                      onChange={(e) => setFormOf((f) => ({ ...f, importe: e.target.value }))}
                      placeholder={`Importe (actual ${selected.importe})`}
                      className="rounded-lg border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm outline-none focus:border-cyan-300/50"
                    />
                    <input
                      type="date"
                      value={formOf.fechaVencimiento}
                      onChange={(e) => setFormOf((f) => ({ ...f, fechaVencimiento: e.target.value }))}
                      className="rounded-lg border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm outline-none focus:border-cyan-300/50"
                      aria-label="Vencimiento"
                    />
                    <input
                      value={formOf.notas}
                      onChange={(e) => setFormOf((f) => ({ ...f, notas: e.target.value }))}
                      placeholder="Notas de la versión"
                      className="rounded-lg border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm placeholder:text-slate-600 outline-none focus:border-cyan-300/50 sm:col-span-2"
                    />
                  </div>
                  <button type="submit" disabled={actuando !== null} className={`${btnGhost} w-full justify-center`}>
                    Crear v{(versiones.length || 0) + 1} en Borrador
                  </button>
                </form>
              )}
              <ul className="mt-2 space-y-2">
                {versiones.map((of) => (
                  <li key={of.id}>
                    <VersionOferta
                      of={of}
                      esActiva={selected.ofertaActivaId === of.id}
                      abierta={(selected.estado ?? "Abierta") === "Abierta"}
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
                ))}
                {versiones.length === 0 && (
                  <li className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">
                    Sin ofertas todavía. Crea la primera versión.
                  </li>
                )}
              </ul>
            </div>

            {/* cierre */}
            {(selected.estado ?? "Abierta") === "Abierta" ? (
              <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-3">
                <h3 className="section-title">Cerrar oportunidad</h3>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo (obligatorio para Perdida)"
                    className="flex-1 rounded-lg border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm placeholder:text-slate-600 outline-none focus:border-cyan-300/50"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={actuando !== null}
                      onClick={() => correr("cerrar-g", () => api.cerrarOportunidad(selected.id, "Ganada"))}
                      className={`${btnBase} border-emerald-300/40 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20`}
                    >
                      <Trophy size={13} /> Ganada
                    </button>
                    <button
                      disabled={actuando !== null}
                      onClick={() => correr("cerrar-p", () => api.cerrarOportunidad(selected.id, "Perdida", motivo))}
                      className={`${btnBase} border-red-300/30 bg-red-400/10 text-red-200 hover:bg-red-400/20`}
                    >
                      <XCircle size={13} /> Perdida
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                disabled={actuando !== null}
                onClick={() => correr("reabrir", () => api.reabrirOportunidad(selected.id))}
                className={btnGhost}
              >
                <RotateCcw size={13} /> Reabrir oportunidad
              </button>
            )}
          </div>
        </div>
      )}

      {/* modal nueva oportunidad */}
      {modalOp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setModalOp(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={crearOportunidad}
            className="jarvis-panel w-full max-w-md space-y-3 p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="section-title">Nueva oportunidad</h2>
              <button type="button" onClick={() => setModalOp(false)} className="text-slate-500 hover:text-slate-200" aria-label="Cerrar">
                <X size={17} />
              </button>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Empresa *</span>
              <input
                value={formOp.empresa}
                onChange={(e) => setFormOp((f) => ({ ...f, empresa: e.target.value }))}
                placeholder="Ej. NovaDigital"
                required
                className="w-full rounded-xl border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm placeholder:text-slate-600 outline-none focus:border-cyan-300/50"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Importe (€)</span>
                <input
                  type="number"
                  min="0"
                  value={formOp.importe}
                  onChange={(e) => setFormOp((f) => ({ ...f, importe: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-xl border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm outline-none focus:border-cyan-300/50"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Prob. %</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formOp.probabilidad}
                  onChange={(e) => setFormOp((f) => ({ ...f, probabilidad: e.target.value }))}
                  className="w-full rounded-xl border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm outline-none focus:border-cyan-300/50"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Prioridad</span>
                <select
                  value={formOp.prioridad}
                  onChange={(e) => setFormOp((f) => ({ ...f, prioridad: e.target.value }))}
                  className="w-full rounded-xl border border-cyan-300/15 bg-[#041321] px-3 py-2 text-sm outline-none"
                >
                  <option>Alta</option>
                  <option>Media</option>
                  <option>Baja</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Etapa</span>
                <select
                  value={formOp.etapa}
                  onChange={(e) => setFormOp((f) => ({ ...f, etapa: e.target.value }))}
                  className="w-full rounded-xl border border-cyan-300/15 bg-[#041321] px-3 py-2 text-sm outline-none"
                >
                  {etapas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl border border-cyan-300/40 bg-cyan-300/10 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Crear oportunidad
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
