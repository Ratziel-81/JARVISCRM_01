import { Bell, ChevronDown, Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientesRecientes, empresas, notificaciones, oportunidades, type Notificacion } from "../../data/mockData";
import { api } from "../../lib/api";

interface Props {
  onMenu: () => void;
}

interface SearchHit {
  id: string;
  tipo: string;
  titulo: string;
  subtitulo: string;
  to: string;
}

function buildIndex(query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const c of clientesRecientes) {
    if (c.nombre.toLowerCase().includes(q) || c.empresa.toLowerCase().includes(q)) {
      hits.push({ id: c.id, tipo: "Cliente", titulo: c.nombre, subtitulo: c.empresa, to: "/clientes" });
    }
  }
  for (const e of empresas) {
    if (e.nombre.toLowerCase().includes(q)) {
      hits.push({ id: e.id, tipo: "Empresa", titulo: e.nombre, subtitulo: e.sector, to: "/clientes" });
    }
  }
  for (const o of oportunidades) {
    if (o.empresa.toLowerCase().includes(q)) {
      hits.push({ id: o.id, tipo: "Oportunidad", titulo: o.empresa, subtitulo: `€${o.importe.toLocaleString("es-ES")}`, to: "/oportunidades" });
    }
  }
  return hits.slice(0, 7);
}

export function JarvisLogo({ size = 44 }: { size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      <div className="anim-spin-slow absolute inset-0 rounded-full border border-dashed border-cyan-300/50" />
      <div className="anim-spin-rev absolute inset-[6px] rounded-full border border-cyan-200/25" style={{ borderTopColor: "rgba(34,211,238,.9)" }} />
      <div className="absolute inset-[12px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#7dd3fc,#0369a1_55%,#020812_85%)] shadow-[0_0_18px_rgba(34,211,238,.55)]" />
      <div className="anim-breathe absolute inset-[19px] rounded-full bg-cyan-100" />
    </div>
  );
}

