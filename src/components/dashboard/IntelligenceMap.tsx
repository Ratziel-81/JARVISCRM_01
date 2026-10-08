export default function IntelligenceMap() {
  return (
    <section
      className="jarvis-panel anim-rise stagger-6 relative flex h-full flex-col overflow-hidden p-5"
      aria-label="Inteligencia global"
    >
      <div className="tech-grid-bg absolute inset-0" aria-hidden />
      <h2 className="section-title relative">Inteligencia Global</h2>

      {/* globo holográfico abstracto */}
      <div className="relative mx-auto my-2 h-44 w-44 shrink-0" aria-hidden>
        <div className="anim-spin-slow absolute inset-0 rounded-full border border-dashed border-cyan-300/30" />
        <div className="anim-spin-rev absolute inset-3 rounded-full border border-cyan-200/20" style={{ borderTopColor: "rgba(45,212,191,.8)" }} />
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-80">
          <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(34,211,238,.5)" strokeWidth="1" />
          <ellipse cx="50" cy="50" rx="34" ry="12" fill="none" stroke="rgba(34,211,238,.35)" strokeWidth=".8" />
          <ellipse cx="50" cy="50" rx="34" ry="24" fill="none" stroke="rgba(34,211,238,.25)" strokeWidth=".8" />
          <ellipse cx="50" cy="50" rx="12" ry="34" fill="none" stroke="rgba(34,211,238,.35)" strokeWidth=".8" />
          <ellipse cx="50" cy="50" rx="24" ry="34" fill="none" stroke="rgba(34,211,238,.2)" strokeWidth=".8" />
          <circle cx="50" cy="50" r="34" fill="url(#globeGlow)" opacity=".55" />
          <circle cx="32" cy="38" r="2" fill="#2dd4bf" className="anim-breathe" />
          <circle cx="62" cy="44" r="2" fill="#22d3ee" className="anim-breathe" style={{ animationDelay: ".6s" }} />
          <circle cx="55" cy="64" r="2" fill="#f5c542" className="anim-breathe" style={{ animationDelay: "1.1s" }} />
          <defs>
            <radialGradient id="globeGlow" cx="50%" cy="45%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity=".5" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 rounded-full shadow-[0_0_50px_-8px_rgba(34,211,238,.45),inset_0_0_30px_rgba(34,211,238,.15)]" />
      </div>

      {/* cifras */}
      <div className="relative grid grid-cols-3 gap-2 text-center">
        {[
          { v: "248", l: "Clientes" },
          { v: "56", l: "Oportunidades" },
          { v: "€124.5k", l: "Ventas" },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-cyan-300/15 bg-[#020812]/60 px-1 py-2">
            <p className="num-display text-sm font-extrabold text-white sm:text-base">{s.v}</p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-200/70">{s.l}</p>
          </div>
        ))}
      </div>

      <p className="relative mt-3 flex items-center justify-center gap-2 border-t border-cyan-300/10 pt-3 font-mono text-[10px] tracking-[0.2em] text-cyan-200/70">
        <span className="anim-pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
        J.A.R.V.I.S. | ANALIZANDO OPORTUNIDADES…
      </p>
    </section>
  );
}
