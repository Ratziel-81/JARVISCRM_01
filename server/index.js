import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, DB_PATH } from "./db.js";
import { cerebro, dormirIA, estadoIA, voz } from "./ia.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: "10mb" })); // las fotos viajan en base64

const camel = (row) =>
  Object.fromEntries(
    Object.entries(row ?? {}).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      k === "spark" && typeof v === "string" ? JSON.parse(v) : v,
    ]),
  );
const rows = (table, order = "rowid") =>
  db.prepare(`SELECT * FROM ${table} ORDER BY ${order}`).all().map(camel);

// cliente + datos de su cobertura (para las caritas)
const clienteConCobertura = (id) =>
  camel(
    db
      .prepare(
        `SELECT c.*, co.nombre AS cobertura_nombre, co.llamadas_cada_meses, co.visitas_al_ano, co.descripcion AS cobertura_descripcion
         FROM clientes c LEFT JOIN coberturas co ON co.id = c.cobertura_id WHERE c.id = ?`,
      )
      .get(id),
  );
const todosLosClientes = () =>
  db
    .prepare(
      `SELECT c.*, co.nombre AS cobertura_nombre, co.llamadas_cada_meses, co.visitas_al_ano, co.descripcion AS cobertura_descripcion
       FROM clientes c LEFT JOIN coberturas co ON co.id = c.cobertura_id ORDER BY c.rowid`,
    )
    .all()
    .map(camel);

// ---------- salud ----------
app.get("/api/health", (_req, res) => res.json({ ok: true, db: DB_PATH }));

// ---------- lecturas ----------
app.get("/api/kpi-cards", (_req, res) => res.json(rows("kpi_cards")));
app.get("/api/ventas-mensuales", (_req, res) => res.json(rows("ventas_mensuales")));
app.get("/api/kpis-circulares", (_req, res) => res.json(rows("kpis_circulares")));
app.get("/api/pipeline-etapas", (_req, res) => res.json(rows("pipeline_stages")));
app.get("/api/oportunidades", (_req, res) => {
  res.json(
    db
      .prepare(
        `SELECT op.*, ps.nombre AS etapa_nombre,
          (SELECT COUNT(*) FROM ofertas o WHERE o.oportunidad_id = op.id) AS num_ofertas
         FROM oportunidades op LEFT JOIN pipeline_stages ps ON ps.id = op.etapa ORDER BY op.rowid`,
      )
      .all()
      .map(camel),
  );
});
app.get("/api/clientes", (_req, res) => res.json(todosLosClientes()));
app.get("/api/empresas", (_req, res) => res.json(rows("empresas")));
app.get("/api/contactos", (_req, res) => res.json(rows("contactos")));
app.get("/api/ofertas", (_req, res) => res.json(rows("ofertas")));
app.get("/api/actividades", (_req, res) => res.json(rows("actividades")));
// acciones con cliente vinculado y nº de fotos; pendientes primero
app.get("/api/acciones", (_req, res) => {
  res.json(
    db
      .prepare(
        `SELECT a.*, c.nombre AS cliente_nombre,
          (SELECT COUNT(*) FROM accion_fotos f WHERE f.accion_id = a.id) AS num_fotos
         FROM acciones a LEFT JOIN clientes c ON c.id = a.cliente_id
         ORDER BY CASE a.estado WHEN 'Pendiente' THEN 0 WHEN 'Hecha' THEN 1 ELSE 2 END, a.fecha, a.hora`,
      )
      .all()
      .map(camel),
  );
});
app.get("/api/notificaciones", (_req, res) => res.json(rows("notificaciones")));

// ---------- búsqueda global (Topbar) ----------
app.get("/api/search", (req, res) => {
  const q = `%${String(req.query.q ?? "").toLowerCase()}%`;
  if (String(req.query.q ?? "").trim().length < 2) return res.json([]);
  const clientes = db
    .prepare("SELECT id, 'Cliente' AS tipo, nombre AS titulo, empresa AS subtitulo FROM clientes WHERE lower(nombre) LIKE ? OR lower(empresa) LIKE ? LIMIT 7")
    .all(q, q);
  const empresas = db
    .prepare("SELECT id, 'Empresa' AS tipo, nombre AS titulo, sector AS subtitulo FROM empresas WHERE lower(nombre) LIKE ? LIMIT 7")
    .all(q);
  const ops = db
    .prepare("SELECT id, 'Oportunidad' AS tipo, empresa AS titulo, ('€' || importe) AS subtitulo FROM oportunidades WHERE lower(empresa) LIKE ? LIMIT 7")
    .all(q);
  res.json(
    [...clientes, ...empresas, ...ops].slice(0, 7).map((r) => ({
      ...r,
      to: r.tipo === "Oportunidad" ? "/oportunidades" : "/clientes",
    })),
  );
});

