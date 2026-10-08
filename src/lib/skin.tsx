import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { SKIN_STORAGE_KEY, leerSkinInicial, type SkinId } from "./skins";

interface SkinCtx {
  skin: SkinId;
  setSkin: (s: SkinId) => void;
}

const SkinContext = createContext<SkinCtx | null>(null);

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<SkinId>(leerSkinInicial);

  useEffect(() => {
    document.documentElement.dataset.theme = skin;
    try {
      localStorage.setItem(SKIN_STORAGE_KEY, skin);
    } catch {
      /* sin almacenamiento */
    }
  }, [skin]);

  const setSkin = useCallback((s: SkinId) => setSkinState(s), []);

  return <SkinContext.Provider value={{ skin, setSkin }}>{children}</SkinContext.Provider>;
}

export function useSkin(): SkinCtx {
  const ctx = useContext(SkinContext);
  if (!ctx) throw new Error("useSkin fuera de SkinProvider");
  return ctx;
}
