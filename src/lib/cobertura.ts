// Lógica de cobertura: cadencia esperada -> carita feliz/neutral/triste.
// Cadencia (días) = lo más exigente entre llamadas y visitas.
import type { Cliente } from "../data/mockData";

export type Cara = "ok" | "aviso" | "vencido" | "sin" | "baja";

export function cadenciaDias(c: Cliente): number | null {
  if (!c.coberturaId || !c.llamadasCadaMeses) return null;
  const porLlamadas = c.llamadasCadaMeses * 30.44;
  const porVisitas = c.visitasAlAno ? 365 / c.visitasAlAno : Number.POSITIVE_INFINITY;
  return Math.min(porLlamadas, porVisitas);
}

export function diasDesdeContacto(c: Cliente, hoy = new Date()): number | null {
  if (!c.ultimoContacto) return null;
  const d = new Date(`${c.ultimoContacto}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((hoy.getTime() - d.getTime()) / 86_400_000));
}

export interface EstadoCobertura {
  cara: Cara;
  dias: number | null;
  cadencia: number | null;
  titulo: string;
}

export function estadoCobertura(c: Cliente): EstadoCobertura {
  if (c.fechaBaja) {
    return { cara: "baja", dias: diasDesdeContacto(c), cadencia: cadenciaDias(c), titulo: `De baja desde el ${fmtFecha(c.fechaBaja)}` };
  }
  const cadencia = cadenciaDias(c);
  if (cadencia === null) {
    return { cara: "sin", dias: null, cadencia: null, titulo: "Sin cobertura asignada" };
  }
  const dias = diasDesdeContacto(c);
  const base = `${c.coberturaNombre ?? `Tipo ${c.coberturaId}`} · ${c.coberturaDescripcion ?? ""}`.trim();
  if (dias === null) {
    return { cara: "vencido", dias: null, cadencia, titulo: `${base} · sin contactos registrados` };
  }
  const ratio = dias / cadencia;
  if (ratio <= 1) return { cara: "ok", dias, cadencia, titulo: `${base} · último contacto hace ${dias} días` };
  if (ratio <= 1.5) return { cara: "aviso", dias, cadencia, titulo: `${base} · último contacto hace ${dias} días, toca contactar` };
  return { cara: "vencido", dias, cadencia, titulo: `${base} · desatendido desde hace ${dias} días` };
}

export function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export const CARA_STYLE: Record<Cara, { label: string; cls: string }> = {
  ok: { label: "Al día", cls: "text-emerald-300" },
  aviso: { label: "Próximo a vencer", cls: "text-amber-300" },
  vencido: { label: "Desatendido", cls: "text-red-300" },
  sin: { label: "Sin cobertura", cls: "text-slate-500" },
  baja: { label: "De baja", cls: "text-slate-500" },
};