// ---------- escrituras ----------
const newId = (p) => `${p}-${Date.now().toString(36)}`;
// acepta claves camelCase (frontend) o snake_case (BD)
const pick = (b, camelKey, snakeKey, fb = undefined) => b[camelKey] ?? b[snakeKey] ?? fb;
const hoyISO = () => new Date().toISOString().slice(0, 10);

app.get("/api/coberturas", (_req, res) => res.json(rows("coberturas")));

app.post("/api/clientes", (req, res) => {
  const b = req.body ?? {};
  if (!b.nombre?.trim()) return res.status(400).json({ error: "nombre requerido" });
  const row = {
    id: b.id ?? newId("c"),
    nombre: b.nombre.trim(),
    empresa: b.empresa ?? "",
    email: b.email ?? "",
    telefono: b.telefono ?? "",
    estado: b.estado ?? "Prospecto",
    hace: "ahora mismo",
    avatar_color: b.avatarColor ?? b.avatar_color ?? "#0ea5e9",
    iniciales: b.iniciales ?? b.nombre.trim().slice(0, 2).toUpperCase(),
    valor: Number(b.valor ?? 0),
    cobertura_id: pick(b, "coberturaId", "cobertura_id", null) || null,
    fecha_alta: pick(b, "fechaAlta", "fecha_alta", hoyISO()),
    fecha_baja: pick(b, "fechaBaja", "fecha_baja", null),
    ultimo_contacto: pick(b, "ultimoContacto", "ultimo_contacto", null),
  };
  db.prepare(
    "INSERT INTO clientes (id,nombre,empresa,email,telefono,estado,hace,avatar_color,iniciales,valor,cobertura_id,fecha_alta,fecha_baja,ultimo_contacto) VALUES (@id,@nombre,@empresa,@email,@telefono,@estado,@hace,@avatar_color,@iniciales,@valor,@cobertura_id,@fecha_alta,@fecha_baja,@ultimo_contacto)",
  ).run(row);
  res.status(201).json(clienteConCobertura(row.id));
});

app.put("/api/clientes/:id", (req, res) => {
  const cur = db.prepare("SELECT * FROM clientes WHERE id=?").get(req.params.id);
  if (!cur) return res.status(404).json({ error: "no encontrado" });
  const b = req.body ?? {};
  const row = {
    nombre: b.nombre ?? cur.nombre,
    empresa: b.empresa ?? cur.empresa,
    email: b.email ?? cur.email,
    telefono: b.telefono ?? cur.telefono,
    estado: b.estado ?? cur.estado,
    valor: b.valor !== undefined ? Number(b.valor) : cur.valor,
    cobertura_id: ("coberturaId" in b || "cobertura_id" in b ? pick(b, "coberturaId", "cobertura_id", null) || null : cur.cobertura_id),
    fecha_alta: pick(b, "fechaAlta", "fecha_alta", cur.fecha_alta),
    fecha_baja: ("fechaBaja" in b || "fecha_baja" in b ? pick(b, "fechaBaja", "fecha_baja", null) : cur.fecha_baja),
    ultimo_contacto: ("ultimoContacto" in b || "ultimo_contacto" in b ? pick(b, "ultimoContacto", "ultimo_contacto", null) : cur.ultimo_contacto),
    id: req.params.id,
  };
  db.prepare(
    "UPDATE clientes SET nombre=@nombre,empresa=@empresa,email=@email,telefono=@telefono,estado=@estado,valor=@valor,cobertura_id=@cobertura_id,fecha_alta=@fecha_alta,fecha_baja=@fecha_baja,ultimo_contacto=@ultimo_contacto WHERE id=@id",
  ).run(row);
  res.json(clienteConCobertura(req.params.id));
});

// registrar contacto de hoy (pone la carita en verde)
app.post("/api/clientes/:id/contacto", (req, res) => {
  const cur = db.prepare("SELECT * FROM clientes WHERE id=?").get(req.params.id);
  if (!cur) return res.status(404).json({ error: "no encontrado" });
  const hoy = hoyISO();
  db.prepare("UPDATE clientes SET ultimo_contacto=@hoy, hace='ahora mismo' WHERE id=@id").run({ hoy, id: req.params.id });
  res.json(clienteConCobertura(req.params.id));
});

app.delete("/api/clientes/:id", (req, res) => {
  db.prepare("DELETE FROM clientes WHERE id=?").run(req.params.id);
  res.status(204).end();
});

