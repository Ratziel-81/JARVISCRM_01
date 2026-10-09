import { ArrowLeft, ArrowRight, FilePlus2, Gem, Pencil, PhoneCall, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AvatarTile from "../components/common/AvatarTile";
import {
  ESTADO_CLIENTE_STYLES,
  ESTADO_OFERTA_STYLES,
  ESTADO_OPORTUNIDAD_STYLES,
  formatEur,
  type Accion,
  type Cliente,
  type Cobertura,
  type EstadoCliente,
  type Oferta,
  type Oportunidad,
  type TipoAccion,
} from "../data/mockData";
import { api } from "../lib/api";
import { CARA_STYLE, estadoCobertura, fmtFecha, type Cara } from "../lib/cobertura";

// Vincula por nombre normalizado (sin S.L./S.A., tildes ni signos)
function norm(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(s\.?l\.?|s\.?a\.?|s\.?c\.?|c\.?b\.?|s\.?l\.?u\.?)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}
function encaja(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = norm(a);
  const y = norm(b);
  return x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x));
}
const encajaCliente = (c: Cliente, empresa: string | null | undefined) =>
  encaja(empresa, c.nombre) || encaja(empresa, c.empresa);

const hoyInput = () => new Date().toISOString().slice(0, 10);

export default function FichaClientePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [ops, setOps] = useState<Oportunidad[]>([]);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [coberturas, setCoberturas] = useState<Cobertura[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noExiste, setNoExiste] = useState(false);
  const [modal, setModal] = useState<null | "editar" | "oportunidad" | "oferta" | "accion">(null);
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formOp, setFormOp] = useState({ empresa: "", importe: "", prioridad: "Media", probabilidad: "20" });
  const [formOf, setFormOf] = useState({ oportunidadId: "", titulo: "", importe: "", fechaVencimiento: "" });
  const [formAc, setFormAc] = useState({ tipo: "llamada" as TipoAccion, titulo: "", fecha: hoyInput(), hora: "", detalle: "" });
  const [formCl, setFormCl] = useState({ nombre: "", empresa: "", email: "", telefono: "", estado: "Prospecto" as EstadoCliente, valor: "", coberturaId: "", fechaAlta: "", fechaBaja: "" });

  async function recargar() {
    if (!id) return;
    const [c, o, of, a, cob] = await Promise.all([
      api.cliente(id),
      api.oportunidades(),
      api.ofertas(),
      api.acciones(),
      api.coberturas(),
    ]);
    setCliente(c);
    setOps(o);
    setOfertas(of);
    setAcciones(a);
    setCoberturas(cob);
  }

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await recargar();
      } catch {
        if (vivo) setNoExiste(true);
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const opsMias = useMemo(
    () => (cliente ? ops.filter((o) => encajaCliente(cliente, o.empresa)) : []),
    [ops, cliente],
  );
  const ofertasMias = useMemo(
    () => ofertas.filter((o) => opsMias.some((op) => op.id === o.oportunidadId)).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0)),
    [ofertas, opsMias],
  );
  const accionesMias = useMemo(
    () =>
      cliente
        ? acciones.filter((a) => a.clienteId === cliente.id || encajaCliente(cliente, a.empresa)).sort((x, y) => (x.fecha ?? "").localeCompare(y.fecha ?? ""))
        : [],
    [acciones, cliente],
  );

  const kpis = useMemo(() => {
    const abiertas = opsMias.filter((o) => (o.estado ?? "Abierta") === "Abierta");
    const pipe = abiertas.reduce((s, o) => s + o.importe, 0);
    const activas = ofertasMias.filter((o) => opsMias.some((op) => op.id === o.oportunidadId && op.ofertaActivaId === o.id)).length;
    const pendAcc = accionesMias.filter((a) => a.estado === "Pendiente").length;
    return { pipe, nOps: opsMias.length, activas, pendAcc };
  }, [opsMias, ofertasMias, accionesMias]);

  function abrirEditar() {
    if (!cliente) return;
    setFormCl({
      nombre: cliente.nombre,
      empresa: cliente.empresa ?? "",
      email: cliente.email ?? "",
      telefono: cliente.telefono ?? "",
      estado: cliente.estado,
      valor: String(cliente.valor ?? 0),
      coberturaId: cliente.coberturaId ?? "",
      fechaAlta: cliente.fechaAlta ?? "",
      fechaBaja: cliente.fechaBaja ?? "",
    });
    setConfirmandoBorrar(false);
    setModal("editar");
  }

  async function guardarCliente(e: FormEvent) {
    e.preventDefault();
    if (!id || guardando) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formCl, valor: Number(formCl.valor) || 0, coberturaId: formCl.coberturaId || null, fechaBaja: formCl.fechaBaja || null }),
      });
      if (!res.ok) throw new Error();
      await recargar();
      setModal(null);
    } catch {
      alert("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrarCliente() {
    if (!id || guardando) return;
    setGuardando(true);
    try {
      const res = await api.borrarCliente(id);
      if (!res.ok) throw new Error();
      navigate("/clientes");
    } catch {
      alert("No se pudo eliminar el cliente.");
      setGuardando(false);
    }
  }

  async function crearOportunidad(e: FormEvent) {
    e.preventDefault();
    if (!cliente || guardando || !formOp.empresa.trim()) return;
    setGuardando(true);
    try {
      await api.crearOportunidad({
        empresa: formOp.empresa.trim(),
        importe: Number(formOp.importe) || 0,
        prioridad: formOp.prioridad,
        etapa: "prospeccion",
        probabilidad: Number(formOp.probabilidad) || 0,
      });
      await recargar();
      setModal(null);
    } catch {
      alert("No se pudo crear la oportunidad.");
    } finally {
      setGuardando(false);
    }
  }

  async function crearOferta(e: FormEvent) {
    e.preventDefault();
    if (guardando || !formOf.oportunidadId || !formOf.titulo.trim()) return;
    setGuardando(true);
    try {
      await api.crearOferta(formOf.oportunidadId, {
        titulo: formOf.titulo.trim(),
        importe: Number(formOf.importe) || 0,
        fechaVencimiento: formOf.fechaVencimiento || undefined,
      });
      await recargar();
      setModal(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo crear la oferta.");
    } finally {
      setGuardando(false);
    }
  }

  async function crearAccion(e: FormEvent) {
    e.preventDefault();
    if (!cliente || guardando) return;
    setGuardando(true);
    try {
      await api.crearAccion({
        ...formAc,
        empresa: cliente.empresa || cliente.nombre,
        clienteId: cliente.id,
        detalle: formAc.detalle ? `${formAc.detalle} (con ${cliente.nombre})` : `Con ${cliente.nombre}`,
      });
      await recargar();
      setModal(null);
    } catch {
      alert("No se pudo crear la acción.");
    } finally {
      setGuardando(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-cyan-300/15 bg-white/[.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-300/50";
  const selectCls = "w-full rounded-xl border border-cyan-300/15 bg-[#041321] px-3 py-2 text-sm text-slate-100 outline-none";

  if (cargando) {
    return (
      <div className="anim-rise space-y-4">
        <div className="jarvis-panel p-10 text-center font-mono text-xs tracking-widest text-cyan-200/70">SINCRONIZANDO CON EL NÚCLEO…</div>
      </div>
    );
  }
  if (noExiste || !cliente) {
    return (
      <div className="anim-rise jarvis-panel space-y-2 p-10 text-center">
        <p className="text-sm font-semibold text-slate-200">Cliente no encontrado.</p>
        <Link to="/clientes" className="text-sm text-cyan-300 hover:text-cyan-100">Volver a clientes</Link>
      </div>
    );
  }

  const st = estadoCobertura(cliente);
  const cara: Cara = st.cara;

  return (
    <div className="anim-rise space-y-4">
      <button onClick={() => navigate("/clientes")} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-cyan-200">
        <ArrowLeft size={14} /> Volver a clientes
      </button>

      {/* cabecera */}
      <div className="jarvis-panel flex flex-wrap items-center gap-4 p-5">
        <AvatarTile color={cliente.avatarColor} iniciales={cliente.iniciales} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold text-white">{cliente.nombre}</h1>
          <p className="truncate text-sm text-slate-400">{cliente.empresa}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {cliente.fechaBaja ? (
              <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">Baja</span>
            ) : (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ESTADO_CLIENTE_STYLES[cliente.estado]}`}>
                {cliente.estado}
              </span>
            )}
            <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 font-mono text-[10px] text-slate-400" title={st.titulo}>
              {cliente.coberturaId ? `Cobertura ${cliente.coberturaId} · ${CARA_STYLE[cara].label}` : "Sin cobertura"}
            </span>
            <span className="num-display text-sm font-bold text-cyan-100">{formatEur(cliente.valor)}</span>
          </div>
        </div>
        <button
          onClick={abrirEditar}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.02] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
        >
          <Pencil size={15} /> Editar
        </button>
      </div>

      {/* KPIs del cliente */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { t: "Pipeline abierto", v: formatEur(kpis.pipe), s: `${kpis.nOps} oportunidades` },
          { t: "Ofertas activas", v: String(kpis.activas), s: `${ofertasMias.length} versiones` },
          { t: "Acciones pendientes", v: String(kpis.pendAcc), s: `${accionesMias.length} en total` },
          { t: "Último contacto", v: cliente.ultimoContacto ? fmtFecha(cliente.ultimoContacto) : "—", s: st.titulo },
        ].map((k) => (
          <div key={k.t} className="jarvis-panel p-4">
            <p className="section-title">{k.t}</p>
            <p className="num-display mt-1 truncate text-xl font-extrabold text-white">{k.v}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500" title={k.s}>{k.s}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        {/* oportunidades */}
        <section className="jarvis-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Oportunidades · {opsMias.length}</h2>
            <button
              onClick={() => {
                setFormOp({ empresa: cliente.empresa || cliente.nombre, importe: "", prioridad: "Media", probabilidad: "20" });
                setModal("oportunidad");
              }}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              <Gem size={13} /> Nueva oportunidad
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {opsMias.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/oportunidades?sel=${o.id}`}
                  className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3 transition hover:border-cyan-300/30 hover:bg-cyan-300/[.05]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-100">{o.empresa}</span>
                    <span className="font-mono text-[11px] text-slate-500">{o.etapaNombre ?? o.etapa} · {o.probabilidad}%</span>
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ESTADO_OPORTUNIDAD_STYLES[o.estado ?? "Abierta"]}`}>
                    {o.estado ?? "Abierta"}
                  </span>
                  <span className="num-display text-sm font-bold text-cyan-100">{formatEur(o.importe)}</span>
                  <ArrowRight size={14} className="shrink-0 text-slate-500" />
                </Link>
              </li>
            ))}
            {opsMias.length === 0 && <li className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">Sin oportunidades vinculadas.</li>}
          </ul>
        </section>

        {/* ofertas */}
        <section className="jarvis-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Ofertas · {ofertasMias.length}</h2>
            <button
              onClick={() => {
                setFormOf({ oportunidadId: opsMias[0]?.id ?? "", titulo: "", importe: "", fechaVencimiento: "" });
                setModal("oferta");
              }}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              <FilePlus2 size={13} /> Nueva oferta
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {ofertasMias.map((o) => (
              <li key={o.id} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3">
                <span className="rounded-md bg-white/[.06] px-1.5 py-0.5 font-mono text-[11px] font-bold text-cyan-200">v{o.numero ?? "?"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-100">{o.titulo}</span>
                  <span className="font-mono text-[11px] text-slate-500">Vence {fmtFecha(o.fechaVencimiento)}</span>
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ESTADO_OFERTA_STYLES[o.estado]}`}>
                  {o.estado}
                </span>
                <span className="num-display text-sm font-bold text-cyan-100">{formatEur(o.importe)}</span>
              </li>
            ))}
            {ofertasMias.length === 0 && <li className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">Sin ofertas. Crea primero una oportunidad.</li>}
          </ul>
        </section>
      </div>

      {/* acciones */}
      <section className="jarvis-panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Acciones · {accionesMias.length}</h2>
          <button
            onClick={() => {
              setFormAc({ tipo: "llamada", titulo: "", fecha: hoyInput(), hora: "", detalle: "" });
              setModal("accion");
            }}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
          >
            <PhoneCall size={13} /> Nueva acción
          </button>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
          {accionesMias.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-100">{a.titulo}</span>
                <span className="font-mono text-[11px] text-slate-500">{a.tipo} · {fmtFecha(a.fecha)}{a.hora ? ` ${a.hora}` : ""} · {a.estado}</span>
              </span>
            </li>
          ))}
          {accionesMias.length === 0 && <li className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">Sin acciones con este cliente.</li>}
        </ul>
      </section>

      {/* info */}
      <section className="jarvis-panel grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Contacto", v: `${cliente.email || "—"} · ${cliente.telefono || "—"}` },
          { t: "Alta / Baja", v: `${fmtFecha(cliente.fechaAlta)}${cliente.fechaBaja ? ` → ${fmtFecha(cliente.fechaBaja)}` : ""}` },
          { t: "Cobertura", v: cliente.coberturaNombre ?? (cliente.coberturaId ? `Tipo ${cliente.coberturaId}` : "Sin cobertura") },
          { t: "Registrado", v: cliente.hace || "—" },
        ].map((f) => (
          <div key={f.t}>
            <p className="section-title">{f.t}</p>
            <p className="mt-1 break-words text-sm text-slate-200">{f.v}</p>
          </div>
        ))}
      </section>

      {/* modal editar */}
      {modal === "editar" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => !guardando && (setModal(null), setConfirmandoBorrar(false))}>
          {confirmandoBorrar && cliente ? (
            <div onClick={(e) => e.stopPropagation()} className="jarvis-panel w-full max-w-md space-y-4 p-6 text-center" role="alertdialog" aria-label="Confirmar eliminación">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-300/40 bg-red-400/10 text-red-300">
                <X size={22} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">¿Seguro que quieres eliminar a {cliente.nombre}?</h2>
                <p className="mt-1 text-sm text-slate-400">Se borrará el cliente y se desvincularán sus acciones. Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmandoBorrar(false)}
                  disabled={guardando}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[.02] py-2.5 text-sm font-semibold text-slate-300 transition hover:border-cyan-300/40 hover:text-white disabled:opacity-50"
                >
                  Atrás
                </button>
                <button
                  onClick={borrarCliente}
                  disabled={guardando}
                  className="flex-1 rounded-xl border border-red-400/60 bg-red-500/20 py-2.5 text-sm font-bold tracking-wide text-red-200 transition hover:bg-red-500/30 disabled:opacity-50"
                >
                  {guardando ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </div>
          ) : (
          <form onClick={(e) => e.stopPropagation()} onSubmit={guardarCliente} className="jarvis-panel max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto p-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Editar cliente</h2>
              <button type="button" onClick={() => setModal(null)} aria-label="Cerrar"><X size={17} className="text-slate-500 hover:text-slate-200" /></button>
            </div>
            {(
              [
                { k: "nombre", label: "Nombre *", ph: "" },
                { k: "empresa", label: "Empresa", ph: "" },
                { k: "email", label: "Email", ph: "" },
                { k: "telefono", label: "Teléfono", ph: "" },
              ] as const
            ).map(({ k, label, ph }) => (
              <label key={k} className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">{label}</span>
                <input value={formCl[k]} onChange={(e) => setFormCl((f) => ({ ...f, [k]: e.target.value }))} required={k === "nombre"} placeholder={ph} className={inputCls} />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Estado</span>
                <select value={formCl.estado} onChange={(e) => setFormCl((f) => ({ ...f, estado: e.target.value as EstadoCliente }))} className={selectCls}>
                  <option>Activo</option>
                  <option>Prospecto</option>
                  <option>En seguimiento</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Valor (€)</span>
                <input type="number" min="0" value={formCl.valor} onChange={(e) => setFormCl((f) => ({ ...f, valor: e.target.value }))} className={inputCls} />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Cobertura</span>
              <select value={formCl.coberturaId} onChange={(e) => setFormCl((f) => ({ ...f, coberturaId: e.target.value }))} className={selectCls}>
                <option value="">Sin cobertura</option>
                {coberturas.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Fecha de alta</span>
                <input type="date" value={formCl.fechaAlta} onChange={(e) => setFormCl((f) => ({ ...f, fechaAlta: e.target.value }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Fecha de baja</span>
                <input type="date" value={formCl.fechaBaja} onChange={(e) => setFormCl((f) => ({ ...f, fechaBaja: e.target.value }))} className={inputCls} />
              </label>
            </div>
            <button type="submit" disabled={guardando} className="w-full rounded-xl border border-cyan-300/40 bg-cyan-300/10 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50">
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoBorrar(true)}
              disabled={guardando}
              className="w-full rounded-xl border border-red-300/20 py-2.5 text-sm font-semibold text-red-300/80 transition hover:border-red-300/50 hover:text-red-200 disabled:opacity-50"
            >
              Eliminar cliente
            </button>
          </form>
          )}
        </div>
      )}

      {/* modal nueva oportunidad */}
      {modal === "oportunidad" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => !guardando && setModal(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={crearOportunidad} className="jarvis-panel w-full max-w-md space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Nueva oportunidad</h2>
              <button type="button" onClick={() => setModal(null)} aria-label="Cerrar"><X size={17} className="text-slate-500 hover:text-slate-200" /></button>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Empresa *</span>
              <input value={formOp.empresa} onChange={(e) => setFormOp((f) => ({ ...f, empresa: e.target.value }))} required className={inputCls} />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Importe</span>
                <input type="number" min="0" value={formOp.importe} onChange={(e) => setFormOp((f) => ({ ...f, importe: e.target.value }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Prioridad</span>
                <select value={formOp.prioridad} onChange={(e) => setFormOp((f) => ({ ...f, prioridad: e.target.value }))} className={selectCls}>
                  <option>Alta</option>
                  <option>Media</option>
                  <option>Baja</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Prob. %</span>
                <input type="number" min="0" max="100" value={formOp.probabilidad} onChange={(e) => setFormOp((f) => ({ ...f, probabilidad: e.target.value }))} className={inputCls} />
              </label>
            </div>
            <button type="submit" disabled={guardando} className="w-full rounded-xl border border-cyan-300/40 bg-cyan-300/10 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50">
              {guardando ? "Guardando…" : "Crear en Prospección"}
            </button>
          </form>
        </div>
      )}

      {/* modal nueva oferta */}
      {modal === "oferta" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => !guardando && setModal(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={crearOferta} className="jarvis-panel w-full max-w-md space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Nueva oferta</h2>
              <button type="button" onClick={() => setModal(null)} aria-label="Cerrar"><X size={17} className="text-slate-500 hover:text-slate-200" /></button>
            </div>
            {opsMias.length === 0 ? (
              <p className="text-sm text-slate-400">Primero crea una oportunidad para este cliente.</p>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">Oportunidad</span>
                  <select value={formOf.oportunidadId} onChange={(e) => setFormOf((f) => ({ ...f, oportunidadId: e.target.value }))} className={selectCls}>
                    {opsMias.map((o) => (
                      <option key={o.id} value={o.id}>{o.empresa} · {formatEur(o.importe)} · {o.estado ?? "Abierta"}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">Título *</span>
                  <input value={formOf.titulo} onChange={(e) => setFormOf((f) => ({ ...f, titulo: e.target.value }))} required placeholder="Ej. Propuesta comercial" className={inputCls} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-400">Importe</span>
                    <input type="number" min="0" value={formOf.importe} onChange={(e) => setFormOf((f) => ({ ...f, importe: e.target.value }))} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-400">Vence</span>
                    <input type="date" value={formOf.fechaVencimiento} onChange={(e) => setFormOf((f) => ({ ...f, fechaVencimiento: e.target.value }))} className={inputCls} />
                  </label>
                </div>
                <button type="submit" disabled={guardando} className="w-full rounded-xl border border-cyan-300/40 bg-cyan-300/10 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50">
                  {guardando ? "Guardando…" : "Crear versión en Borrador"}
                </button>
              </>
            )}
          </form>
        </div>
      )}

      {/* modal nueva acción */}
      {modal === "accion" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => !guardando && setModal(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={crearAccion} className="jarvis-panel w-full max-w-md space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Nueva acción · {cliente.nombre}</h2>
              <button type="button" onClick={() => setModal(null)} aria-label="Cerrar"><X size={17} className="text-slate-500 hover:text-slate-200" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Tipo</span>
                <select value={formAc.tipo} onChange={(e) => setFormAc((f) => ({ ...f, tipo: e.target.value as TipoAccion }))} className={selectCls}>
                  <option value="llamada">Llamada</option>
                  <option value="reunion">Reunión</option>
                  <option value="visita">Visita</option>
                  <option value="tarea">Tarea</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Fecha</span>
                <input type="date" value={formAc.fecha} onChange={(e) => setFormAc((f) => ({ ...f, fecha: e.target.value }))} className={inputCls} />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Título</span>
              <input value={formAc.titulo} onChange={(e) => setFormAc((f) => ({ ...f, titulo: e.target.value }))} placeholder="Se genera solo si lo dejas vacío" className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Hora</span>
                <input type="time" value={formAc.hora} onChange={(e) => setFormAc((f) => ({ ...f, hora: e.target.value }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Detalle</span>
                <input value={formAc.detalle} onChange={(e) => setFormAc((f) => ({ ...f, detalle: e.target.value }))} placeholder="Notas…" className={inputCls} />
              </label>
            </div>
            <button type="submit" disabled={guardando} className="w-full rounded-xl border border-cyan-300/40 bg-cyan-300/10 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50">
              {guardando ? "Guardando…" : "Crear pendiente"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
