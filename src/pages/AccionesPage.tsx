import {
  CalendarDays,
  Check,
  ClipboardList,
  ImagePlus,
  Images,
  MapPin,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ESTADO_ACCION_STYLES,
  TIPO_ACCION_LABEL,
  type Accion,
  type AccionFoto,
  type Cliente,
  type EstadoAccion,
  type TipoAccion,
} from "../data/mockData";
import { api } from "../lib/api";
import { fmtFecha } from "../lib/cobertura";

const TIPOS: ("Todas" | TipoAccion)[] = ["Todas", "llamada", "reunion", "visita", "tarea"];
const ESTADOS: ("Todas" | EstadoAccion)[] = ["Todas", "Pendiente", "Hecha", "Cancelada"];

const TIPO_ICON: Record<TipoAccion, typeof Phone> = {
  llamada: Phone,
  reunion: Users,
  visita: MapPin,
  tarea: ClipboardList,
};

const TIPO_COLOR: Record<TipoAccion, string> = {
  llamada: "text-sky-300 border-sky-300/30 bg-sky-300/10",
  reunion: "text-violet-300 border-violet-300/30 bg-violet-300/10",
  visita: "text-emerald-300 border-emerald-300/30 bg-emerald-300/10",
  tarea: "text-amber-300 border-amber-300/30 bg-amber-300/10",
};

function etiquetaFecha(fecha: string | null): string {
  if (!fecha) return "Sin fecha";
  const hoy = new Date().toISOString().slice(0, 10);
  const man = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (fecha === hoy) return "Hoy";
  if (fecha === man) return "Mañana";
  return fmtFecha(fecha);
}

const hoyInput = () => new Date().toISOString().slice(0, 10);

interface FormAccion {
  titulo: string;
  tipo: TipoAccion;
  estado: EstadoAccion;
  fecha: string;
  hora: string;
  empresa: string;
  clienteId: string;
  detalle: string;
}

const formVacio = (): FormAccion => ({
  titulo: "",
  tipo: "llamada",
  estado: "Pendiente",
  fecha: hoyInput(),
  hora: "",
  empresa: "",
  clienteId: "",
  detalle: "",
});