app.post("/api/oportunidades", (req, res) => {
  const b = req.body ?? {};
  if (!b.empresa?.trim()) return res.status(400).json({ error: "empresa requerida" });
  const row = {
    id: b.id ?? newId("op"),
    empresa: b.empresa.trim(),
    importe: Number(b.importe ?? 0),
    prioridad: b.prioridad ?? "Media",
    etapa: b.etapa ?? "prospeccion",
    avatar_color: b.avatarColor ?? b.avatar_color ?? "#0ea5e9",
    iniciales: b.iniciales ?? b.empresa.trim().slice(0, 2).toUpperCase(),
    probabilidad: Number(b.probabilidad ?? 10),
    estado: "Abierta",
    oferta_activa_id: null,
    fecha_cierre: null,
    motivo: "",
  };
  db.prepare(
    "INSERT INTO oportunidades (id,empresa,importe,prioridad,etapa,avatar_color,iniciales,probabilidad,estado,oferta_activa_id,fecha_cierre,motivo) VALUES (@id,@empresa,@importe,@prioridad,@etapa,@avatar_color,@iniciales,@probabilidad,@estado,@oferta_activa_id,@fecha_cierre,@motivo)",
  ).run(row);
  res.status(201).json(camel(row));
});

// mover etapa del pipeline (drag & drop) o editar campos
// (el estado y la oferta activa se gestionan con el flujo: activar / estado / cerrar)
app.put("/api/oportunidades/:id", (req, res) => {
  const cur = db.prepare("SELECT * FROM oportunidades WHERE id=?").get(req.params.id);
  if (!cur) return res.status(404).json({ error: "no encontrada" });
  const b = req.body ?? {};
  if (b.estado !== undefined || b.oferta_activa_id !== undefined || b.ofertaActivaId !== undefined) {
    return res.status(409).json({ error: "usa /activar, /estado, /cerrar o /reabrir para el ciclo de vida" });
  }
  const row = {
    empresa: b.empresa ?? cur.empresa,
    importe: b.importe !== undefined ? Number(b.importe) : cur.importe,
    prioridad: b.prioridad ?? cur.prioridad,
    etapa: b.etapa ?? cur.etapa,
    probabilidad: b.probabilidad !== undefined ? Number(b.probabilidad) : cur.probabilidad,
    id: req.params.id,
  };
  db.prepare("UPDATE oportunidades SET empresa=@empresa,importe=@importe,prioridad=@prioridad,etapa=@etapa,probabilidad=@probabilidad WHERE id=@id").run(row);
  res.json(camel(db.prepare("SELECT * FROM oportunidades WHERE id=?").get(req.params.id)));
});

app.delete("/api/oportunidades/:id", (req, res) => {
  db.prepare("DELETE FROM oportunidades WHERE id=?").run(req.params.id);
  res.status(204).end();
});

// ---------- ofertas: viven dentro de la oportunidad, versionadas ----------
// Solo una activa por oportunidad (oportunidades.oferta_activa_id), que sincroniza sus valores.
const ESTADOS_OFERTA = ["Borrador", "Enviada", "Aceptada", "Rechazada", "Descartada", "Expirada"];
const TRANSICIONES_OFERTA = {
  Borrador: ["Enviada", "Descartada"],
  Enviada: ["Aceptada", "Rechazada", "Expirada", "Descartada"],
  Aceptada: [],
  Rechazada: [],
  Descartada: [],
  Expirada: [],
};
const ofertaDe = (id) => db.prepare("SELECT * FROM ofertas WHERE id=?").get(id);
const oportunidadDe = (id) => db.prepare("SELECT * FROM oportunidades WHERE id=?").get(id);

// la oportunidad hereda los valores de su oferta activa
function sincronizarOportunidad(opId) {
  const op = oportunidadDe(opId);
  if (!op?.oferta_activa_id) return op;
  const of = ofertaDe(op.oferta_activa_id);
  if (!of) return op;
  const etapa = ["prospeccion", "contacto"].includes(op.etapa) ? "propuesta" : op.etapa;
  db.prepare("UPDATE oportunidades SET importe=@imp, etapa=@etapa WHERE id=@id").run({ imp: of.importe, etapa, id: opId });
  return oportunidadDe(opId);
}

const ofertaConOp = (id) =>
  camel(
    db
      .prepare(
        "SELECT o.*, op.empresa AS oportunidad_empresa FROM ofertas o LEFT JOIN oportunidades op ON op.id = o.oportunidad_id WHERE o.id = ?",
      )
      .get(id),
  );

app.get("/api/ofertas", (req, res) => {
  const opId = req.query.oportunidadId;
  const list = opId
    ? db.prepare("SELECT * FROM ofertas WHERE oportunidad_id=? ORDER BY numero").all(opId)
    : db
        .prepare(
          "SELECT o.*, op.empresa AS oportunidad_empresa FROM ofertas o LEFT JOIN oportunidades op ON op.id = o.oportunidad_id ORDER BY o.oportunidad_id, o.numero",
        )
        .all();
  res.json(list.map(camel));
});

app.get("/api/oportunidades/:id/ofertas", (req, res) => {
  if (!oportunidadDe(req.params.id)) return res.status(404).json({ error: "oportunidad no encontrada" });
  res.json(db.prepare("SELECT * FROM ofertas WHERE oportunidad_id=? ORDER BY numero").all(req.params.id).map(camel));
});

