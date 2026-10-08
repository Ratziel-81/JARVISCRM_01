import { Frown, LayoutGrid, List, Mail, Meh, Minus, Phone, PhoneCall, Plus, Rows3, Search, Smile, UserX, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ESTADO_CLIENTE_STYLES,
  clientesRecientes,
  formatEur,
  type Cliente,
  type Cobertura,
  type EstadoCliente,
} from "../data/mockData";
import { api } from "../lib/api";
import { CARA_STYLE, estadoCobertura, fmtFecha, type Cara } from "../lib/cobertura";

type Vista = "lista" | "fichas" | "miniaturas";
type Orden = "recientes" | "nombre" | "valor-desc" | "valor-asc";

const ESTADOS: ("Todos" | EstadoCliente)[] = ["Todos", "Activo", "Prospecto", "En seguimiento"];

const VISTAS: { id: Vista; label: string; Icon: typeof List }[] = [
  { id: "lista", label: "Lista", Icon: List },
  { id: "fichas", label: "Fichas", Icon: LayoutGrid },
  { id: "miniaturas", label: "Miniaturas", Icon: Rows3 },
];

const CARA_ICON: Record<Cara, typeof Smile> = {
  ok: Smile,
  aviso: Meh,
  vencido: Frown,
  sin: Minus,
  baja: UserX,
};

function Avatar({ c, size = "md" }: { c: Cliente; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "h-14 w-14 text-base" : size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-xs";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${cls}`}
      style={{ background: `linear-gradient(135deg, ${c.avatarColor}, #0b1526)` }}
      aria-hidden
    >
      {c.iniciales}
    </span>
  );
}

function CaraCobertura({ c, size = 20 }: { c: Cliente; size?: number }) {
  const st = estadoCobertura(c);
  const Icon = CARA_ICON[st.cara];
  return (
    <span title={`${st.titulo}`} role="img" aria-label={`Cobertura: ${CARA_STYLE[st.cara].label}`} className="inline-flex shrink-0">
      <Icon size={size} className={CARA_STYLE[st.cara].cls} />
    </span>
  );
}

