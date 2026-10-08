export default function AICore({ active }: { active: boolean }) {
  return (
    <div className="relative mx-auto h-36 w-36" aria-hidden>
      <div className="anim-spin-slow absolute inset-0 rounded-full border border-dashed border-cyan-300/40" />
      <div className="anim-spin-rev absolute inset-2.5 rounded-full border border-cyan-200/20" style={{ borderTopColor: "rgba(34,211,238,.85)" }} />
      <div className="jarvis-core-mid absolute inset-5 rounded-full border border-cyan-300/25" />
      {/* anillos de pulso */}
      <div className={`absolute inset-5 rounded-full border border-cyan-300/40 ${active ? "anim-breathe" : ""}`} />
      <div className="jarvis-core-halo absolute inset-8 rounded-full" />
      <div className={`absolute inset-[52px] rounded-full bg-cyan-50 ${active ? "anim-breathe" : ""}`} />
    </div>
  );
}