function crearOferta(opId, b, res) {
  const op = oportunidadDe(opId);
  if (!op) return res.status(404).json({ error: "oportunidad no encontrada" });
  if (op.estado !== "Abierta") return res.status(409).json({ error: `oportunidad ${op.estado.toLowerCase()}, no admite nuevas versiones` });
  if (!b.titulo?.trim()) return res.status(400).json({ error: "titulo requerido" });
  const numero = db.prepare("SELECT COALESCE(MAX(numero),0) AS m FROM ofertas WHERE oportunidad_id=?").get(opId).m + 1;
  const row = {
    id: b.id ?? newId("of"),
    oportunidad_id: opId,
    numero,
    titulo: b.titulo.trim(),
    importe: Number(b.importe ?? op.importe ?? 0),
    prioridad: b.prioridad ?? op.prioridad ?? "Media",
    estado: "Borrador",
    fecha_envio: null,
    fecha_vencimiento: pick(b, "fechaVencimiento", "fecha_vencimiento", null),
    notas: b.notas ?? "",
  };
  db.prepare(
    "INSERT INTO ofertas (id,oportunidad_id,numero,titulo,importe,prioridad,estado,fecha_envio,fecha_vencimiento,notas) VALUES (@id,@oportunidad_id,@numero,@titulo,@importe,@prioridad,@estado,@fecha_envio,@fecha_vencimiento,@notas)",
  ).run(row);
  res.status(201).json(ofertaConOp(row.id));
}

app.post("/api/oportunidades/:id/ofertas", (req, res) => crearOferta(req.params.id, req.body ?? {}, res));
app.post("/api/ofertas", (req, res) => {
  const b = req.body ?? {};
  const opId = b.oportunidadId ?? b.oportunidad_id;
  if (!opId) return res.status(400).json({ error: "oportunidadId requerida: las ofertas viven dentro de una oportunidad" });
  crearOferta(opId, b, res);
});

// activar = sincronizar: pasa a ser LA oferta activa y la oportunidad hereda sus valores
app.put("/api/ofertas/:id/activar", (req, res) => {
  const of = ofertaDe(req.params.id);
  if (!of) return res.status(404).json({ error: "oferta no encontrada" });
  const op = oportunidadDe(of.oportunidad_id);
  if (!op) return res.status(409).json({ error: "oferta huérfana" });
  if (op.estado !== "Abierta") return res.status(409).json({ error: `oportunidad ${op.estado.toLowerCase()}` });
  if (!["Borrador", "Enviada"].includes(of.estado)) {
    return res.status(409).json({ error: `una oferta ${of.estado.toLowerCase()} no puede activarse` });
  }
  db.prepare("UPDATE oportunidades SET oferta_activa_id=? WHERE id=?").run(of.id, op.id);
  const actualizada = sincronizarOportunidad(op.id);
  res.json({ oferta: ofertaConOp(of.id), oportunidad: camel(actualizada) });
});

// máquina de estados de la oferta
app.put("/api/ofertas/:id/estado", (req, res) => {
  const of = ofertaDe(req.params.id);
  if (!of) return res.status(404).json({ error: "oferta no encontrada" });
  const op = oportunidadDe(of.oportunidad_id);
  const next = req.body?.estado;
  if (!ESTADOS_OFERTA.includes(next)) return res.status(400).json({ error: `estado inválido (usa: ${ESTADOS_OFERTA.join(", ")})` });
  if (!(TRANSICIONES_OFERTA[of.estado] ?? []).includes(next)) {
    const terminal = ["Aceptada", "Rechazada", "Descartada", "Expirada"].includes(of.estado);
    return res.status(409).json({ error: `transición ${of.estado} → ${next} no permitida${terminal ? ": crea una nueva versión" : ""}` });
  }
  if (op && op.estado !== "Abierta") return res.status(409).json({ error: `oportunidad ${op.estado.toLowerCase()}` });
  const hoy = hoyISO();
  db.prepare("UPDATE ofertas SET estado=@estado, fecha_envio=@env WHERE id=@id").run({
    estado: next,
    env: next === "Enviada" && !of.fecha_envio ? hoy : of.fecha_envio,
    id: of.id,
  });
  let oportunidad = op ? camel(op) : null;
  if (next === "Aceptada" && op) {
    // la ganadora se activa y la oportunidad queda Terminada (Ganada) con sus valores
    db.prepare("UPDATE oportunidades SET oferta_activa_id=?, estado='Ganada', etapa='cierre', probabilidad=100, fecha_cierre=?, motivo='' WHERE id=?").run(of.id, hoy, op.id);
    sincronizarOportunidad(op.id);
    oportunidad = camel(oportunidadDe(op.id));
  }
  if (["Rechazada", "Expirada", "Descartada"].includes(next) && op && op.oferta_activa_id === of.id) {
    db.prepare("UPDATE oportunidades SET oferta_activa_id=NULL WHERE id=?").run(op.id);
    oportunidad = camel(oportunidadDe(op.id));
  }
  res.json({ oferta: ofertaConOp(of.id), oportunidad });
});

