export type SkinId = "jarvis-dark" | "neumorphism-01";

export interface Skin {
  id: SkinId;
  nombre: string;
  descripcion: string;
}

export const SKINS: Skin[] = [
  { id: "jarvis-dark", nombre: "JARVIS DARK", descripcion: "Tema oscuro futurista actual." },
  { id: "neumorphism-01", nombre: "NEUROMORPHISM_01", descripcion: "Tema claro neumórfico (estilos en construcción)." },
];

export const SKIN_STORAGE_KEY = "jarvis-skin";
export const DEFAULT_SKIN: SkinId = "jarvis-dark";

export function leerSkinInicial(): SkinId {
  try {
    const v = localStorage.getItem(SKIN_STORAGE_KEY);
    if (v === "neumorphism-01" || v === "jarvis-dark") return v;
  } catch {
    /* sin almacenamiento */
  }
  return DEFAULT_SKIN;
}
