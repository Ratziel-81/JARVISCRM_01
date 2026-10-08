import { Check, Images, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  ESTADO_ACCION_STYLES,
  PRIORIDAD_STYLES,
  type Accion,
  type Cliente,
  type EstadoAccion,
  type Prioridad,
} from "../data/mockData";
import { api } from "../lib/api";
import { fmtFecha } from "../lib/cobertura";
import { useSkin } from "../lib/skin";

type FiltroEstado = "Todas" | "Pendientes" | "Hechas" | "Canceladas";
type FiltroVence = "Todas" | "Atrasadas" | "Hoy" | "Esta semana" | "Sin fecha";
type Orden = "vencimiento" | "prioridad" | "recientes";

const HOY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

const PESO_PRIORIDAD: Record<Prioridad, number> = { Alta: 0, Media: 1, Baja: 2 };
// Franja lateral por prioridad con estilo inline: las clases de borde en capas
// de Tailwind pierden contra .jarvis-panel (sin capa) y la franja no se veía.
// Mapa por tema para que lea bien en ambos.
function colorFranja(p: Prioridad, claro: boolean): string {
  if (claro) return p === "Alta" ? "#E77F8B" : p === "Media" ? "#E8B44D" : "#36B99A";
  return p === "Alta" ? "#f87171" : p === "Media" ? "#fbbf24" : "#34d399";
}

