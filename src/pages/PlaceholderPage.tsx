import type { LucideIcon } from "lucide-react";
import { Cpu } from "lucide-react";

export default function PlaceholderPage({
  titulo,
  Icon,
  descrip,
}: {
  titulo: string;
  Icon: LucideIcon;
  descrip: string;
}) {
  return (
    <div className="anim-rise mx-auto max-w-3xl">
      <div className="jarvis-panel relative overflow-hidden p-10 text-center sm:p-14">
        <div className="tech-grid-bg absolute inset-0" aria-hidden />
        <div className="relative">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-300 shadow-[0_0_30px_-6px_rgba(34,211,238,.6)]">
            <Icon size={34} strokeWidth={1.6} />
          </div>
          <p className="mt-5 font-mono text-[11px] tracking-[0.3em] text-cyan-300/70">MÓDULO {titulo.toUpperCase()}</p>
          <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{titulo}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-300">
            J.A.R.V.I.S. está preparando este módulo… {descrip}
          </p>
          <div className="mx-auto mt-6 flex max-w-xs items-center gap-2 rounded-full border border-cyan-300/20 bg-[#020812]/60 px-4 py-2.5">
            <Cpu size={15} className="anim-breathe shrink-0 text-cyan-300" />
            <p className="truncate font-mono text-[11px] tracking-widest text-cyan-200/80">
              SINCRONIZANDO CON EL NÚCLEO…
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
