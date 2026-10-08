import { Download, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatEur, type Accion, type Cliente, type Oferta, type Oportunidad } from "../data/mockData";
import { api } from "../lib/api";
import { fmtFecha } from "../lib/cobertura";

type Informe = "oportunidades" | "ofertas" | "clientes" | "acciones" | "tareas";

interface Columna {
  clave: string;
  etiqueta: string;
  valor: (f: Fila) => string;
}
// Fila genérica aplanada: cada informe rellena sus campos.
interface Fila {
  id?: string;
  empresa?: string;
  etapa?: string;
  etapaNombre?: string;
  estado?: string;
  prioridad?: string;
  importe?: number;
  probabilidad?: number;
  numOfertas?: number;
  fechaCierre?: string | null;
  motivo?: string;
  numero?: number;
  titulo?: string;
  oportunidadEmpresa?: string;
  fechaEnvio?: string | null;
  fechaVencimiento?: string | null;
  _ofertaActiva?: string;
  nombre?: string;
  coberturaNombre?: string | null;
  coberturaId?: string | null;
  fechaAlta?: string | null;
  fechaBaja?: string | null;
  valor?: number;
  ultimoContacto?: string | null;
  fecha?: string | null;
  hora?: string;
  tipo?: string;
  clienteNombre?: string | null;
  responsable?: string;
}

const COLUMNAS: Record<Informe, Columna[]> = {
  oportunidades: [
    { clave: "empresa", etiqueta: "Empresa", valor: (f) => f.empresa ?? "" },
    { clave: "etapa", etiqueta: "Etapa", valor: (f) => f.etapaNombre ?? f.etapa ?? "" },
    { clave: "estado", etiqueta: "Estado", valor: (f) => f.estado ?? "Abierta" },
    { clave: "prioridad", etiqueta: "Prioridad", valor: (f) => f.prioridad ?? "" },
    { clave: "importe", etiqueta: "Importe", valor: (f) => String(f.importe ?? 0) },
    { clave: "probabilidad", etiqueta: "Prob %", valor: (f) => String(f.probabilidad ?? 0) },
    { clave: "ofertas", etiqueta: "Nº ofertas", valor: (f) => String(f.numOfertas ?? 0) },
    { clave: "cierre", etiqueta: "Cierre", valor: (f) => f.fechaCierre ?? "" },
    { clave: "motivo", etiqueta: "Motivo", valor: (f) => f.motivo ?? "" },
  ],
  ofertas: [
    { clave: "numero", etiqueta: "Ver", valor: (f) => `v${f.numero ?? "?"}` },
    { clave: "titulo", etiqueta: "Título", valor: (f) => f.titulo ?? "" },
    { clave: "oportunidad", etiqueta: "Oportunidad", valor: (f) => f.oportunidadEmpresa ?? "" },
    { clave: "importe", etiqueta: "Importe", valor: (f) => String(f.importe ?? 0) },
    { clave: "estado", etiqueta: "Estado", valor: (f) => f.estado ?? "" },
    { clave: "activa", etiqueta: "Activa", valor: (f) => f._ofertaActiva ?? "" },
    { clave: "envio", etiqueta: "Enviada", valor: (f) => f.fechaEnvio ?? "" },
    { clave: "vence", etiqueta: "Vence", valor: (f) => f.fechaVencimiento ?? "" },
  ],
  clientes: [
    { clave: "nombre", etiqueta: "Nombre", valor: (f) => f.nombre ?? "" },
    { clave: "empresa", etiqueta: "Empresa", valor: (f) => f.empresa ?? "" },
    { clave: "estado", etiqueta: "Estado", valor: (f) => f.estado ?? "" },
    { clave: "cobertura", etiqueta: "Cobertura", valor: (f) => f.coberturaNombre ?? (f.coberturaId ? `Tipo ${f.coberturaId}` : "Sin cobertura") },
    { clave: "alta", etiqueta: "Alta", valor: (f) => f.fechaAlta ?? "" },
    { clave: "baja", etiqueta: "Baja", valor: (f) => f.fechaBaja ?? "" },
    { clave: "valor", etiqueta: "Valor", valor: (f) => String(f.valor ?? 0) },
    { clave: "contacto", etiqueta: "Últ. contacto", valor: (f) => f.ultimoContacto ?? "" },
  ],
  acciones: [
    { clave: "fecha", etiqueta: "Fecha", valor: (f) => f.fecha ?? "" },
    { clave: "hora", etiqueta: "Hora", valor: (f) => f.hora ?? "" },
    { clave: "tipo", etiqueta: "Tipo", valor: (f) => f.tipo ?? "" },
    { clave: "titulo", etiqueta: "Título", valor: (f) => f.titulo ?? "" },
    { clave: "empresa", etiqueta: "Empresa", valor: (f) => (f.clienteNombre ?? f.empresa) ?? "" },
    { clave: "estado", etiqueta: "Estado", valor: (f) => f.estado ?? "" },
    { clave: "responsable", etiqueta: "Responsable", valor: (f) => f.responsable ?? "" },
  ],
  tareas: [
    { clave: "titulo", etiqueta: "Título", valor: (f) => f.titulo ?? "" },
    { clave: "prioridad", etiqueta: "Prioridad", valor: (f) => f.prioridad ?? "" },
    { clave: "estado", etiqueta: "Estado", valor: (f) => f.estado ?? "" },
    { clave: "vence", etiqueta: "Vence", valor: (f) => f.fecha ?? "" },
    { clave: "responsable", etiqueta: "Responsable", valor: (f) => f.responsable ?? "" },
    { clave: "empresa", etiqueta: "Empresa", valor: (f) => (f.clienteNombre ?? f.empresa) ?? "" },
  ],
};

