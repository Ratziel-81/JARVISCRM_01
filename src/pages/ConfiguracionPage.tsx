import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Cobertura, EtapaPipeline, Oportunidad } from "../data/mockData";
import { api } from "../lib/api";
import { useSkin } from "../lib/skin";
import { SKINS } from "../lib/skins";

export default function ConfiguracionPage() {
  const [etapas, setEtapas] = useState<EtapaPipeline[]>([]);
  const [coberturas, setCoberturas] = useState<Cobertura[]>([]);
  const [ops, setOps] = useState<Oportunidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [nuevaEtapa, setNuevaEtapa] = useState({ nombre: "", color: "#22d3ee" });
  const [editEtapa, setEditEtapa] = useState<EtapaPipeline | null>(null);
  const [nuevaCob, setNuevaCob] = useState({ id: "", nombre: "", llamadas: "6", visitas: "1", descripcion: "" });
  const [editCob, setEditCob] = useState<Cobertura | null>(null);
  const { skin, setSkin } = useSkin();

  async function recargar() {
    const [e, c, o] = await Promise.all([api.etapas(), api.coberturas(), api.oportunidades()]);
    setEtapas(e);
    setCoberturas(c);
    setOps(o);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usosEtapa = useMemo(() => {
    const m = new Map<string, number>();
    ops.forEach((o) => m.set(o.etapa, (m.get(o.etapa) ?? 0) + 1));
    return m;
  }, [ops]);

  async function correr(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^API \d+ en .*?$/, "La operación no está permitida.") : "Operación no permitida");
    }
  }

  async function crearEtapa(e: FormEvent) {
    e.preventDefault();
    if (!nuevaEtapa.nombre.trim()) return;
    await correr(() => api.crearEtapa(nuevaEtapa));
    setNuevaEtapa({ nombre: "", color: "#22d3ee" });
  }

  async function crearCobertura(e: FormEvent) {
    e.preventDefault();
    if (!nuevaCob.id.trim() || !nuevaCob.nombre.trim()) return;
    await correr(() =>
      api.crearCobertura({
        id: nuevaCob.id,
        nombre: nuevaCob.nombre.trim(),
        llamadasCadaMeses: Number(nuevaCob.llamadas) || 6,
        visitasAlAno: Number(nuevaCob.visitas) || 1,
        descripcion: nuevaCob.descripcion,
      }),
    );
    setNuevaCob({ id: "", nombre: "", llamadas: "6", visitas: "1", descripcion: "" });
  }

  async function borrarEtapa(id: string) {
    if (!confirm("¿Borrar esta etapa?")) return;
    await correr(async () => {
      const res = await api.borrarEtapa(id);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "No se puede borrar");
      }
    });
  }

  async function borrarCobertura(id: string) {
    if (!confirm("¿Borrar esta cobertura?")) return;
    await correr(async () => {
      const res = await api.borrarCobertura(id);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "No se puede borrar");
      }
    });
  }

  const inputCls =
    "rounded-xl border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-300/50";

  return (
    <div className="anim-rise space-y-4">
      <div>
        <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-300/70">AJUSTES</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-100">Configuración</h1>
        <p className="mt-1 text-sm text-slate-400">{cargando ? "Sincronizando…" : "Apariencia, etapas del pipeline y tipos de cobertura"}</p>
      </div>

      {/* apariencia / skins */}
      <section className="jarvis-panel p-5" aria-label="Tema visual">
        <h2 className="section-title">Tema visual</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SKINS.map((s) => {
            const activo = skin === s.id;
            const claro = s.id === "neumorphism-01";
            return (
              <button
                key={s.id}
                onClick={() => setSkin(s.id)}
                aria-pressed={activo}
                className={`flex items-center gap-4 rounded-xl border p-4 text-left transition ${
                  activo
                    ? "border-cyan-300/60 bg-cyan-300/[.07] shadow-[0_0_24px_-8px_rgba(34,211,238,.5)]"
                    : "border-white/10 bg-white/[.02] hover:border-cyan-300/30"
                }`}
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
                  style={
                    claro
                      ? { background: "#E8EDF3", borderColor: "rgba(255,255,255,.75)", boxShadow: "4px 4px 9px rgba(163,177,198,.5), -4px -4px 9px rgba(255,255,255,.9)" }
                      : { background: "#020812", borderColor: "rgba(34,211,238,.4)", boxShadow: "0 0 14px rgba(34,211,238,.35)" }
                  }
                  aria-hidden
                >
                  <span
                    className="h-4 w-4 rounded-full"
                    style={claro ? { background: "#329FE0" } : { background: "#22d3ee", boxShadow: "0 0 8px #22d3ee" }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold tracking-wide text-slate-100">{s.nombre}</span>
                    {activo && (
                      <span className="rounded-full border border-cyan-300/50 bg-cyan-300/15 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-cyan-100">
                        ACTIVO
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-400">{s.descripcion}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 font-mono text-[11px] text-slate-500">Se aplica a todo el CRM al instante y se recuerda en este navegador.</p>
      </section>

      {error && (
        <div className="jarvis-panel border-red-300/30 p-4 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="jarvis-panel p-10 text-center font-mono text-xs tracking-widest text-cyan-200/70">SINCRONIZANDO CON EL NÚCLEO…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          {/* etapas */}
          <section className="jarvis-panel space-y-3 p-5" aria-label="Etapas del pipeline">
            <h2 className="section-title">Etapas del pipeline · {etapas.length}</h2>
            <ul className="space-y-2">
              {etapas.map((et) => (
                <li key={et.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3">
                  {editEtapa?.id === et.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        correr(() => api.editarEtapa(et.id, { nombre: editEtapa.nombre, color: editEtapa.color })).then(() => setEditEtapa(null));
                      }}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input value={editEtapa.nombre} onChange={(e) => setEditEtapa({ ...editEtapa, nombre: e.target.value })} required className={`${inputCls} min-w-0 flex-1`} />
                      <input type="color" value={editEtapa.color} onChange={(e) => setEditEtapa({ ...editEtapa, color: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent" aria-label="Color" />
                      <button type="submit" className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">Guardar</button>
                      <button type="button" onClick={() => setEditEtapa(null)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400">
                        <X size={13} />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: et.color, boxShadow: `0 0 8px ${et.glow}` }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-100">{et.nombre}</p>
                        <p className="font-mono text-[10px] text-slate-500">{usosEtapa.get(et.id) ?? 0} oportunidades</p>
                      </div>
                      <button onClick={() => setEditEtapa(et)} title="Editar" className="rounded-lg border border-white/10 p-1.5 text-slate-500 transition hover:border-cyan-300/40 hover:text-cyan-200">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => borrarEtapa(et.id)} title="Borrar" className="rounded-lg border border-white/10 p-1.5 text-slate-500 transition hover:border-red-300/40 hover:text-red-300">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={crearEtapa} className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-cyan-300/20 p-3">
              <input value={nuevaEtapa.nombre} onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, nombre: e.target.value })} placeholder="Nueva etapa…" required className={`${inputCls} min-w-0 flex-1`} />
              <input type="color" value={nuevaEtapa.color} onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, color: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent" aria-label="Color" />
              <button type="submit" className="flex items-center gap-1.5 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100">
                <Plus size={13} /> Añadir
              </button>
            </form>
          </section>

          {/* coberturas */}
          <section className="jarvis-panel space-y-3 p-5" aria-label="Tipos de cobertura">
            <h2 className="section-title">Tipos de cobertura · {coberturas.length}</h2>
            <ul className="space-y-2">
              {coberturas.map((c) => (
                <li key={c.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3">
                  {editCob?.id === c.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        correr(() =>
                          api.editarCobertura(c.id, {
                            nombre: editCob.nombre,
                            llamadasCadaMeses: editCob.llamadasCadaMeses,
                            visitasAlAno: editCob.visitasAlAno,
                            descripcion: editCob.descripcion,
                          }),
                        ).then(() => setEditCob(null));
                      }}
                      className="space-y-2"
                    >
                      <input value={editCob.nombre} onChange={(e) => setEditCob({ ...editCob, nombre: e.target.value })} required className={`${inputCls} w-full`} />
                      <div className="flex gap-2">
                        <label className="flex-1 text-[11px] text-slate-500">
                          Llamada cada (meses)
                          <input type="number" min={1} value={editCob.llamadasCadaMeses} onChange={(e) => setEditCob({ ...editCob, llamadasCadaMeses: Number(e.target.value) })} className={`${inputCls} mt-1 w-full`} />
                        </label>
                        <label className="flex-1 text-[11px] text-slate-500">
                          Visitas / año
                          <input type="number" min={1} value={editCob.visitasAlAno} onChange={(e) => setEditCob({ ...editCob, visitasAlAno: Number(e.target.value) })} className={`${inputCls} mt-1 w-full`} />
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">Guardar</button>
                        <button type="button" onClick={() => setEditCob(null)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400">
                          <X size={13} />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 font-mono text-sm font-bold text-cyan-200">
                        {c.id}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-100">{c.nombre}</p>
                        <p className="truncate font-mono text-[11px] text-slate-500">
                          llamada cada {c.llamadasCadaMeses} m · {c.visitasAlAno} visitas/año
                        </p>
                      </div>
                      <button onClick={() => setEditCob(c)} title="Editar" className="rounded-lg border border-white/10 p-1.5 text-slate-500 transition hover:border-cyan-300/40 hover:text-cyan-200">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => borrarCobertura(c.id)} title="Borrar" className="rounded-lg border border-white/10 p-1.5 text-slate-500 transition hover:border-red-300/40 hover:text-red-300">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={crearCobertura} className="space-y-2 rounded-xl border border-dashed border-cyan-300/20 p-3">
              <div className="flex gap-2">
                <input value={nuevaCob.id} onChange={(e) => setNuevaCob({ ...nuevaCob, id: e.target.value })} placeholder="Código (D)" required maxLength={4} className={`${inputCls} w-24 uppercase`} />
                <input value={nuevaCob.nombre} onChange={(e) => setNuevaCob({ ...nuevaCob, nombre: e.target.value })} placeholder="Nombre del tipo…" required className={`${inputCls} min-w-0 flex-1`} />
              </div>
              <div className="flex gap-2">
                <input type="number" min={1} value={nuevaCob.llamadas} onChange={(e) => setNuevaCob({ ...nuevaCob, llamadas: e.target.value })} placeholder="Meses" title="Llamada cada N meses" className={`${inputCls} w-full`} />
                <input type="number" min={1} value={nuevaCob.visitas} onChange={(e) => setNuevaCob({ ...nuevaCob, visitas: e.target.value })} placeholder="Visitas/año" title="Visitas al año" className={`${inputCls} w-full`} />
                <button type="submit" className="flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100">
                  <Plus size={13} /> Añadir
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
