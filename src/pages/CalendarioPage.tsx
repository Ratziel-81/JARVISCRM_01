import { ChevronLeft, ChevronRight, Clock, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  TIPO_ACCION_LABEL,
  type Accion,
  type EstadoAccion,
  type TipoAccion,
} from "../data/mockData";
import { api } from "../lib/api";

type VistaCal = "dia" | "semana" | "mes";

const H0 = 7; // primera hora visible
const H1 = 21; // última hora visible
const PX_H = 56; // px por hora

const NOM_DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const NOM_DIAS_LARGO = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const NOM_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const aMin = (h: string | null | undefined): number => {
  const [a, b] = String(h ?? "09:00").split(":").map(Number);
  return (a || 0) * 60 + (b || 0);
};
const aHora = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;
const snap15 = (m: number): number => Math.round(m / 15) * 15;

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function desdeISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function addDias(iso: string, n: number): string {
  const d = desdeISO(iso);
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}
function lunesDe(iso: string): string {
  const d = desdeISO(iso);
  return addDias(iso, -((d.getDay() + 6) % 7));
}
function tituloDia(iso: string): string {
  const d = desdeISO(iso);
  return `${NOM_DIAS_LARGO[(d.getDay() + 6) % 7]} ${d.getDate()} de ${NOM_MES[d.getMonth()]}`;
}

// "hoy" fijo a la carga de la app (evita rebotes de fecha entre renders)
const ARRANQUE = new Date();
const HOY = isoLocal(ARRANQUE);

interface EditState {
  modo: "crear" | "editar";
  id?: string;
  titulo: string;
  tipo: TipoAccion;
  estado: EstadoAccion;
  fecha: string;
  hora: string;
  duracion: number;
  empresa: string;
  detalle: string;
}

