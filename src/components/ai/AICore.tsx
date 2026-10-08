export default function AICore({ active }: { active: boolean }) {
  return (
    <div className="relative mx-auto h-36 w-36" aria-hidden>
      <div className="anim-spin-slow absolute inset-0 rounded-full border border-dashed border-cyan-300/40" />
      <div className="anim-spin-rev absolute inset-2.5 rounded-full border border-cyan-200/20" style={{ borderTopColor: "rgba(34,211,238,.85)" }} />
      <div className="absolute inset-5 rounded-full border border-cyan-300/25 bg-[radial-gradient(circle_at_35%_30%,rgba(125,211,252,.5),rgba(3,105,161,.55)_55%,rgba(2,8,18,.9)_85%)]" />
      {/* anillos de pulso */}
      <div className={`absolute inset-5 rounded-full border border-cyan-300/40 ${active ? "anim-breathe" : ""}`} />
      <div className="absolute inset-8 rounded-full bg-[radial-gradient(circle_at_40%_35%,#e0faff,#0ea5e9_60%,#082f49)] shadow-[0_0_34px_rgba(34,211,238,.65)]" />
      <div className={`absolute inset-[52px] rounded-full bg-cyan-50 ${active ? "anim-breathe" : ""}`} />
    </div>
  );
}