function EstadoBadge({ c }: { c: Cliente }) {
  if (c.fechaBaja) {
    return (
      <span className="inline-block whitespace-nowrap rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
        Baja
      </span>
    );
  }
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ESTADO_CLIENTE_STYLES[c.estado]}`}>
      {c.estado}
    </span>
  );
}

function BotonContacto({ id, onHecho }: { id: string; onHecho: (c: Cliente) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      title="Registrar contacto hoy (pone la carita en verde)"
      aria-label="Registrar contacto hoy"
      onClick={async () => {
        if (busy) return;
        setBusy(true);
        try {
          onHecho(await api.registrarContacto(id));
        } catch {
          alert("No se pudo registrar. Arranca la API con `npm run server`.");
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-lg border border-white/10 p-1.5 text-slate-500 transition hover:border-emerald-300/40 hover:text-emerald-300 disabled:opacity-50"
    >
      <PhoneCall size={14} />
    </button>
  );
}

const hoyInput = () => new Date().toISOString().slice(0, 10);

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>(clientesRecientes);
  const [coberturas, setCoberturas] = useState<Cobertura[]>([]);
  const [cargando, setCargando] = useState(true);
  const [desdeApi, setDesdeApi] = useState(false);
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>("Todos");
  const [cobFiltro, setCobFiltro] = useState<string>("todas");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [vista, setVista] = useState<Vista>("lista");
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    email: "",
    telefono: "",
    estado: "Prospecto" as EstadoCliente,
    valor: "",
    coberturaId: "",
    fechaAlta: hoyInput(),
    fechaBaja: "",
  });

  useEffect(() => {
    let vivo = true;
    api
      .clientes()
      .then((data) => {
        if (vivo && Array.isArray(data) && data.length > 0) {
          setClientes(data);
          setDesdeApi(true);
        }
      })
      .catch(() => {
        /* sin API: se usan los mocks locales */
      })
      .finally(() => vivo && setCargando(false));
    api
      .coberturas()
      .then((data) => vivo && Array.isArray(data) && setCoberturas(data))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const alContactar = (nuevo: Cliente) => setClientes((prev) => prev.map((c) => (c.id === nuevo.id ? nuevo : c)));

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = clientes.filter((c) => {
      const okEstado = estado === "Todos" || c.estado === estado;
      const okCob =
        cobFiltro === "todas" || (cobFiltro === "sin" ? !c.coberturaId : c.coberturaId === cobFiltro);
      const okQ =
        q.length === 0 ||
        c.nombre.toLowerCase().includes(q) ||
        c.empresa.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.telefono.toLowerCase().includes(q);
      return okEstado && okCob && okQ;
    });
    if (orden === "nombre") list = [...list].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    if (orden === "valor-desc") list = [...list].sort((a, b) => b.valor - a.valor);
    if (orden === "valor-asc") list = [...list].sort((a, b) => a.valor - b.valor);
    return list;
  }, [clientes, query, estado, cobFiltro, orden]);

  const totalCartera = useMemo(() => filtrados.reduce((s, c) => s + c.valor, 0), [filtrados]);
  const desatendidos = useMemo(() => filtrados.filter((c) => estadoCobertura(c).cara === "vencido").length, [filtrados]);
  const hayFiltros = query.trim() !== "" || estado !== "Todos" || cobFiltro !== "todas";

  async function crearCliente(e: FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || guardando) return;
    setGuardando(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          valor: Number(form.valor) || 0,
          coberturaId: form.coberturaId || null,
          fechaAlta: form.fechaAlta || null,
          fechaBaja: form.fechaBaja || null,
        }),
      });
      if (!res.ok) throw new Error();
      const nuevo = (await res.json()) as Cliente;
      setClientes((prev) => [nuevo, ...prev]);
      setForm({ nombre: "", empresa: "", email: "", telefono: "", estado: "Prospecto", valor: "", coberturaId: "", fechaAlta: hoyInput(), fechaBaja: "" });
      setModal(false);
    } catch {
      alert("No se pudo guardar. Arranca la API con `npm run server`.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="anim-rise space-y-4">
      {/* cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-300/70">MÓDULO CLIENTES</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white">Clientes</h1>
          <p className="mt-1 text-sm text-slate-400">
            {cargando ? "Sincronizando…" : `${filtrados.length} de ${clientes.length} clientes · Cartera ${formatEur(totalCartera)}`}
            {!cargando && desatendidos > 0 && <span className="ml-2 font-semibold text-red-300">· {desatendidos} desatendidos</span>}
            {!cargando && !desdeApi && <span className="ml-2 font-mono text-[11px] text-amber-300/80">(datos locales — arranca `npm run server`)</span>}
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
        >
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* filtros */}
      <div className="jarvis-panel space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-300/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, empresa, email o teléfono…"
              className="w-full rounded-xl border border-cyan-300/15 bg-white/[.04] py-2.5 pl-10 pr-9 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-300/50"
              aria-label="Buscar clientes"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200" aria-label="Limpiar búsqueda">
                <X size={15} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ESTADOS.map((s) => (
              <button
                key={s}
                onClick={() => setEstado(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  estado === s
                    ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 bg-white/[.02] text-slate-400 hover:border-cyan-300/30 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={cobFiltro}
              onChange={(e) => setCobFiltro(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#041321] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-300/50"
              aria-label="Filtrar por cobertura"
            >
              <option value="todas">Toda cobertura</option>
              {coberturas.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
              <option value="sin">Sin cobertura</option>
            </select>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as Orden)}
              className="rounded-xl border border-white/10 bg-[#041321] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-300/50"
              aria-label="Ordenar"
            >
              <option value="recientes">Recientes</option>
              <option value="nombre">Nombre A–Z</option>
              <option value="valor-desc">Mayor valor</option>
              <option value="valor-asc">Menor valor</option>
            </select>
            <div className="flex overflow-hidden rounded-xl border border-white/10" role="tablist" aria-label="Modo de vista">
              {VISTAS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={vista === id}
                  title={label}
                  onClick={() => setVista(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition ${
                    vista === id ? "bg-cyan-300/15 text-cyan-100" : "bg-white/[.02] text-slate-500 hover:text-slate-200"
                  }`}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* leyenda caritas */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/5 pt-2.5 font-mono text-[11px] text-slate-500">
          <span className="tracking-widest text-slate-600">COBERTURA:</span>
          {(Object.keys(CARA_STYLE) as Cara[]).map((k) => {
            const Icon = CARA_ICON[k];
            return (
              <span key={k} className="flex items-center gap-1.5">
                <Icon size={14} className={CARA_STYLE[k].cls} /> {CARA_STYLE[k].label}
              </span>
            );
          })}
        </div>
      </div>

      {/* contenido */}
      {cargando ? (
        <div className="jarvis-panel p-10 text-center font-mono text-xs tracking-widest text-cyan-200/70">SINCRONIZANDO CON EL NÚCLEO…</div>
      ) : filtrados.length === 0 ? (
        <div className="jarvis-panel p-10 text-center">
          <p className="text-sm font-semibold text-slate-200">Sin resultados{hayFiltros ? " para esos filtros" : ""}.</p>
          <p className="mt-1 text-xs text-slate-500">Prueba con otro término o crea un nuevo cliente.</p>
        </div>
      ) : vista === "lista" ? (
        <div className="jarvis-panel overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-cyan-300/10 font-mono text-[11px] uppercase tracking-widest text-slate-500">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Cobertura</th>
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-b border-white/5 transition last:border-0 hover:bg-cyan-300/[.04]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar c={c} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-100">{c.nombre}</p>
                        <p className="truncate text-xs text-slate-500">{c.empresa}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <CaraCobertura c={c} />
                      <span className="text-xs text-slate-400">{c.coberturaId ? `Tipo ${c.coberturaId}` : "—"}</span>
                      <BotonContacto id={c.id} onHecho={alContactar} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-400">{fmtFecha(c.fechaAlta)}</td>
                  <td className="px-4 py-2.5">
                    <p className="flex items-center gap-1.5 truncate text-xs text-slate-400"><Mail size={12} className="shrink-0 text-cyan-300/60" />{c.email}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><Phone size={12} className="shrink-0 text-cyan-300/40" />{c.telefono}</p>
                  </td>
                  <td className="px-4 py-2.5"><EstadoBadge c={c} /></td>
                  <td className="num-display px-4 py-2.5 text-right font-semibold text-cyan-100">{formatEur(c.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : vista === "fichas" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {filtrados.map((c) => {
            const st = estadoCobertura(c);
            return (
              <article key={c.id} className="jarvis-panel jarvis-panel-hover p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar c={c} size="lg" />
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-white">{c.nombre}</h3>
                      <p className="truncate text-xs text-slate-400">{c.empresa}</p>
                    </div>
                  </div>
                  <EstadoBadge c={c} />
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.02] px-3 py-2" title={st.titulo}>
                  <CaraCobertura c={c} size={22} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-200">
                      {c.coberturaId ? c.coberturaNombre ?? `Tipo ${c.coberturaId}` : "Sin cobertura"}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">{st.titulo}</p>
                  </div>
                  <span className="ml-auto"><BotonContacto id={c.id} onHecho={alContactar} /></span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <p className="flex items-center gap-2 truncate text-slate-400"><Mail size={13} className="shrink-0 text-cyan-300/60" />{c.email}</p>
                  <p className="flex items-center gap-2 text-slate-500"><Phone size={13} className="shrink-0 text-cyan-300/40" />{c.telefono}</p>
                </div>
                <div className="hud-line my-4" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-500">Alta {fmtFecha(c.fechaAlta)}{c.fechaBaja ? ` · Baja ${fmtFecha(c.fechaBaja)}` : ""}</span>
                  <span className="num-display text-lg font-extrabold text-cyan-100">{formatEur(c.valor)}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <ul className="jarvis-panel divide-y divide-white/5">
          {filtrados.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-cyan-300/[.04]">
              <CaraCobertura c={c} size={18} />
              <Avatar c={c} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">{c.nombre} <span className="font-normal text-slate-500">· {c.empresa}</span></p>
                <p className="font-mono text-[10px] text-slate-600">Alta {fmtFecha(c.fechaAlta)}</p>
              </div>
              <span className="hidden md:block"><EstadoBadge c={c} /></span>
              <BotonContacto id={c.id} onHecho={alContactar} />
              <span className="num-display shrink-0 text-sm font-semibold text-cyan-100">{formatEur(c.valor)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* modal nuevo cliente */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => !guardando && setModal(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={crearCliente}
            className="jarvis-panel max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="section-title">Nuevo cliente</h2>
              <button type="button" onClick={() => setModal(false)} className="text-slate-500 hover:text-slate-200" aria-label="Cerrar">
                <X size={17} />
              </button>
            </div>
            {(
              [
                { k: "nombre", label: "Nombre *", ph: "Ej. Hospital San Jorge" },
                { k: "empresa", label: "Empresa", ph: "Ej. San Jorge Group" },
                { k: "email", label: "Email", ph: "contacto@empresa.es" },
                { k: "telefono", label: "Teléfono", ph: "+34 910 000 000" },
              ] as const
            ).map(({ k, label, ph }) => (
              <label key={k} className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">{label}</span>
                <input
                  value={form[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  placeholder={ph}
                  required={k === "nombre"}
                  className="w-full rounded-xl border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-300/50"
                />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Estado</span>
                <select
                  value={form.estado}
                  onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoCliente }))}
                  className="w-full rounded-xl border border-cyan-300/15 bg-[#041321] px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  <option>Activo</option>
                  <option>Prospecto</option>
                  <option>En seguimiento</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Valor (€)</span>
                <input
                  type="number"
                  min="0"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-xl border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/50"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Cobertura</span>
              <select
                value={form.coberturaId}
                onChange={(e) => setForm((f) => ({ ...f, coberturaId: e.target.value }))}
                className="w-full rounded-xl border border-cyan-300/15 bg-[#041321] px-3 py-2 text-sm text-slate-100 outline-none"
              >
                <option value="">Sin cobertura</option>
                {coberturas.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre} — {t.descripcion}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Fecha de alta</span>
                <input
                  type="date"
                  value={form.fechaAlta}
                  onChange={(e) => setForm((f) => ({ ...f, fechaAlta: e.target.value }))}
                  className="w-full rounded-xl border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/50"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Fecha de baja</span>
                <input
                  type="date"
                  value={form.fechaBaja}
                  onChange={(e) => setForm((f) => ({ ...f, fechaBaja: e.target.value }))}
                  className="w-full rounded-xl border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/50"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-xl border border-cyan-300/40 bg-cyan-300/10 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar cliente"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
