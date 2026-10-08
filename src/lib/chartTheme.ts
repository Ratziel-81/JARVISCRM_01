import type { SkinId } from "./skins";

export interface ChartTema {
  tick: string;
  rejilla: string;
  eje: string;
  etiqueta: string;
  tooltipBg: string;
  tooltipBorde: string;
  tooltipTexto: string;
}

const TEMAS: Record<SkinId, ChartTema> = {
  "jarvis-dark": {
    tick: "#7d8aa0",
    rejilla: "rgba(103,232,249,.08)",
    eje: "rgba(103,232,249,.15)",
    etiqueta: "#a5e8ff",
    tooltipBg: "#041321",
    tooltipBorde: "rgba(103,232,249,.25)",
    tooltipTexto: "#a5e8ff",
  },
  "neumorphism-01": {
    tick: "#71839A",
    rejilla: "rgba(41,65,93,.08)",
    eje: "rgba(41,65,93,.15)",
    etiqueta: "#29415D",
    tooltipBg: "#F4F7FA",
    tooltipBorde: "rgba(50,159,224,.4)",
    tooltipTexto: "#29415D",
  },
};

export function chartTema(skin: SkinId): ChartTema {
  return TEMAS[skin] ?? TEMAS["jarvis-dark"];
}
