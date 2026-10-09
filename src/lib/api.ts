// Cliente HTTP para la API local (Express + SQLite).
// En dev, Vite proxea /api -> http://localhost:3001 (ver vite.config.ts).
// En prod, el propio server sirve dist/ + /api en el mismo puerto.

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error(`API ${res.status} en ${path}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => req<{ ok: boolean; db: string }>("/api/health"),
  kpiCards: () => req<import("../data/mockData").KpiCard[]>("/api/kpi-cards"),
  ventasMensuales: () => req<import("../data/mockData").VentaMensual[]>("/api/ventas-mensuales"),
  kpisCirculares: () => req<import("../data/mockData").KpiCircular[]>("/api/kpis-circulares"),
  etapas: () => req<import("../data/mockData").EtapaPipeline[]>("/api/pipeline-etapas"),
  clientes: () => req<import("../data/mockData").Cliente[]>("/api/clientes"),
  cliente: (id: string) => req<import("../data/mockData").Cliente>(`/api/clientes/${id}`),
  borrarCliente: (id: string) => fetch(`/api/clientes/${id}`, { method: "DELETE" }),
  coberturas: () => req<import("../data/mockData").Cobertura[]>("/api/coberturas"),
  empresas: () => req<import("../data/mockData").Empresa[]>("/api/empresas"),
  contactos: () => req<import("../data/mockData").Contacto[]>("/api/contactos"),
  actividades: () => req<import("../data/mockData").Actividad[]>("/api/actividades"),
  acciones: () => req<import("../data/mockData").Accion[]>("/api/acciones"),
  crearAccion: (body: {
    titulo?: string;
    tipo: string;
    estado?: string;
    fecha?: string;
    hora?: string;
    duracionMin?: number;
    empresa?: string;
    clienteId?: string | null;
    detalle?: string;
    prioridad?: string;
    responsable?: string;
  }) =>
    req<import("../data/mockData").Accion>("/api/acciones", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  editarAccion: (id: string, body: Record<string, unknown>) =>
    req<import("../data/mockData").Accion>(`/api/acciones/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  estadoAccion: (id: string, estado: string) =>
    req<import("../data/mockData").Accion>(`/api/acciones/${id}/estado`, {
      method: "POST",
      body: JSON.stringify({ estado }),
    }),
  borrarAccion: (id: string) => fetch(`/api/acciones/${id}`, { method: "DELETE" }),
  fotosDe: (accionId: string) => req<import("../data/mockData").AccionFoto[]>(`/api/acciones/${accionId}/fotos`),
  subirFoto: (accionId: string, nombre: string, mime: string, base64: string) =>
    req<import("../data/mockData").AccionFoto>(`/api/acciones/${accionId}/fotos`, {
      method: "POST",
      body: JSON.stringify({ nombre, mime, base64 }),
    }),
  borrarFoto: (fotoId: string) => fetch(`/api/fotos/${fotoId}`, { method: "DELETE" }),
  notificaciones: () => req<import("../data/mockData").Notificacion[]>("/api/notificaciones"),
  search: (q: string) =>
    req<{ id: string; tipo: string; titulo: string; subtitulo: string; to: string }[]>(`/api/search?q=${encodeURIComponent(q)}`),

  moverOportunidad: (id: string, etapa: string) =>
    req<import("../data/mockData").Oportunidad>(`/api/oportunidades/${id}`, {
      method: "PUT",
      body: JSON.stringify({ etapa }),
    }),
  registrarContacto: (id: string) =>
    req<import("../data/mockData").Cliente>(`/api/clientes/${id}/contacto`, { method: "POST" }),

  oportunidades: () => req<import("../data/mockData").Oportunidad[]>("/api/oportunidades"),
  crearOportunidad: (body: { empresa: string; importe?: number; prioridad?: string; etapa?: string; probabilidad?: number }) =>
    req<import("../data/mockData").Oportunidad>("/api/oportunidades", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  ofertas: (oportunidadId?: string) =>
    req<import("../data/mockData").Oferta[]>(oportunidadId ? `/api/ofertas?oportunidadId=${oportunidadId}` : "/api/ofertas"),
  ofertasDe: (oportunidadId: string) => req<import("../data/mockData").Oferta[]>(`/api/oportunidades/${oportunidadId}/ofertas`),
  crearOferta: (oportunidadId: string, body: { titulo: string; importe?: number; fechaVencimiento?: string; notas?: string }) =>
    req<import("../data/mockData").Oferta>(`/api/oportunidades/${oportunidadId}/ofertas`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  activarOferta: (id: string) => req<{ oferta: import("../data/mockData").Oferta; oportunidad: import("../data/mockData").Oportunidad }>(`/api/ofertas/${id}/activar`, { method: "PUT" }),
  estadoOferta: (id: string, estado: string) =>
    req<{ oferta: import("../data/mockData").Oferta; oportunidad: import("../data/mockData").Oportunidad }>(`/api/ofertas/${id}/estado`, {
      method: "PUT",
      body: JSON.stringify({ estado }),
    }),
  cerrarOportunidad: (id: string, resultado: "Ganada" | "Perdida", motivo?: string) =>
    req<import("../data/mockData").Oportunidad>(`/api/oportunidades/${id}/cerrar`, {
      method: "POST",
      body: JSON.stringify({ resultado, motivo }),
    }),
  reabrirOportunidad: (id: string) => req<import("../data/mockData").Oportunidad>(`/api/oportunidades/${id}/reabrir`, { method: "POST" }),

  crearEtapa: (body: { nombre: string; color?: string }) =>
    req<import("../data/mockData").EtapaPipeline>("/api/pipeline-etapas", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  editarEtapa: (id: string, body: { nombre?: string; color?: string }) =>
    req<import("../data/mockData").EtapaPipeline>(`/api/pipeline-etapas/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  borrarEtapa: (id: string) => fetch(`/api/pipeline-etapas/${id}`, { method: "DELETE" }),
  crearCobertura: (body: { id: string; nombre: string; llamadasCadaMeses?: number; visitasAlAno?: number; descripcion?: string }) =>
    req<import("../data/mockData").Cobertura>("/api/coberturas", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  editarCobertura: (id: string, body: Record<string, unknown>) =>
    req<import("../data/mockData").Cobertura>(`/api/coberturas/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  borrarCobertura: (id: string) => fetch(`/api/coberturas/${id}`, { method: "DELETE" }),
};
