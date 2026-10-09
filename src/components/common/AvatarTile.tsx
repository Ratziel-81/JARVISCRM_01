import { useSkin } from "../../lib/skin";

const TAMANOS = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-base",
} as const;

/** Tesela de iniciales: bola degradada en JARVIS DARK, baldosa clara
 *  neumórfica con iniciales de color en NEUROMORPHISM_01. */
export default function AvatarTile({
  color,
  iniciales,
  size = "md",
}: {
  color: string;
  iniciales: string;
  size?: keyof typeof TAMANOS;
}) {
  const { skin } = useSkin();
  const claro = skin === "neumorphism-01";
  return (
    <span
      className={`jarvis-avatar flex shrink-0 items-center justify-center font-bold ${TAMANOS[size]} ${
        claro ? "rounded-xl" : "rounded-full"
      }`}
      style={
        claro
          ? { background: "#F4F7FA", color }
          : { background: `linear-gradient(135deg, ${color}, #0b1526)`, color: "#fff" }
      }
      aria-hidden
    >
      {iniciales}
    </span>
  );
}