// edición de borrador (lo enviado no se edita: se versiona)
app.put("/api/ofertas/:id", (req, res) => {
  const of = ofertaDe(req.params.id);
  if (!of) return res.status(404).json({ error: "oferta no encontrada" });
  if (of.estado !== "Borrador") return res.status(409).json({ error: `una oferta ${of.estado.toLowerCase()} no se edita: crea una nueva versión` });
  const b = req.body ?? {};
  if (b.estado && b.estado !== of.estado) return res.status(409).json({ error: "el estado se cambia desde /estado" });
  db.prepare("UPDATE ofertas SET titulo=@titulo, importe=@importe, prioridad=@prioridad, fecha_vencimiento=@venc, notas=@notas WHERE id=@id").run({
    titulo: b.titulo ?? of.titulo,
    importe: b.importe !== undefined ? Number(b.importe) : of.importe,
    prioridad: b.prioridad ?? of.prioridad,
    venc: pick(b, "fechaVencimiento", "fecha_vencimiento", of.fecha_vencimiento),
    notas: b.notas ?? of.notas,
    id: of.id,
  });
  res.json(ofertaConOp(of.id));
});

app.delete("/api/ofertas/:id", (req, res) => {
  const of = ofertaDe(req.params.id);
  if (!of) return res.status(404).json({ error: "oferta no encontrada" });
  if (of.estado !== "Borrador") return res.status(409).json({ error: "solo se puede borrar un borrador" });
  const op = oportunidadDe(of.oportunidad_id);
  if (op?.oferta_activa_id === of.id) db.prepare("UPDATE oportunidades SET oferta_activa_id=NULL WHERE id=?").run(op.id);
  db.prepare("DELETE FROM ofertas WHERE id=?").run(of.id);
  res.status(204).end();
});

// cierre de la oportunidad: Terminada (Ganada o Perdida)
app.post("/api/oportunidades/:id/cerrar", (req, res) => {
  const op = oportunidadDe(req.params.id);
  if (!op) return res.status(404).json({ error: "oportunidad no encontrada" });
  if (op.estado !== "Abierta") return res.status(409).json({ error: `ya está ${op.estado.toLowerCase()}` });
  const { resultado, motivo } = req.body ?? {};
  const hoy = hoyISO();
  if (resultado === "Ganada") {
    if (!op.oferta_activa_id) return res.status(409).json({ error: "para ganar necesitas una oferta activa" });
    db.prepare("UPDATE ofertas SET estado='Aceptada', fecha_envio=COALESCE(fecha_envio, @hoy) WHERE id=@id").run({ hoy, id: op.oferta_activa_id });
    db.prepare("UPDATE oportunidades SET estado='Ganada', etapa='cierre', probabilidad=100, fecha_cierre=@hoy, motivo='' WHERE id=@id").run({ hoy, id: op.id });
    sincronizarOportunidad(op.id);
  } else if (resultado === "Perdida") {
    const act = op.oferta_activa_id ? ofertaDe(op.oferta_activa_id) : null;
    if (act && ["Borrador", "Enviada"].includes(act.estado)) {
      db.prepare("UPDATE ofertas SET estado='Rechazada' WHERE id=?").run(act.id);
    }
    db.prepare("UPDATE oportunidades SET estado='Perdida', probabilidad=0, fecha_cierre=@hoy, motivo=@motivo, oferta_activa_id=NULL WHERE id=@id").run({
      hoy,
      motivo: motivo ?? "",
      id: op.id,
    });
  } else {
    return res.status(400).json({ error: "resultado: Ganada o Perdida" });
  }
  res.json(camel(oportunidadDe(op.id)));
});

app.post("/api/oportunidades/:id/reabrir", (req, res) => {
  const op = oportunidadDe(req.params.id);
  if (!op) return res.status(404).json({ error: "oportunidad no encontrada" });
  if (op.estado === "Abierta") return res.status(409).json({ error: "ya está abierta" });
  db.prepare("UPDATE oportunidades SET estado='Abierta', fecha_cierre=NULL, motivo='' WHERE id=?").run(op.id);
  res.json(camel(oportunidadDe(op.id)));
});

// ---------- acciones comerciales: llamada | reunion | visita | tarea ----------
const TIPOS_ACCION = ["llamada", "reunion", "visita", "tarea"];
const ESTADOS_ACCION = ["Pendiente", "Hecha", "Cancelada"];
const accionDe = (id) =>
  camel(
    db
      .prepare(
        `SELECT a.*, c.nombre AS cliente_nombre,
          (SELECT COUNT(*) FROM accion_fotos f WHERE f.accion_id = a.id) AS num_fotos
         FROM acciones a LEFT JOIN clientes c ON c.id = a.cliente_id WHERE a.id = ?`,
      )
      .get(id),
  );