const TITULOS: Record<Informe, string> = {
  oportunidades: "Oportunidades",
  ofertas: "Ofertas",
  clientes: "Clientes",
  acciones: "Acciones",
  tareas: "Tareas",
};

function aCSV(filas: Fila[], cols: Columna[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lineas = [cols.map((c) => esc(c.etiqueta)).join(";")];
  filas.forEach((f) => lineas.push(cols.map((c) => esc(c.valor(f))).join(";")));
  return `﻿${lineas.join("\r\n")}`;
}

export default function InformesPage() {
  const [informe, setInforme] = useState<Informe>("oportunidades");
  const [ops, setOps] = useState<Oportunidad[]>([]);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [query, setQuery] = useState("");

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

  const activas = useMemo(() => {
    const m = new Set<string>();
    ops.forEach((o) => o.ofertaActivaId && m.add(o.ofertaActivaId));
    return m;
  }, [ops]);

  const filas: Fila[] = useMemo(() => {
    switch (informe) {
      case "oportunidades":
        return ops as Fila[];
      case "ofertas":
        return ofertas.map((o) => ({ ...o, _ofertaActiva: activas.has(o.id) ? "Sí" : "" })) as Fila[];
      case "clientes":
        return clientes as Fila[];
      case "tareas":
        return acciones.filter((a) => a.tipo === "tarea") as Fila[];
      default:
        return acciones as Fila[];
    }
  }, [informe, ops, ofertas, clientes, acciones, activas]);

  const cols = COLUMNAS[informe];

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter((f) => cols.some((c) => c.valor(f).toLowerCase().includes(q)));
  }, [filas, query, cols]);

  const totalImporte = useMemo(() => {
    if (informe === "oportunidades") return filtradas.reduce((s, f) => s + (f.importe ?? 0), 0);
    if (informe === "ofertas") return filtradas.reduce((s, f) => s + (f.importe ?? 0), 0);
    if (informe === "clientes") return filtradas.reduce((s, f) => s + (f.valor ?? 0), 0);
    return null;
  }, [informe, filtradas]);

  function exportar() {
    const blob = new Blob([aCSV(filtradas, cols)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `informe-${informe}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="anim-rise space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-300/70">ANÁLISIS</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white">Informes</h1>
          <p className="mt-1 text-sm text-slate-400">
            {cargando ? "Sincronizando…" : `${filtradas.length} filas${totalImporte !== null ? ` · Total ${formatEur(totalImporte)}` : ""}`}
          </p>
        </div>
        <button
          onClick={exportar}
          disabled={filtradas.length === 0}
          className="flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <div className="jarvis-panel flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(TITULOS) as Informe[]).map((t) => (
            <button
              key={t}
              onClick={() => setInforme(t)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                informe === t
                  ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 bg-white/[.02] text-slate-400 hover:border-cyan-300/30 hover:text-slate-200"
              }`}
            >
              {TITULOS[t]}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-300/70" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar filas…"
            className="w-full rounded-xl border border-cyan-300/15 bg-white/[.04] py-2.5 pl-10 pr-9 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-300/50"
            aria-label="Filtrar informe"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200" aria-label="Limpiar filtro">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {cargando ? (
        <div className="jarvis-panel p-10 text-center font-mono text-xs tracking-widest text-cyan-200/70">SINCRONIZANDO CON EL NÚCLEO…</div>
      ) : (
        <div className="jarvis-panel overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-cyan-300/10 font-mono text-[11px] uppercase tracking-widest text-slate-500">
                {cols.map((c) => (
                  <th key={c.clave} className="whitespace-nowrap px-4 py-3">{c.etiqueta}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f, i) => (
                <tr key={`${f.id ?? i}`} className="border-b border-white/5 transition last:border-0 hover:bg-cyan-300/[.04]">
                  {cols.map((c) => (
                    <td key={c.clave} className="whitespace-nowrap px-4 py-2.5 text-slate-300">
                      {c.clave === "vence" || c.clave === "envio" || c.clave === "cierre" || c.clave === "contacto" || c.clave === "alta" || c.clave === "baja" || c.clave === "fecha"
                        ? fmtFecha(c.valor(f) || null)
                        : c.valor(f)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {filtradas.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Sin filas.</p>}
        </div>
      )}
    </div>
  );
}