function esAtrasada(a: Accion): boolean {
  return !!a.fecha && a.fecha < HOY && a.estado === "Pendiente";
}
function esHoy(a: Accion): boolean {
  return a.fecha === HOY && a.estado === "Pendiente";
}
function enSemana(a: Accion): boolean {
  if (!a.fecha) return false;
  const d = new Date(`${a.fecha}T00:00:00`);
  const diff = Math.floor((d.getTime() - new Date(`${HOY}T00:00:00`).getTime()) / 86_400_000);
  return diff >= 0 && diff <= 7;
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

interface FormTarea {
  titulo: string;
  detalle: string;
  prioridad: Prioridad;
  responsable: string;
  fecha: string;
  hora: string;
  estado: EstadoAccion;
  clienteId: string;
  empresa: string;
}

const formVacio = (): FormTarea => ({
  titulo: "",
  detalle: "",
  prioridad: "Media",
  responsable: "",
  fecha: HOY,
  hora: "",
  estado: "Pendiente",
  clienteId: "",
  empresa: "",
});

export default function TareasPage() {
  const [tareas, setTareas] = useState<Accion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [query, setQuery] = useState("");
  const [fEstado, setFEstado] = useState<FiltroEstado>("Todas");
  const [fPrioridad, setFPrioridad] = useState<"Todas" | Prioridad>("Todas");
  const [fResp, setFResp] = useState("Todos");
  const [fVence, setFVence] = useState<FiltroVence>("Todas");
  const [orden, setOrden] = useState<Orden>("vencimiento");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<FormTarea>(formVacio());
  const [edit, setEdit] = useState<FormTarea>(formVacio());
  const [guardando, setGuardando] = useState(false);

  async function recargar() {
    const accs = await api.acciones();
    setTareas(accs.filter((a) => a.tipo === "tarea"));
  }

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [accs, clis] = await Promise.all([api.acciones(), api.clientes()]);
        if (!vivo) return;
        setTareas(accs.filter((a) => a.tipo === "tarea"));
        setClientes(clis);
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

  const selected = useMemo(() => tareas.find((t) => t.id === selectedId) ?? null, [tareas, selectedId]);
  const { skin } = useSkin();
  const claro = skin === "neumorphism-01";

  function abrirDetalle(t: Accion) {
    setEdit({
      titulo: t.titulo,
      detalle: t.detalle ?? "",
      prioridad: t.prioridad ?? "Media",
      responsable: t.responsable ?? "",
      fecha: t.fecha ?? HOY,
      hora: t.hora ?? "",
      estado: t.estado,
      clienteId: t.clienteId ?? "",
      empresa: t.empresa ?? "",
    });
    setSelectedId(t.id);
  }

  const responsables = useMemo(() => {
    const s = new Set<string>();
    tareas.forEach((t) => t.responsable?.trim() && s.add(t.responsable.trim()));
    return [...s].sort((a, b) => a.localeCompare(b, "es"));
  }, [tareas]);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tareas.filter((t) => {
      const okEstado =
        fEstado === "Todas" ||
        (fEstado === "Pendientes" && t.estado === "Pendiente") ||
        (fEstado === "Hechas" && t.estado === "Hecha") ||
        (fEstado === "Canceladas" && t.estado === "Cancelada");
      const okPri = fPrioridad === "Todas" || (t.prioridad ?? "Media") === fPrioridad;
      const okResp = fResp === "Todos" || (t.responsable ?? "") === fResp;
      const okVence =
        fVence === "Todas" ||
        (fVence === "Atrasadas" && esAtrasada(t)) ||
        (fVence === "Hoy" && esHoy(t)) ||
        (fVence === "Esta semana" && enSemana(t)) ||
        (fVence === "Sin fecha" && !t.fecha);
      const okQ =
        q.length === 0 ||
        t.titulo.toLowerCase().includes(q) ||
        (t.detalle ?? "").toLowerCase().includes(q) ||
        (t.empresa ?? "").toLowerCase().includes(q);
      return okEstado && okPri && okResp && okVence && okQ;
    });
    list = [...list].sort((a, b) => {
      if (orden === "prioridad") return PESO_PRIORIDAD[a.prioridad ?? "Media"] - PESO_PRIORIDAD[b.prioridad ?? "Media"];
      if (orden === "recientes") return 0;
      return (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999");
    });
    return list;
  }, [tareas, query, fEstado, fPrioridad, fResp, fVence, orden]);

  const stats = useMemo(() => {
    const validas = tareas.filter((t) => t.estado !== "Cancelada");
    const hechas = validas.filter((t) => t.estado === "Hecha").length;
    return {
      total: validas.length,
      hechas,
      pct: validas.length === 0 ? 0 : Math.round((hechas / validas.length) * 100),
      atrasadas: tareas.filter(esAtrasada).length,
      pendientes: tareas.filter((t) => t.estado === "Pendiente").length,
    };
  }, [tareas]);

  async function completar(id: string, aHecha: boolean) {
    try {
      const act = await api.estadoAccion(id, aHecha ? "Hecha" : "Pendiente");
      setTareas((prev) => prev.map((t) => (t.id === id ? act : t)));
    } catch {
      alert("No se pudo actualizar. Arranca la API con `npm run server`.");
    }
  }

  async function crear(e: FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim() || guardando) return;
    setGuardando(true);
    try {
      await api.crearAccion({ ...form, tipo: "tarea", clienteId: form.clienteId || null });
      await recargar();
      setForm(formVacio());
      setModal(false);
    } catch {
      alert("No se pudo crear. Arranca la API con `npm run server`.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!selected || guardando) return;
    setGuardando(true);
    try {
      const act = await api.editarAccion(selected.id, { ...edit, clienteId: edit.clienteId || null });
      setTareas((prev) => prev.map((t) => (t.id === selected.id ? act : t)));
    } catch {
      alert("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!selected || !confirm(`¿Borrar "${selected.titulo}"?`)) return;
    const res = await api.borrarAccion(selected.id);
    if (!res.ok) {
      alert("No se pudo borrar.");
      return;
    }
    setTareas((prev) => prev.filter((t) => t.id !== selected.id));
    setSelectedId(null);
  }

  const inputCls =
    "w-full rounded-xl border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-300/50";
  const selectCls = "rounded-xl border border-white/10 bg-[#041321] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-300/50";

  function camposFormulario(f: FormTarea, setF: Dispatch<SetStateAction<FormTarea>>, conEstado: boolean) {
    return (
      <>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-400">Título *</span>
          <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} required placeholder="Ej. Preparar propuesta" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-400">Detalle</span>
          <textarea value={f.detalle} onChange={(e) => setF({ ...f, detalle: e.target.value })} rows={4} placeholder="Pasos, contexto, enlaces…" className={`${inputCls} resize-y`} />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">Prioridad</span>
            <select value={f.prioridad} onChange={(e) => setF({ ...f, prioridad: e.target.value as Prioridad })} className={`${selectCls} w-full text-sm`}>
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">Responsable</span>
            <input value={f.responsable} onChange={(e) => setF({ ...f, responsable: e.target.value })} placeholder="¿Quién?" list="responsables" className={inputCls} />
            <datalist id="responsables">
              {responsables.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">Vence</span>
            <input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={inputCls} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">Cliente</span>
            <select value={f.clienteId} onChange={(e) => setF({ ...f, clienteId: e.target.value })} className={`${selectCls} w-full text-sm`}>
              <option value="">Sin vincular</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          {conEstado ? (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Estado</span>
              <select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value as EstadoAccion })} className={`${selectCls} w-full text-sm`}>
                <option>Pendiente</option>
                <option>Hecha</option>
                <option>Cancelada</option>
              </select>
            </label>
          ) : (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Hora</span>
              <input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} className={inputCls} />
            </label>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="anim-rise space-y-4">
      {/* cabecera + progreso */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-300/70">SEGUIMIENTO</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-100">Tareas</h1>
          <p className="mt-1 text-sm text-slate-400">
            {cargando ? "Sincronizando…" : `${stats.hechas} de ${stats.total} completadas`}
            {!cargando && stats.atrasadas > 0 && <span className="ml-2 font-semibold text-red-300">· {stats.atrasadas} atrasadas</span>}
            {!cargando && stats.pendientes > 0 && <span className="ml-2 text-amber-300">· {stats.pendientes} pendientes</span>}
          </p>
        </div>
        <button
          onClick={() => {
            setForm(formVacio());
            setModal(true);
          }}
          className="flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
        >
          <Plus size={16} /> Nueva tarea
        </button>
      </div>
      {!cargando && (
        <div className="jarvis-panel flex items-center gap-3 p-4">
          <div className="jarvis-track h-2.5 flex-1 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
              style={{ width: `${stats.pct}%` }}
            />
          </div>
          <span className="num-display text-sm font-bold text-cyan-100">{stats.pct}%</span>
        </div>
      )}

      {/* filtros */}
      <div className="jarvis-panel space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-300/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, detalle o empresa…"
              className="w-full rounded-xl border border-cyan-300/15 bg-white/[.04] py-2.5 pl-10 pr-9 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-300/50"
              aria-label="Buscar tareas"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200" aria-label="Limpiar búsqueda">
                <X size={15} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["Todas", "Pendientes", "Hechas", "Canceladas"] as FiltroEstado[]).map((s) => (
              <button
                key={s}
                onClick={() => setFEstado(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  fEstado === s
                    ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 bg-white/[.02] text-slate-400 hover:border-cyan-300/30 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-2.5">
          {(["Todas", "Alta", "Media", "Baja"] as ("Todas" | Prioridad)[]).map((p) => (
            <button
              key={p}
              onClick={() => setFPrioridad(p)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                fPrioridad === p
                  ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 bg-white/[.02] text-slate-400 hover:border-cyan-300/30 hover:text-slate-200"
              }`}
            >
              {p === "Todas" ? "Toda prioridad" : `⬤ ${p}`}
            </button>
          ))}
          <select value={fResp} onChange={(e) => setFResp(e.target.value)} className={selectCls} aria-label="Filtrar por responsable">
            <option value="Todos">Todo responsable</option>
            {responsables.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select value={fVence} onChange={(e) => setFVence(e.target.value as FiltroVence)} className={selectCls} aria-label="Filtrar por vencimiento">
            <option value="Todas">Todo vencimiento</option>
            <option value="Atrasadas">Atrasadas</option>
            <option value="Hoy">Vencen hoy</option>
            <option value="Esta semana">Esta semana</option>
            <option value="Sin fecha">Sin fecha</option>
          </select>
          <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} className={selectCls} aria-label="Ordenar">
            <option value="vencimiento">Por vencimiento</option>
            <option value="prioridad">Por prioridad</option>
            <option value="recientes">Sin ordenar</option>
          </select>
        </div>
      </div>

      {/* lista visual */}
      {cargando ? (
        <div className="jarvis-panel p-10 text-center font-mono text-xs tracking-widest text-cyan-200/70">SINCRONIZANDO CON EL NÚCLEO…</div>
      ) : filtradas.length === 0 ? (
        <div className="jarvis-panel p-10 text-center">
          <p className="text-sm font-semibold text-slate-200">Sin tareas para esos filtros.</p>
          <p className="mt-1 text-xs text-slate-500">Crea la primera con «Nueva tarea».</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtradas.map((t) => {
            const hecha = t.estado === "Hecha";
            const atrasada = esAtrasada(t);
            return (
              <li
                key={t.id}
                onClick={() => abrirDetalle(t)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    abrirDetalle(t);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Tarea ${t.titulo}`}
                className="jarvis-panel jarvis-panel-hover cursor-pointer p-4"
                style={{ borderLeft: `4px solid ${colorFranja(t.prioridad ?? "Media", claro)}` }}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      completar(t.id, !hecha);
                    }}
                    title={hecha ? "Volver a pendiente" : "Marcar como hecha"}
                    aria-label={hecha ? "Volver a pendiente" : "Marcar como hecha"}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      hecha
                        ? "border-emerald-300 bg-emerald-400/20 text-emerald-300"
                        : "border-slate-600 text-transparent hover:border-emerald-300/60"
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className={`truncate text-[15px] font-bold ${hecha ? "text-slate-500 line-through" : "text-slate-100"}`}>
                        {t.titulo}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORIDAD_STYLES[t.prioridad ?? "Media"]}`}>
                        {t.prioridad ?? "Media"}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ESTADO_ACCION_STYLES[t.estado]}`}>
                        {t.estado}
                      </span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
                      {t.fecha ? (
                        <span className={atrasada ? "font-bold text-red-300" : esHoy(t) ? "font-bold text-amber-300" : "text-slate-500"}>
                          {atrasada ? "⚠ Atrasada · " : ""}{esHoy(t) ? "Hoy" : fmtFecha(t.fecha)}{t.hora ? ` ${t.hora}` : ""}
                        </span>
                      ) : (
                        <span className="text-slate-600">Sin fecha</span>
                      )}
                      {t.responsable && (
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-700 text-[9px] font-bold text-white">
                            {iniciales(t.responsable)}
                          </span>
                          {t.responsable}
                        </span>
                      )}
                      {(t.clienteNombre || t.empresa) && (
                        <span className="text-slate-500">{t.clienteNombre ?? t.empresa}</span>
                      )}
                      {(t.numFotos ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Images size={12} /> {t.numFotos}
                        </span>
                      )}
                    </div>
                    {t.detalle && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">{t.detalle}</p>}
                  </div>
                  {!hecha && t.estado === "Pendiente" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        completar(t.id, true);
                      }}
                      className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20 sm:flex"
                    >
                      <Check size={13} /> Hecha
                    </button>
                  )}
                  {hecha && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        completar(t.id, false);
                      }}
                      title="Reabrir"
                      className="shrink-0 rounded-lg border border-white/10 p-1.5 text-slate-500 transition hover:border-amber-300/40 hover:text-amber-300"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* detalle / edición */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setSelectedId(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={guardar}
            className="jarvis-panel max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="section-title">Editar tarea</h2>
              <button type="button" onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-slate-200" aria-label="Cerrar">
                <X size={17} />
              </button>
            </div>
            {camposFormulario(edit, setEdit, true)}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 rounded-xl border border-cyan-300/40 bg-cyan-300/10 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={borrar}
                className="flex items-center gap-1.5 rounded-xl border border-red-300/20 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:border-red-300/50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* modal crear */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setModal(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={crear}
            className="jarvis-panel max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="section-title">Nueva tarea</h2>
              <button type="button" onClick={() => setModal(false)} className="text-slate-500 hover:text-slate-200" aria-label="Cerrar">
                <X size={17} />
              </button>
            </div>
            {camposFormulario(form, setForm, true)}
            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-xl border border-cyan-300/40 bg-cyan-300/10 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Crear tarea"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