app.post("/api/acciones", (req, res) => {
  const b = req.body ?? {};
  const tipo = b.tipo ?? "tarea";
  if (!TIPOS_ACCION.includes(tipo)) return res.status(400).json({ error: `tipo inválido (usa: ${TIPOS_ACCION.join(", ")})` });
  const estado = b.estado ?? "Pendiente";
  if (!ESTADOS_ACCION.includes(estado)) return res.status(400).json({ error: `estado inválido (usa: ${ESTADOS_ACCION.join(", ")})` });
  const empresa = b.empresa ?? "";
  const TIPO_LABEL = { llamada: "Llamada", reunion: "Reunión", visita: "Visita", tarea: "Tarea" };
  const duracion = Math.min(480, Math.max(15, Number(b.duracionMin ?? b.duracion_min ?? 60) || 60));
  const PRIORIDADES = ["Alta", "Media", "Baja"];
  const prioridad = PRIORIDADES.includes(b.prioridad) ? b.prioridad : "Media";
  const row = {
    id: b.id ?? newId("ac"),
    titulo: b.titulo?.trim() || `${TIPO_LABEL[tipo]}${empresa ? ` · ${empresa}` : ""}`,
    tipo,
    estado,
    fecha: b.fecha ?? hoyISO(),
    hora: b.hora ?? "",
    duracion_min: duracion,
    empresa,
    cliente_id: b.clienteId ?? b.cliente_id ?? null,
    detalle: b.detalle ?? "",
    prioridad,
    responsable: b.responsable ?? "",
  };
  db.prepare(
    "INSERT INTO acciones (id,titulo,tipo,estado,fecha,hora,duracion_min,empresa,cliente_id,detalle,prioridad,responsable) VALUES (@id,@titulo,@tipo,@estado,@fecha,@hora,@duracion_min,@empresa,@cliente_id,@detalle,@prioridad,@responsable)",
  ).run(row);
  res.status(201).json(accionDe(row.id));
});

app.put("/api/acciones/:id", (req, res) => {
  const cur = db.prepare("SELECT * FROM acciones WHERE id=?").get(req.params.id);
  if (!cur) return res.status(404).json({ error: "acción no encontrada" });
  const b = req.body ?? {};
  if (b.tipo !== undefined && !TIPOS_ACCION.includes(b.tipo)) return res.status(400).json({ error: "tipo inválido" });
  if (b.estado !== undefined && !ESTADOS_ACCION.includes(b.estado)) return res.status(400).json({ error: "estado inválido" });
  if (b.prioridad !== undefined && !["Alta", "Media", "Baja"].includes(b.prioridad)) return res.status(400).json({ error: "prioridad inválida" });
  db.prepare(
    "UPDATE acciones SET titulo=@titulo, tipo=@tipo, estado=@estado, fecha=@fecha, hora=@hora, duracion_min=@duracion, empresa=@empresa, cliente_id=@cliente_id, detalle=@detalle, prioridad=@prioridad, responsable=@responsable WHERE id=@id",
  ).run({
    titulo: b.titulo ?? cur.titulo,
    tipo: b.tipo ?? cur.tipo,
    estado: b.estado ?? cur.estado,
    fecha: b.fecha ?? cur.fecha,
    hora: b.hora ?? cur.hora,
    duracion: b.duracionMin !== undefined || b.duracion_min !== undefined
      ? Math.min(480, Math.max(15, Number(pick(b, "duracionMin", "duracion_min", 60)) || 60))
      : cur.duracion_min,
    empresa: b.empresa ?? cur.empresa,
    cliente_id: ("clienteId" in b || "cliente_id" in b ? pick(b, "clienteId", "cliente_id", null) : cur.cliente_id) || null,
    detalle: b.detalle ?? cur.detalle,
    prioridad: b.prioridad ?? cur.prioridad ?? "Media",
    responsable: b.responsable ?? cur.responsable ?? "",
    id: req.params.id,
  });
  res.json(accionDe(req.params.id));
});

app.post("/api/acciones/:id/estado", (req, res) => {
  const cur = db.prepare("SELECT * FROM acciones WHERE id=?").get(req.params.id);
  if (!cur) return res.status(404).json({ error: "acción no encontrada" });
  const estado = req.body?.estado;
  if (!ESTADOS_ACCION.includes(estado)) return res.status(400).json({ error: `estado inválido (usa: ${ESTADOS_ACCION.join(", ")})` });
  db.prepare("UPDATE acciones SET estado=? WHERE id=?").run(estado, req.params.id);
  res.json(accionDe(req.params.id));
});

app.delete("/api/acciones/:id", (req, res) => {
  const fotos = db.prepare("SELECT * FROM accion_fotos WHERE accion_id=?").all(req.params.id);
  fotos.forEach((f) => {
    try {
      fs.unlinkSync(path.join(FOTOS_DIR, f.archivo));
    } catch {
      /* ya borrada */
    }
  });
  db.prepare("DELETE FROM accion_fotos WHERE accion_id=?").run(req.params.id);
  db.prepare("DELETE FROM acciones WHERE id=?").run(req.params.id);
  res.status(204).end();
});