export default function Topbar({ onMenu }: Props) {
  const [query, setQuery] = useState("");
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [notifs, setNotifs] = useState<Notificacion[]>(notificaciones);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // búsqueda global en la API con fallback local
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const t = setTimeout(() => {
      api
        .search(q)
        .then((d) => setResults(Array.isArray(d) ? d.slice(0, 7) : []))
        .catch(() => setResults(buildIndex(q)));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  // notificaciones reales con fallback local
  useEffect(() => {
    api
      .notificaciones()
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) setNotifs(d);
      })
      .catch(() => {});
  }, []);

  const unread = notifs.filter((n) => !n.leida).length;

  function cambiarQuery(v: string) {
    setQuery(v);
    if (v.trim().length < 2) setResults([]);
  }

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-[70px] items-center gap-3 border-b border-cyan-300/10 px-3 backdrop-blur-xl sm:px-5 jarvis-topbar">
      {/* menú móvil */}
      <button
        onClick={onMenu}
        className="rounded-lg border border-cyan-300/15 p-2 text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200 lg:hidden"
        aria-label="Abrir navegación"
      >
        <Menu size={18} />
      </button>

      {/* marca */}
      <div className="flex min-w-0 items-center gap-3">
        <JarvisLogo />
        <div className="leading-tight">
          <p className="truncate text-[15px] font-extrabold tracking-[0.08em] text-white">
            J.A.R.V.I.S. <span className="text-cyan-300">CRM</span>
          </p>
          <p className="hidden truncate text-[11px] tracking-wide text-slate-400 sm:block">Your clients. Our mission.</p>
        </div>
      </div>

      {/* buscador desktop */}
      <div className="relative mx-auto hidden w-full max-w-xl md:block">
        <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300/70" />
        <input
          value={query}
          onChange={(e) => cambiarQuery(e.target.value)}
          placeholder="Buscar clientes, empresas, oportunidades..."
          className="jarvis-field w-full rounded-xl border border-cyan-300/15 py-2.5 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-300/50 focus:bg-white/[.06] focus:shadow-[0_0_20px_-6px_rgba(34,211,238,.5)]"
          aria-label="Búsqueda global"
        />
        {query.trim().length >= 2 && (
          <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-cyan-300/20 shadow-2xl backdrop-blur-xl jarvis-menu">
            {results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400">Sin resultados para «{query}».</p>
            ) : (
              results.map((r) => (
                <button
                  key={`${r.tipo}-${r.id}`}
                  onClick={() => {
                    navigate(r.to);
                    cambiarQuery("");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-cyan-300/10"
                >
                  <span className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan-200">
                    {r.tipo}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-100">{r.titulo}</span>
                    <span className="block truncate text-xs text-slate-400">{r.subtitulo}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        {/* búsqueda móvil */}
        <button
          onClick={() => setMobileSearch((v) => !v)}
          className="rounded-lg border border-cyan-300/15 p-2 text-slate-300 md:hidden"
          aria-label="Buscar"
        >
          {mobileSearch ? <X size={18} /> : <Search size={18} />}
        </button>

        {/* notificaciones */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setUserOpen(false);
            }}
            className="relative rounded-lg border border-cyan-300/15 p-2 text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
            aria-label="Notificaciones"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-[#020812]">
                {unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="anim-rise absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-cyan-300/20 shadow-2xl backdrop-blur-xl jarvis-menu">
              <p className="border-b border-cyan-300/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                Notificaciones
              </p>
              {notifs.map((n) => (
                <div key={n.id} className="border-b border-white/5 px-4 py-3 last:border-0 hover:bg-white/[.03]">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-100">
                    {!n.leida && <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />}
                    {n.titulo}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{n.detalle}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">{n.hace}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* usuario */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => {
              setUserOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2.5 rounded-xl border border-cyan-300/15 py-1.5 pl-1.5 pr-2 transition hover:border-cyan-300/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-700 text-sm font-bold text-white shadow-[0_0_14px_rgba(47,123,255,.6)]">
              A
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-[13px] font-semibold text-white">Hola, Alex</span>
              <span className="block text-[11px] text-slate-400">Administrador</span>
            </span>
            <ChevronDown size={15} className={`text-slate-400 transition-transform ${userOpen ? "rotate-180" : ""}`} />
          </button>
          {userOpen && (
            <div className="anim-rise absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-cyan-300/20 shadow-2xl backdrop-blur-xl jarvis-menu">
              {["Mi perfil", "Preferencias", "Sesiones activas"].map((item) => (
                <button key={item} className="block w-full px-4 py-2.5 text-left text-sm text-slate-200 transition hover:bg-cyan-300/10 hover:text-white">
                  {item}
                </button>
              ))}
              <button className="block w-full border-t border-cyan-300/10 px-4 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/10">
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* búsqueda móvil expandida */}
      {mobileSearch && (
        <div className="absolute inset-x-0 top-full border-b border-cyan-300/10 p-3 backdrop-blur-xl md:hidden jarvis-topbar">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-300/70" />
            <input
              autoFocus
              value={query}
              onChange={(e) => cambiarQuery(e.target.value)}
              placeholder="Buscar clientes, empresas, oportunidades..."
              className="jarvis-field w-full rounded-xl border border-cyan-300/20 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-300/50"
              aria-label="Búsqueda global móvil"
            />
          </div>
          {results.length > 0 && (
            <div className="jarvis-menu mt-2 overflow-hidden rounded-xl border border-cyan-300/20">
              {results.map((r) => (
                <button
                  key={`m-${r.tipo}-${r.id}`}
                  onClick={() => {
                    navigate(r.to);
                    cambiarQuery("");
                    setMobileSearch(false);
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm text-slate-100 hover:bg-cyan-300/10"
                >
                  <span className="mr-2 font-mono text-[10px] uppercase text-cyan-300">{r.tipo}</span>
                  {r.titulo}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
