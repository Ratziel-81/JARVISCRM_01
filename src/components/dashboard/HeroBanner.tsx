export default function HeroBanner() {
  return (
    <section className="anim-rise relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-gradient-to-r from-[#06263f] via-[#041829] to-[#020812] shadow-[0_24px_70px_-24px_rgba(0,0,0,.9)]">
      {/* capas decorativas */}
      <div className="tech-grid-bg absolute inset-0" aria-hidden />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(520px 260px at 12% 50%, rgba(34,211,238,.16), transparent 65%), radial-gradient(560px 300px at 88% 20%, rgba(47,123,255,.14), transparent 65%)",
        }}
      />
      <div className="hud-line absolute inset-x-0 top-0" aria-hidden />
      <div className="hud-line absolute inset-x-0 bottom-0 opacity-60" aria-hidden />

      {/* partículas discretas */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {[
          { l: "8%", t: "22%" },
          { l: "22%", t: "70%" },
          { l: "47%", t: "18%" },
          { l: "63%", t: "78%" },
          { l: "78%", t: "30%" },
          { l: "91%", t: "62%" },
        ].map((p, i) => (
          <span
            key={i}
            className="anim-breathe absolute h-1 w-1 rounded-full bg-cyan-200/70"
            style={{ left: p.l, top: p.t, animationDelay: `${i * 0.5}s` }}
          />
        ))}
      </div>

      <div className="relative flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:gap-8">
        {/* núcleo */}
        <div className="flex shrink-0 items-center gap-5">
          <div className="relative h-28 w-28 sm:h-32 sm:w-32" aria-hidden>
            <div className="anim-spin-slow absolute inset-0 rounded-full border border-dashed border-cyan-300/40" />
            <div className="anim-spin-rev absolute inset-2 rounded-full border border-cyan-200/20" style={{ borderTopColor: "rgba(34,211,238,.8)" }} />
            <svg viewBox="0 0 100 100" className="absolute inset-4">
              <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(34,211,238,.25)" strokeWidth="1.5" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="40 150" strokeLinecap="round" className="anim-dash" />
              <circle cx="50" cy="50" r="18" fill="url(#coreGrad)" />
              <circle cx="50" cy="50" r="9" fill="#dffaff" className="anim-breathe" />
              <defs>
                <radialGradient id="coreGrad" cx="40%" cy="35%">
                  <stop offset="0%" stopColor="#bae6fd" />
                  <stop offset="55%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#082f49" />
                </radialGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 rounded-full shadow-[0_0_40px_-6px_rgba(34,211,238,.5)]" />
          </div>
          {/* marcadores HUD */}
          <div className="hidden font-mono text-[10px] leading-relaxed tracking-widest text-cyan-200/60 sm:block">
            <p>SYS.CRM // v4.2</p>
            <p className="text-emerald-300/80">● ANÁLISIS ACTIVO</p>
            <p>304 NODOS</p>
          </div>
        </div>

        {/* texto */}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] tracking-[0.28em] text-cyan-300/80">CENTRO DE MANDO COMERCIAL</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Hola Alex<span className="text-cyan-300">,</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Aquí tienes el estado general de tu CRM. <span className="text-cyan-200">J.A.R.V.I.S.</span> está analizando
            tus clientes, oportunidades y próximas acciones.
          </p>
        </div>

        {/* cita */}
        <div className="relative shrink-0 lg:max-w-xs lg:border-l lg:border-cyan-300/15 lg:pl-8">
          <svg width="60" height="44" viewBox="0 0 60 44" className="mb-1 opacity-40" aria-hidden>
            <circle cx="30" cy="22" r="16" fill="none" stroke="#22d3ee" strokeWidth="1" />
            <circle cx="30" cy="22" r="9" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="30" cy="22" r="3.5" fill="#22d3ee" className="anim-breathe" />
            <path d="M30 2v6M30 36v6M2 22h6M52 22h6" stroke="#22d3ee" strokeWidth="1" />
          </svg>
          <blockquote className="text-sm italic leading-relaxed text-slate-200">
            “El éxito no es un destino,
            <br />
            es un proceso.”
          </blockquote>
          <p className="mt-1 font-mono text-[10px] tracking-[0.24em] text-cyan-300/70">— J.A.R.V.I.S.</p>
        </div>
      </div>
    </section>
  );
}