// ---------- configuración: etapas del pipeline ----------
const slug = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || `etapa-${Date.now().toString(36)}`;

app.post("/api/pipeline-etapas", (req, res) => {
  const b = req.body ?? {};
  if (!b.nombre?.trim()) return res.status(400).json({ error: "nombre requerido" });
  const row = {
    id: b.id ?? slug(b.nombre),
    nombre: b.nombre.trim(),
    total: 0,
    color: b.color ?? "#22d3ee",
    glow: b.glow ?? b.color ?? "#22d3ee",
  };
  if (db.prepare("SELECT 1 FROM pipeline_stages WHERE id=?").get(row.id)) {
    return res.status(409).json({ error: "ya existe una etapa con ese código" });
  }
  db.prepare("INSERT INTO pipeline_stages (id,nombre,total,color,glow) VALUES (@id,@nombre,@total,@color,@glow)").run(row);
  res.status(201).json(camel(row));
});

app.put("/api/pipeline-etapas/:id", (req, res) => {
  const cur = db.prepare("SELECT * FROM pipeline_stages WHERE id=?").get(req.params.id);
  if (!cur) return res.status(404).json({ error: "etapa no encontrada" });
  const b = req.body ?? {};
  db.prepare("UPDATE pipeline_stages SET nombre=@nombre, color=@color, glow=@glow WHERE id=@id").run({
    nombre: b.nombre ?? cur.nombre,
    color: b.color ?? cur.color,
    glow: b.glow ?? b.color ?? cur.glow,
    id: req.params.id,
  });
  res.json(camel(db.prepare("SELECT * FROM pipeline_stages WHERE id=?").get(req.params.id)));
});

app.delete("/api/pipeline-etapas/:id", (req, res) => {
  const n = db.prepare("SELECT COUNT(*) AS n FROM oportunidades WHERE etapa=?").get(req.params.id).n;
  if (n > 0) return res.status(409).json({ error: `hay ${n} oportunidades en esta etapa` });
  db.prepare("DELETE FROM pipeline_stages WHERE id=?").run(req.params.id);
  res.status(204).end();
});

// ---------- configuración: tipos de cobertura ----------
app.post("/api/coberturas", (req, res) => {
  const b = req.body ?? {};
  const id = String(b.id ?? "").trim().toUpperCase().slice(0, 4);
  if (!id) return res.status(400).json({ error: "código requerido (ej. D)" });
  if (!b.nombre?.trim()) return res.status(400).json({ error: "nombre requerido" });
  if (db.prepare("SELECT 1 FROM coberturas WHERE id=?").get(id)) {
    return res.status(409).json({ error: "ya existe ese código" });
  }
  const row = {
    id,
    nombre: b.nombre.trim(),
    llamadas_cada_meses: Math.max(1, Number(b.llamadasCadaMeses ?? b.llamadas_cada_meses ?? 6) || 6),
    visitas_al_ano: Math.max(1, Number(b.visitasAlAno ?? b.visitas_al_ano ?? 1) || 1),
    descripcion: b.descripcion ?? "",
  };
  db.prepare("INSERT INTO coberturas (id,nombre,llamadas_cada_meses,visitas_al_ano,descripcion) VALUES (@id,@nombre,@llamadas_cada_meses,@visitas_al_ano,@descripcion)").run(row);
  res.status(201).json(camel(row));
});

app.put("/api/coberturas/:id", (req, res) => {
  const cur = db.prepare("SELECT * FROM coberturas WHERE id=?").get(req.params.id);
  if (!cur) return res.status(404).json({ error: "cobertura no encontrada" });
  const b = req.body ?? {};
  db.prepare("UPDATE coberturas SET nombre=@nombre, llamadas_cada_meses=@llamadas, visitas_al_ano=@visitas, descripcion=@descripcion WHERE id=@id").run({
    nombre: b.nombre ?? cur.nombre,
    llamadas: b.llamadasCadaMeses !== undefined || b.llamadas_cada_meses !== undefined ? Math.max(1, Number(pick(b, "llamadasCadaMeses", "llamadas_cada_meses", 1)) || 1) : cur.llamadas_cada_meses,
    visitas: b.visitasAlAno !== undefined || b.visitas_al_ano !== undefined ? Math.max(1, Number(pick(b, "visitasAlAno", "visitas_al_ano", 1)) || 1) : cur.visitas_al_ano,
    descripcion: b.descripcion ?? cur.descripcion,
    id: req.params.id,
  });
  res.json(camel(db.prepare("SELECT * FROM coberturas WHERE id=?").get(req.params.id)));
});

