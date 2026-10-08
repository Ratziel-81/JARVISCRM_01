import { Bot } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import JarvisPanel from "../ai/JarvisPanel";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  // JARVIS vive en el layout: no se cierra al navegar y conserva la conversación
  const [jarvis, setJarvis] = useState(() => window.innerWidth >= 1280);

  return (
    <div className="jarvis-app min-h-screen">
      {/* fondo ambiental global */}
      <div className="tech-grid-bg pointer-events-none fixed inset-0" aria-hidden />
      <div className="jarvis-ambient pointer-events-none fixed inset-0" aria-hidden />
      <Topbar onMenu={() => setMobileOpen(true)} />
      <div className="relative flex">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main className="min-w-0 flex-1 px-3 pb-10 pt-[86px] sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1760px]">
            <Outlet />
          </div>
        </main>
        {/* dock JARVIS: columna fija en escritorio, overlay en móvil */}
        {jarvis && (
          <>
            <div className="fixed inset-0 z-40 bg-black/60 xl:hidden" onClick={() => setJarvis(false)} aria-hidden />
            <div className="fixed inset-y-[78px] right-2 z-50 w-[min(360px,92vw)] xl:sticky xl:inset-auto xl:top-[86px] xl:z-auto xl:mr-6 xl:h-[calc(100vh-102px)] xl:w-[360px] xl:shrink-0 xl:self-start">
              <JarvisPanel onCerrar={() => setJarvis(false)} />
            </div>
          </>
        )}
      </div>
      {/* flotante para reabrir */}
      {!jarvis && (
        <button
          onClick={() => setJarvis(true)}
          title="Abrir J.A.R.V.I.S."
          aria-label="Abrir J.A.R.V.I.S."
          className="jarvis-fab fixed bottom-5 right-5 z-50 flex items-center justify-center rounded-full border border-cyan-300/40 p-3.5 text-cyan-200 transition"
        >
          <Bot size={22} />
        </button>
      )}
    </div>
  );
}