export default function CalendarioPage() {
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<VistaCal>("semana");
  const [ref, setRef] = useState(() => isoLocal(new Date()));
  const [colOver, setColOver] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ahora, setAhora] = useState(() => ARRANQUE);

  // reloj en vivo para la línea de "ahora"
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  async function recargar() {
    setAcciones(await api.acciones());
  }

  useEffect(() => {
    let vivo = true;
    api
      .acciones()
      .then((d) => vivo && setAcciones(d))
      .catch(() => {})
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const dias: string[] = useMemo(() => {
    if (vista === "dia") return [ref];
    const lun = lunesDe(ref);
    return Array.from({ length: 7 }, (_, i) => addDias(lun, i));
  }, [vista, ref]);

  const semanasMes: string[][] = useMemo(() => {
    const d = desdeISO(ref);
    const primero = new Date(d.getFullYear(), d.getMonth(), 1);
    let ini = isoLocal(primero);
    ini = addDias(ini, -((primero.getDay() + 6) % 7));
    return Array.from({ length: 6 }, (_, s) => Array.from({ length: 7 }, (_, i) => addDias(ini, s * 7 + i)));
  }, [ref]);

  const porDia = useMemo(() => {
    const m = new Map<string, Accion[]>();
    acciones.forEach((a) => {
      if (!a.fecha) return;
      if (!m.has(a.fecha)) m.set(a.fecha, []);
      m.get(a.fecha)!.push(a);
    });
    m.forEach((l) => l.sort((x, y) => aMin(x.hora) - aMin(y.hora)));
    return m;
  }, [acciones]);

  const mesDeRef = desdeISO(ref).getMonth();
  const titulo = useMemo(() => {
    if (vista === "mes") {
      const d = desdeISO(ref);
      return `${NOM_MES[d.getMonth()]} de ${d.getFullYear()}`;
    }
    if (vista === "dia") return tituloDia(ref);
    const ini = desdeISO(dias[0]);
    const fin = desdeISO(dias[6]);
    const mismoMes = ini.getMonth() === fin.getMonth();
    return `${ini.getDate()}${mismoMes ? "" : ` de ${NOM_MES[ini.getMonth()]}`} – ${fin.getDate()} de ${NOM_MES[fin.getMonth()]} de ${fin.getFullYear()}`;
  }, [vista, ref, dias]);

  function moverVista(n: number) {
    if (vista === "dia") setRef(addDias(ref, n));
    else if (vista === "semana") setRef(addDias(ref, n * 7));
    else {
      const d = desdeISO(ref);
      setRef(isoLocal(new Date(d.getFullYear(), d.getMonth() + n, 1)));
    }
  }

  // ---------- mover (arrastrar la tarjeta) ----------
  async function mover(id: string, fecha: string, hora: string) {
    setAcciones((prev) => prev.map((a) => (a.id === id ? { ...a, fecha, hora } : a))); // optimista: se ve al instante
    try {
      const act = await api.editarAccion(id, { fecha, hora });
      setAcciones((prev) => prev.map((a) => (a.id === id ? act : a)));
    } catch {
      recargar().catch(() => {});
      alert("No se pudo mover. Arranca la API con `npm run server`.");
    }
  }

  function soltarEn(e: React.DragEvent, dayISO: string) {
    e.preventDefault();
    setColOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const min = snap15(H0 * 60 + ((e.clientY - rect.top) / PX_H) * 60);
    mover(id, dayISO, aHora(Math.min(H1 * 60 - 15, Math.max(H0 * 60, min))));
  }

  function soltarDiaMes(e: React.DragEvent, dayISO: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const a = acciones.find((x) => x.id === id);
    if (!a || a.fecha === dayISO) return;
    mover(id, dayISO, a.hora?.trim() ? a.hora : "09:00");
  }

  // ---------- alargar (tirar del borde inferior) ----------
  function iniciarResize(e: React.MouseEvent, a: Accion) {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const startDur = a.duracionMin ?? 60;
    let ultima = startDur;
    setResizing(a.id);
    const move = (ev: MouseEvent) => {
      const dur = Math.min(480, Math.max(15, snap15(startDur + ((ev.clientY - startY) / PX_H) * 60)));
      ultima = dur;
      setAcciones((prev) => prev.map((x) => (x.id === a.id ? { ...x, duracionMin: dur } : x))); // tiempo real
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setResizing(null);
      api
        .editarAccion(a.id, { duracionMin: ultima })
        .then((act) => setAcciones((prev) => prev.map((x) => (x.id === a.id ? act : x))))
        .catch(() => recargar().catch(() => {}));
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  // ---------- crear / editar ----------
  function abrirCrear(dayISO: string, horaMin?: number) {
    setEdit({
      modo: "crear",
      titulo: "",
      tipo: "tarea",
      estado: "Pendiente",
      fecha: dayISO,
      hora: horaMin !== undefined ? aHora(horaMin) : "09:00",
      duracion: 60,
      empresa: "",
      detalle: "",
    });
  }

  function abrirEdicion(a: Accion) {
    setEdit({
      modo: "editar",
      id: a.id,
      titulo: a.titulo,
      tipo: a.tipo,
      estado: a.estado,
      fecha: a.fecha ?? HOY,
      hora: a.hora?.trim() ? a.hora : "09:00",
      duracion: a.duracionMin ?? 60,
      empresa: a.empresa ?? "",
      detalle: a.detalle ?? "",
    });
  }

  async function guardarEdit(e: FormEvent) {
    e.preventDefault();
    if (!edit || guardando) return;
    setGuardando(true);
    try {
      if (edit.modo === "crear") {
        await api.crearAccion({
          titulo: edit.titulo || undefined,
          tipo: edit.tipo,
          estado: edit.estado,
          fecha: edit.fecha,
          hora: edit.hora,
          duracionMin: edit.duracion,
          empresa: edit.empresa || undefined,
          detalle: edit.detalle || undefined,
        });
      } else if (edit.id) {
        const act = await api.editarAccion(edit.id, {
          titulo: edit.titulo,
          tipo: edit.tipo,
          estado: edit.estado,
          fecha: edit.fecha,
          hora: edit.hora,
          duracionMin: edit.duracion,
          empresa: edit.empresa,
          detalle: edit.detalle,
        });
        setAcciones((prev) => prev.map((x) => (x.id === act.id ? act : x)));
      }
      setEdit(null);
      await recargar();
    } catch {
      alert("No se pudo guardar. Arranca la API con `npm run server`.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrarEdit() {
    if (!edit?.id || !confirm("¿Borrar esta acción?")) return;
    await api.borrarAccion(edit.id);
    setEdit(null);
    recargar().catch(() => {});
  }

  // ---------- piezas ----------
  function Bloque({ a }: { a: Accion }) {
    const dur = a.duracionMin ?? 60;
    const top = Math.max(0, (aMin(a.hora) - H0 * 60) / 60) * PX_H;
    const height = Math.max(22, (dur / 60) * PX_H);
    const fin = aHora(aMin(a.hora) + dur);
    return (
      <div
        draggable={resizing !== a.id}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", a.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={(e) => {
          e.stopPropagation();
          abrirEdicion(a);
        }}
        title={`${a.titulo} · ${a.hora}–${fin} (${dur} min) · clic para editar, arrastra para mover`}
        className={`group absolute inset-x-1 cursor-grab overflow-hidden rounded-lg border border-cyan-300/25 bg-[#0a2438]/95 px-2 py-1 backdrop-blur transition hover:border-cyan-300/60 active:cursor-grabbing ${
          a.estado !== "Pendiente" ? "opacity-60" : ""
        }`}
        style={{ top, height }}
      >
        <p className="truncate text-[11px] font-bold leading-tight text-slate-100">{a.titulo}</p>
        <p className="truncate font-mono text-[10px] text-cyan-200/80">
          {a.hora}–{fin} · {TIPO_ACCION_LABEL[a.tipo] ?? a.tipo}
        </p>
        {/* tirador inferior: alarga la duración */}
        <div
          onMouseDown={(e) => iniciarResize(e, a)}
          onClick={(e) => e.stopPropagation()}
          title="Tira para alargar la duración"
          className="absolute inset-x-0 bottom-0 flex h-2.5 cursor-ns-resize items-end justify-center rounded-b-lg bg-cyan-300/0 transition group-hover:bg-cyan-300/25"
        >
          <span className="mb-0.5 h-1 w-8 rounded-full bg-cyan-200/70" />
        </div>
      </div>
    );
  }

  function ColumnaDia({ dayISO, conCabecera }: { dayISO: string; conCabecera: boolean }) {
    const d = desdeISO(dayISO);
    const esHoy = dayISO === HOY;
    const evs = porDia.get(dayISO) ?? [];
    const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
    return (
      <div className="flex min-w-0 flex-1 flex-col">
        {conCabecera && (
          <div className={`mb-1 rounded-xl border px-2 py-1.5 text-center ${esHoy ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/5 bg-white/[.02]"}`}>
            <p className={`font-mono text-[10px] uppercase tracking-widest ${esHoy ? "text-cyan-200" : "text-slate-500"}`}>
              {NOM_DIAS[(d.getDay() + 6) % 7]}
            </p>
            <p className={`text-lg font-extrabold leading-none ${esHoy ? "text-white" : "text-slate-300"}`}>{d.getDate()}</p>
          </div>
        )}
        <div
          className={`relative flex-1 rounded-xl border transition ${
            colOver === dayISO ? "border-cyan-300/60 bg-cyan-300/[.04]" : "border-white/[.06] bg-white/[.01]"
          }`}
          style={{ height: (H1 - H0) * PX_H }}
          onDragOver={(e) => {
            e.preventDefault();
            setColOver(dayISO);
          }}
          onDragLeave={() => setColOver((c) => (c === dayISO ? null : c))}
          onDrop={(e) => soltarEn(e, dayISO)}
          onDoubleClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const min = snap15(H0 * 60 + ((e.clientY - rect.top) / PX_H) * 60);
            abrirCrear(dayISO, Math.min(H1 * 60 - 15, Math.max(H0 * 60, min)));
          }}
        >
          {Array.from({ length: H1 - H0 + 1 }, (_, i) => (
            <div key={i} className="relative border-t border-white/5 first:border-t-0" style={{ height: PX_H }}>
              <span className="absolute -top-2 left-1 font-mono text-[9px] text-slate-600">
                {String(H0 + i).padStart(2, "0")}:00
              </span>
            </div>
          ))}
          {esHoy && ahoraMin >= H0 * 60 && ahoraMin <= H1 * 60 && (
            <div className="absolute inset-x-0 z-10 border-t-2 border-red-400/80" style={{ top: ((ahoraMin - H0 * 60) / 60) * PX_H }} />
          )}
          {evs.map((a) => (
            <Bloque key={a.id} a={a} />
          ))}
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-300/50";
  const selectCls = "w-full rounded-xl border border-cyan-300/15 bg-[#041321] px-3 py-2 text-sm text-slate-100 outline-none";

  return (
    <div className="anim-rise space-y-4">
      {/* cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-300/70">CALENDARIO</p>
          <h1 className="mt-1 text-2xl font-extrabold capitalize text-white">{titulo}</h1>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            Arrastra para mover · tira del borde inferior para alargar · doble clic para crear · clic para editar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => moverVista(-1)} className="rounded-xl border border-white/10 p-2.5 text-slate-300 transition hover:border-cyan-300/40" aria-label="Anterior">
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setRef(isoLocal(new Date()))}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/40"
          >
            Hoy
          </button>
          <button onClick={() => moverVista(1)} className="rounded-xl border border-white/10 p-2.5 text-slate-300 transition hover:border-cyan-300/40" aria-label="Siguiente">
            <ChevronRight size={16} />
          </button>
          <div className="flex overflow-hidden rounded-xl border border-white/10" role="tablist" aria-label="Vista">
            {(["dia", "semana", "mes"] as VistaCal[]).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={vista === v}
                onClick={() => setVista(v)}
                className={`px-3 py-2 text-xs font-semibold capitalize transition ${
                  vista === v ? "bg-cyan-300/15 text-cyan-100" : "bg-white/[.02] text-slate-500 hover:text-slate-200"
                }`}
              >
                {v === "dia" ? "Día" : v === "semana" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* vistas */}
      {cargando ? (
        <div className="jarvis-panel p-10 text-center font-mono text-xs tracking-widest text-cyan-200/70">SINCRONIZANDO CON EL NÚCLEO…</div>
      ) : vista === "mes" ? (
        <div className="jarvis-panel p-3">
          <div className="mb-1 grid grid-cols-7 gap-1">
            {NOM_DIAS.map((n) => (
              <p key={n} className="py-1 text-center font-mono text-[10px] uppercase tracking-widest text-slate-500">{n}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {semanasMes.flat().map((dayISO) => {
              const d = desdeISO(dayISO);
              const esHoy = dayISO === HOY;
              const fuera = d.getMonth() !== mesDeRef;
              const evs = porDia.get(dayISO) ?? [];
              return (
                <div
                  key={dayISO}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => soltarDiaMes(e, dayISO)}
                  onDoubleClick={() => abrirCrear(dayISO)}
                  className={`min-h-[86px] cursor-pointer rounded-xl border p-1.5 transition hover:border-cyan-300/40 ${
                    esHoy ? "border-cyan-300/50 bg-cyan-300/[.06]" : "border-white/[.06] bg-white/[.01]"
                  } ${fuera ? "opacity-40" : ""}`}
                  onClick={() => {
                    setRef(dayISO);
                    setVista("dia");
                  }}
                  title="Clic para ver el día · arrastra acciones hasta aquí"
                >
                  <p className={`font-mono text-[11px] ${esHoy ? "font-bold text-cyan-200" : "text-slate-500"}`}>{d.getDate()}</p>
                  <div className="mt-1 space-y-1">
                    {evs.slice(0, 3).map((a) => (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", a.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirEdicion(a);
                        }}
                        className="truncate rounded-md border border-cyan-300/20 bg-cyan-300/[.07] px-1.5 py-0.5 text-[10px] text-slate-200"
                        title={`${a.hora} · ${a.titulo}`}
                      >
                        {a.hora} {a.titulo}
                      </div>
                    ))}
                    {evs.length > 3 && <p className="font-mono text-[10px] text-slate-500">+{evs.length - 3} más</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="jarvis-panel flex gap-2 overflow-x-auto p-3">
          {dias.map((dayISO) => (
            <ColumnaDia key={dayISO} dayISO={dayISO} conCabecera={vista === "semana" || dias.length === 1} />
          ))}
        </div>
      )}

      {/* modal crear/editar */}
      {edit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setEdit(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={guardarEdit}
            className="jarvis-panel max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="section-title">{edit.modo === "crear" ? "Nueva acción" : "Editar acción"}</h2>
              <button type="button" onClick={() => setEdit(null)} className="text-slate-500 hover:text-slate-200" aria-label="Cerrar">
                <X size={17} />
              </button>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Título *</span>
              <input value={edit.titulo} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} required placeholder="Ej. Visita a planta" className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Tipo</span>
                <select value={edit.tipo} onChange={(e) => setEdit({ ...edit, tipo: e.target.value as TipoAccion })} className={selectCls}>
                  {(Object.keys(TIPO_ACCION_LABEL) as TipoAccion[]).map((t) => (
                    <option key={t} value={t}>{TIPO_ACCION_LABEL[t]}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Estado</span>
                <select value={edit.estado} onChange={(e) => setEdit({ ...edit, estado: e.target.value as EstadoAccion })} className={selectCls}>
                  <option>Pendiente</option>
                  <option>Hecha</option>
                  <option>Cancelada</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Fecha</span>
                <input type="date" value={edit.fecha} onChange={(e) => setEdit({ ...edit, fecha: e.target.value })} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Hora</span>
                <input type="time" value={edit.hora} onChange={(e) => setEdit({ ...edit, hora: e.target.value })} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-400"><Clock size={11} /> Min</span>
                <input
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={edit.duracion}
                  onChange={(e) => setEdit({ ...edit, duracion: Number(e.target.value) || 15 })}
                  className={inputCls}
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Empresa</span>
              <input value={edit.empresa} onChange={(e) => setEdit({ ...edit, empresa: e.target.value })} placeholder="Empresa" className={inputCls} />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 rounded-xl border border-cyan-300/40 bg-cyan-300/10 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50"
              >
                {guardando ? "Guardando…" : edit.modo === "crear" ? "Crear" : "Guardar"}
              </button>
              {edit.modo === "editar" && edit.id && (
                <button
                  type="button"
                  onClick={borrarEdit}
                  className="flex items-center gap-1.5 rounded-xl border border-red-300/20 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:border-red-300/50"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
