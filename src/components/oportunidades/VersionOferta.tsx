import { Archive, Check, Clock, Send, ThumbsDown, Trash2, Zap } from "lucide-react";
import { ESTADO_OFERTA_STYLES, formatEur, type EstadoOferta, type Oferta } from "../../data/mockData";
import { fmtFecha } from "../../lib/cobertura";

export const SIGUIENTES: Record<EstadoOferta, EstadoOferta[]> = {
  Borrador: ["Enviada", "Descartada"],
  Enviada: ["Aceptada", "Rechazada", "Expirada", "Descartada"],
  Aceptada: [],
  Rechazada: [],
  Descartada: [],
  Expirada: [],
};

const ACCION_ICON: Record<string, typeof Send> = {
  Activar: Zap,
  Enviada: Send,
  Aceptada: Check,
  Rechazada: ThumbsDown,
  Descartada: Archive,
  Expirada: Clock,
};

const TRANSICION_LABEL: Record<EstadoOferta, string> = {
  Borrador: "Borrador",
  Enviada: "Enviar",
  Aceptada: "Aceptar",
  Rechazada: "Rechazar",
  Descartada: "Descartar",
  Expirada: "Expirar",
};

const btnBase =
  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-40";
export const btnGhost = `${btnBase} border-white/10 bg-white/[.02] text-slate-300 hover:border-cyan-300/40 hover:text-slate-100`;

interface Props {
  of: Oferta;
  esActiva: boolean;
  /** false si la oportunidad está Terminada (todo bloqueado) */
  abierta: boolean;
  busy: boolean;
  onActivar: () => void;
  onEstado: (siguiente: EstadoOferta) => void;
  onBorrar: () => void;
}

/** Tarjeta de una versión de oferta con sus acciones de ciclo de vida. */
export default function VersionOferta({ of, esActiva, abierta, busy, onActivar, onEstado, onBorrar }: Props) {
  return (
    <div
      className={`rounded-xl border p-3 transition ${
        esActiva ? "border-cyan-300/50 bg-cyan-300/[.06]" : "border-white/[.07] bg-white/[.02]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-white/[.06] px-1.5 py-0.5 font-mono text-[11px] font-bold text-cyan-200">
          v{of.numero ?? "?"}
        </span>
        {esActiva && (
          <span className="rounded-md border border-cyan-300/50 bg-cyan-300/15 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-cyan-100">
            ACTIVA
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100" title={of.titulo}>
          {of.titulo}
        </p>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ESTADO_OFERTA_STYLES[of.estado]}`}>
          {of.estado}
        </span>
        <span className="num-display text-sm font-bold text-cyan-100">{formatEur(of.importe)}</span>
      </div>
      <p className="mt-1 font-mono text-[11px] text-slate-500">
        Enviada {fmtFecha(of.fechaEnvio)} · Vence {fmtFecha(of.fechaVencimiento)}
        {of.notas ? ` · ${of.notas}` : ""}
      </p>
      {abierta && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Borrador", "Enviada"].includes(of.estado) && !esActiva && (
            <button
              disabled={busy}
              onClick={onActivar}
              className={btnGhost}
              title="Pasa a ser la oferta activa y sincroniza la oportunidad"
            >
              <Zap size={12} /> Activar
            </button>
          )}
          {SIGUIENTES[of.estado].map((sig) => {
            const Icon = ACCION_ICON[sig] ?? Check;
            return (
              <button key={sig} disabled={busy} onClick={() => onEstado(sig)} className={btnGhost}>
                <Icon size={12} /> {TRANSICION_LABEL[sig]}
              </button>
            );
          })}
          {of.estado === "Borrador" && (
            <button
              disabled={busy}
              onClick={onBorrar}
              className={`${btnBase} border-red-300/20 text-red-300 hover:border-red-300/50`}
            >
              <Trash2 size={12} /> Borrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