app.delete("/api/coberturas/:id", (req, res) => {
  const n = db.prepare("SELECT COUNT(*) AS n FROM clientes WHERE cobertura_id=?").get(req.params.id).n;
  if (n > 0) return res.status(409).json({ error: `hay ${n} clientes con esta cobertura` });
  db.prepare("DELETE FROM coberturas WHERE id=?").run(req.params.id);
  res.status(204).end();
});
const FOTOS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "fotos");
fs.mkdirSync(FOTOS_DIR, { recursive: true });
const FOTO_MIMES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

app.get("/api/acciones/:id/fotos", (req, res) => {
  res.json(db.prepare("SELECT id, accion_id, archivo, mime, creada FROM accion_fotos WHERE accion_id=? ORDER BY creada").all(req.params.id).map(camel));
});

app.post("/api/acciones/:id/fotos", (req, res) => {
  const acc = db.prepare("SELECT * FROM acciones WHERE id=?").get(req.params.id);
  if (!acc) return res.status(404).json({ error: "acción no encontrada" });
  const { nombre, mime, base64 } = req.body ?? {};
  if (!FOTO_MIMES[mime]) return res.status(400).json({ error: "solo imágenes jpeg/png/webp/gif" });
  const buf = Buffer.from(String(base64 ?? "").split(",").pop() ?? "", "base64");
  if (buf.length === 0 || buf.length > 5 * 1024 * 1024) return res.status(400).json({ error: "foto vacía o mayor de 5MB" });
  const id = newId("ft");
  const seguro = String(nombre ?? "foto").replace(/\.[a-zA-Z0-9]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 40) || "foto";
  const archivo = `${req.params.id}_${Date.now().toString(36)}_${seguro}.${FOTO_MIMES[mime]}`;
  fs.writeFileSync(path.join(FOTOS_DIR, archivo), buf);
  db.prepare("INSERT INTO accion_fotos (id,accion_id,archivo,mime,creada) VALUES (?,?,?,?,?)").run(id, req.params.id, archivo, mime, new Date().toISOString());
  res.status(201).json(camel(db.prepare("SELECT * FROM accion_fotos WHERE id=?").get(id)));
});

app.get("/api/fotos/:id", (req, res) => {
  const f = db.prepare("SELECT * FROM accion_fotos WHERE id=?").get(req.params.id);
  if (!f) return res.status(404).json({ error: "foto no encontrada" });
  res.type(f.mime).sendFile(path.join(FOTOS_DIR, f.archivo));
});

app.delete("/api/fotos/:id", (req, res) => {
  const f = db.prepare("SELECT * FROM accion_fotos WHERE id=?").get(req.params.id);
  if (!f) return res.status(404).json({ error: "foto no encontrada" });
  try {
    fs.unlinkSync(path.join(FOTOS_DIR, f.archivo));
  } catch {
    /* ya borrada */
  }
  db.prepare("DELETE FROM accion_fotos WHERE id=?").run(f.id);
  res.status(204).end();
});

app.put("/api/notificaciones/:id", (req, res) => {
  db.prepare("UPDATE notificaciones SET leida=? WHERE id=?").run(req.body?.leida ? 1 : 0, req.params.id);
  res.json(camel(db.prepare("SELECT * FROM notificaciones WHERE id=?").get(req.params.id)));
});

// ---------- IA local: VOZ rápida + CEREBRO con herramientas ----------
app.get("/api/ia/estado", async (_req, res) => {
  res.json(await estadoIA());
});

app.post("/api/ia/dormir", async (_req, res) => {
  res.json(await dormirIA());
});

app.post("/api/ia/chat", async (req, res) => {
  const { mensaje, historial } = req.body ?? {};
  if (!mensaje?.trim()) return res.status(400).json({ error: "mensaje requerido" });
  try {
    res.json(await voz(mensaje.trim(), Array.isArray(historial) ? historial : []));
  } catch (e) {
    res.status(502).json({ error: errorIA(e) });
  }
});

app.post("/api/ia/cerebro", async (req, res) => {
  const { pregunta, historial } = req.body ?? {};
  if (!pregunta?.trim()) return res.status(400).json({ error: "pregunta requerida" });
  try {
    res.json(await cerebro(pregunta.trim(), Array.isArray(historial) ? historial : []));
  } catch (e) {
    res.status(502).json({ error: errorIA(e) });
  }
});

// distingue "Ollama caído" (pista útil) de un bug interno (mensaje tal cual)
function errorIA(e) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/fetch failed|ECONNREFUSED|ETIMEDOUT|Ollama \d{3}|Load failed/i.test(msg)) {
    return `IA no disponible (${msg}). ¿Está Ollama corriendo?`;
  }
  return `Fallo interno de la IA: ${msg}`;
}

// ---------- servir frontend compilado (opcional, prod) ----------
const DIST = path.join(__dirname, "..", "dist");
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(DIST, "index.html")));
}

app.listen(PORT, () => console.log(`[api] http://localhost:${PORT} · db=${DB_PATH}`));