export default function AccionesPage() {
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [query, setQuery] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<(typeof TIPOS)[number]>("Todas");
  const [estadoFiltro, setEstadoFiltro] = useState<(typeof ESTADOS)[number]>("Todas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<FormAccion>(formVacio());
  const [edit, setEdit] = useState<FormAccion>(formVacio());
  const [fotos, setFotos] = useState<AccionFoto[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function recargar() {
    const [accs, clis] = await Promise.all([api.acciones(), api.clientes()]);
    setAcciones(accs);
    setClientes(clis);
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

  const selected = useMemo(() => acciones.find((a) => a.id === selectedId) ?? null, [acciones, selectedId]);

  function abrirDetalle(a: Accion) {
    setEdit({
      titulo: a.titulo,
      tipo: a.tipo,
      estado: a.estado,
      fecha: a.fecha ?? hoyInput(),
      hora: a.hora ?? "",
      empresa: a.empresa ?? "",
      clienteId: a.clienteId ?? "",
      detalle: a.detalle ?? "",
    });
    setFotos([]);
    setSelectedId(a.id);
    api
      .fotosDe(a.id)
      .then(setFotos)
      .catch(() => {});
  }

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return acciones.filter((a) => {
      const okTipo = tipoFiltro === "Todas" || a.tipo === tipoFiltro;
      const okEstado = estadoFiltro === "Todas" || a.estado === estadoFiltro;
      const okQ =
        q.length === 0 ||
        a.titulo.toLowerCase().includes(q) ||
        (a.empresa ?? "").toLowerCase().includes(q) ||
        (a.detalle ?? "").toLowerCase().includes(q);
      return okTipo && okEstado && okQ;
    });
  }, [acciones, query, tipoFiltro, estadoFiltro]);

  const pendientes = useMemo(() => acciones.filter((a) => a.estado === "Pendiente").length, [acciones]);

  async function cambiarEstado(id: string, estado: EstadoAccion) {
    try {
      const actualizada = await api.estadoAccion(id, estado);
      setAcciones((prev) => prev.map((a) => (a.id === id ? actualizada : a)));
    } catch {
      alert("No se pudo cambiar el estado. Arranca la API con `npm run server`.");
    }
  }

  async function crear(e: FormEvent) {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    try {
      const nueva = await api.crearAccion({ ...form, clienteId: form.clienteId || null });
      setAcciones((prev) => [nueva, ...prev]);
      await recargar();
      setForm(formVacio());
      setModal(false);
    } catch {
      alert("No se pudo crear. Arranca la API con `npm run server`.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEdicion(e: FormEvent) {
    e.preventDefault();
    if (!selected || guardando) return;
    setGuardando(true);
    try {
      const actualizada = await api.editarAccion(selected.id, { ...edit, clienteId: edit.clienteId || null });
      setAcciones((prev) => prev.map((a) => (a.id === selected.id ? actualizada : a)));
    } catch {
      alert("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrarSeleccionada() {
    if (!selected || !confirm(`¿Borrar "${selected.titulo}" y sus fotos?`)) return;
    const res = await api.borrarAccion(selected.id);
    if (!res.ok) {
      alert("No se pudo borrar.");
      return;
    }
    setAcciones((prev) => prev.filter((a) => a.id !== selected.id));
    setSelectedId(null);
  }

  async function subirFotos(files: FileList | null) {
    if (!selected || !files || files.length === 0 || subiendo) return;
    setSubiendo(true);
    try {
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = reject;
          r.readAsDataURL(f);
        });
        await api.subirFoto(selected.id, f.name, f.type, dataUrl);
      }
      setFotos(await api.fotosDe(selected.id));
      await recargar();
    } catch {
      alert("No se pudieron subir las fotos (máx 5MB, solo imágenes).");
    } finally {
      setSubiendo(false);
    }
  }

  async function borrarFoto(id: string) {
    if (!selected || !confirm("¿Borrar esta foto?")) return;
    await api.borrarFoto(id);
    setFotos((prev) => prev.filter((f) => f.id !== id));
    await recargar();
  }

  const inputCls =
    "w-full rounded-xl border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-300/50";
  const selectCls = "w-full rounded-xl border border-cyan-300/15 bg-[#041321] px-3 py-2 text-sm text-slate-100 outline-none";

  return (
    <div className="anim-rise space-y-4">
      {/* cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-300/70">ACTIVIDAD COMERCIAL</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-100">Acciones</h1>
          <p className="mt-1 text-sm text-slate-400">
            {cargando ? "Sincronizando…" : `${filtradas.length} de ${acciones.length} acciones`}
            {!cargando && pendientes > 0 && <span className="ml-2 font-semibold text-amber-300">· {pendientes} pendientes</span>}
          </p>
        </div>
        <button
          onClick={() => {
            setForm(formVacio());
            setModal(true);
          }}
          className="flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
        >
          <Plus size={16} /> Nueva acción
        </button>
      </div>

      {/* filtros */}
      <div className="jarvis-panel space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-300/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, empresa o detalle…"
              className="w-full rounded-xl border border-cyan-300/15 bg-white/[.04] py-2.5 pl-10 pr-9 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-300/50"
              aria-label="Buscar acciones"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200" aria-label="Limpiar búsqueda">
                <X size={15} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ESTADOS.map((s) => (
              <button
                key={s}
                onClick={() => setEstadoFiltro(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  estadoFiltro === s
                    ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 bg-white/[.02] text-slate-400 hover:border-cyan-300/30 hover:text-slate-200"
                }`}
              >
                {s === "Todas" ? "Todas" : `${s}s`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-2.5">
          {TIPOS.map((t) => {
            const Icon = t === "Todas" ? CalendarDays : TIPO_ICON[t];
            return (
              <button
                key={t}
                onClick={() => setTipoFiltro(t)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  tipoFiltro === t
                    ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 bg-white/[.02] text-slate-400 hover:border-cyan-300/30 hover:text-slate-200"
                }`}
              >
                <Icon size={13} /> {t === "Todas" ? "Todas" : TIPO_ACCION_LABEL[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* lista */}
      {cargando ? (
        <div className="jarvis-panel p-10 text-center font-mono text-xs tracking-widest text-cyan-200/70">SINCRONIZANDO CON EL NÚCLEO…</div>
      ) : acciones.length === 0 ? (
        <div className="jarvis-panel p-10 text-center">
          <p className="text-sm font-semibold text-slate-200">Sin conexión con la API.</p>
          <p className="mt-1 font-mono text-xs text-slate-500">Arranca con `./dev.sh` o `npm run server`.</p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="jarvis-panel p-10 text-center">
          <p className="text-sm font-semibold text-slate-200">Sin resultados para esos filtros.</p>
        </div>
      ) : (
        <ul className="jarvis-panel divide-y divide-white/5">
          {filtradas.map((a) => {
            const Icon = TIPO_ICON[a.tipo] ?? ClipboardList;
            return (
              <li
                key={a.id}
                onClick={() => abrirDetalle(a)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    abrirDetalle(a);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Acción ${a.titulo}`}
                className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-cyan-300/[.04]"
              >
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${TIPO_COLOR[a.tipo] ?? TIPO_COLOR.tarea}`}>
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-100">{a.titulo}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ESTADO_ACCION_STYLES[a.estado]}`}>
                      {a.estado}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                    {TIPO_ACCION_LABEL[a.tipo] ?? a.tipo} · {etiquetaFecha(a.fecha)}
                    {a.hora ? ` ${a.hora}` : ""} · {a.clienteNombre ?? a.empresa ?? "—"}
                  </p>
                  {a.detalle ? <p className="mt-1 line-clamp-2 text-xs text-slate-400">{a.detalle}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {(a.numFotos ?? 0) > 0 && (
                    <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500" title={`${a.numFotos} fotos`}>
                      <Images size={13} /> {a.numFotos}
                    </span>
                  )}
                  {a.estado === "Pendiente" ? (
                    <button
                      onClick={() => cambiarEstado(a.id, "Hecha")}
                      title="Marcar como hecha"
                      className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 p-1.5 text-emerald-300 transition hover:bg-emerald-400/20"
                    >
                      <Check size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => cambiarEstado(a.id, "Pendiente")}
                      title="Volver a pendiente"
                      className="rounded-lg border border-white/10 p-1.5 text-slate-500 transition hover:border-amber-300/40 hover:text-amber-300"
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

      {/* detalle + edición */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setSelectedId(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="jarvis-panel max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto p-6"
            role="dialog"
            aria-label={selected.titulo}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-300/70">
                  {(TIPO_ACCION_LABEL[selected.tipo] ?? selected.tipo).toUpperCase()} · {etiquetaFecha(selected.fecha).toUpperCase()}
                  {selected.hora ? ` ${selected.hora}` : ""}
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-100">{selected.titulo}</h2>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-slate-200" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={guardarEdicion} className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">Tipo</span>
                  <select value={edit.tipo} onChange={(e) => setEdit((f) => ({ ...f, tipo: e.target.value as TipoAccion }))} className={selectCls}>
                    {(Object.keys(TIPO_ACCION_LABEL) as TipoAccion[]).map((t) => (
                      <option key={t} value={t}>{TIPO_ACCION_LABEL[t]}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">Estado</span>
                  <select value={edit.estado} onChange={(e) => setEdit((f) => ({ ...f, estado: e.target.value as EstadoAccion }))} className={selectCls}>
                    <option>Pendiente</option>
                    <option>Hecha</option>
                    <option>Cancelada</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">Fecha</span>
                  <input type="date" value={edit.fecha} onChange={(e) => setEdit((f) => ({ ...f, fecha: e.target.value }))} className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">Hora</span>
                  <input type="time" value={edit.hora} onChange={(e) => setEdit((f) => ({ ...f, hora: e.target.value }))} className={inputCls} />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">Empresa</span>
                  <input value={edit.empresa} onChange={(e) => setEdit((f) => ({ ...f, empresa: e.target.value }))} placeholder="Empresa" className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">Cliente vinculado</span>
                  <select value={edit.clienteId} onChange={(e) => setEdit((f) => ({ ...f, clienteId: e.target.value }))} className={selectCls}>
                    <option value="">Sin vincular</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Título</span>
                <input value={edit.titulo} onChange={(e) => setEdit((f) => ({ ...f, titulo: e.target.value }))} required className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Detalle / notas</span>
                <textarea
                  value={edit.detalle}
                  onChange={(e) => setEdit((f) => ({ ...f, detalle: e.target.value }))}
                  rows={5}
                  placeholder="Apunta aquí todo: asistentes, acuerdos, próximos pasos…"
                  className={`${inputCls} resize-y`}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 rounded-xl border border-cyan-300/40 bg-cyan-300/10 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50"
                >
                  {guardando ? "Guardando…" : "Guardar cambios"}
                </button>
                <button
                  type="button"
                  onClick={borrarSeleccionada}
                  className="flex items-center gap-1.5 rounded-xl border border-red-300/20 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:border-red-300/50"
                >
                  <Trash2 size={14} /> Borrar
                </button>
              </div>
            </form>

            {/* fotos */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="section-title">Fotos · {fotos.length}</h3>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.02] px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-cyan-300/40 hover:text-slate-100">
                  <ImagePlus size={13} /> {subiendo ? "Subiendo…" : "Añadir fotos"}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => subirFotos(e.target.files)} disabled={subiendo} />
                </label>
              </div>
              {fotos.length === 0 ? (
                <p className="mt-2 rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">
                  Sin fotos. Sube fotos de la visita, del local, de documentos…
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {fotos.map((f) => (
                    <div key={f.id} className="group relative overflow-hidden rounded-xl border border-white/10">
                      <a href={`/api/fotos/${f.id}`} target="_blank" rel="noreferrer">
                        <img src={`/api/fotos/${f.id}`} alt={f.archivo} className="aspect-square w-full object-cover" loading="lazy" />
                      </a>
                      <button
                        onClick={() => borrarFoto(f.id)}
                        title="Borrar foto"
                        className="absolute right-1 top-1 hidden rounded-lg bg-black/70 p-1.5 text-red-300 group-hover:block"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* modal crear */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setModal(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={crear}
            className="jarvis-panel max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="section-title">Nueva acción</h2>
              <button type="button" onClick={() => setModal(false)} className="text-slate-500 hover:text-slate-200" aria-label="Cerrar">
                <X size={17} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Tipo</span>
                <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoAccion }))} className={selectCls}>
                  {(Object.keys(TIPO_ACCION_LABEL) as TipoAccion[]).map((t) => (
                    <option key={t} value={t}>{TIPO_ACCION_LABEL[t]}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Estado inicial</span>
                <select value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoAccion }))} className={selectCls}>
                  <option>Pendiente</option>
                  <option>Hecha</option>
                  <option>Cancelada</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Título</span>
              <input
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Se genera solo si lo dejas vacío"
                className={inputCls}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Empresa</span>
                <input value={form.empresa} onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))} placeholder="Empresa" className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Cliente</span>
                <select value={form.clienteId} onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))} className={selectCls}>
                  <option value="">Sin vincular</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Fecha</span>
                <input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Hora</span>
                <input type="time" value={form.hora} onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))} className={inputCls} />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Detalle / notas</span>
              <textarea
                value={form.detalle}
                onChange={(e) => setForm((f) => ({ ...f, detalle: e.target.value }))}
                rows={4}
                placeholder="Apunta aquí todo lo relevante…"
                className={`${inputCls} resize-y`}
              />
            </label>
            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-xl border border-cyan-300/40 bg-cyan-300/10 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Crear acción"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
