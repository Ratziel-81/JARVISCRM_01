import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = process.env.CRM_DB ?? path.join(DATA_DIR, "crm.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#22d3ee',
  glow TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS oportunidades (
  id TEXT PRIMARY KEY,
  empresa TEXT NOT NULL,
  importe REAL NOT NULL DEFAULT 0,
  prioridad TEXT NOT NULL DEFAULT 'Media',
  etapa TEXT NOT NULL DEFAULT 'prospeccion' REFERENCES pipeline_stages(id),
  avatar_color TEXT NOT NULL DEFAULT '#0ea5e9',
  iniciales TEXT NOT NULL DEFAULT '',
  probabilidad INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  empresa TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Prospecto',
  hace TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT '#0ea5e9',
  iniciales TEXT NOT NULL DEFAULT '',
  valor REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS empresas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT '',
  empleados INTEGER NOT NULL DEFAULT 0,
  pais TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS contactos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  cargo TEXT NOT NULL DEFAULT '',
  empresa TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS ofertas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  importe REAL NOT NULL DEFAULT 0,
  dias_restantes INTEGER NOT NULL DEFAULT 0,
  prioridad TEXT NOT NULL DEFAULT 'Media',
  estado TEXT NOT NULL DEFAULT 'Borrador'
);
CREATE TABLE IF NOT EXISTS actividades (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'tarea',
  titulo TEXT NOT NULL,
  detalle TEXT NOT NULL DEFAULT '',
  hace TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS acciones (
  id TEXT PRIMARY KEY,
  hora TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Seguimiento',
  empresa TEXT NOT NULL DEFAULT '',
  dia TEXT NOT NULL DEFAULT 'hoy'
);
CREATE TABLE IF NOT EXISTS kpi_cards (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  valor TEXT NOT NULL DEFAULT '',
  delta TEXT NOT NULL DEFAULT '',
  spark TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS ventas_mensuales (
  mes TEXT PRIMARY KEY,
  ventas REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS kpis_circulares (
  id TEXT PRIMARY KEY,
  valor REAL NOT NULL DEFAULT 0,
  etiqueta TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS notificaciones (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  detalle TEXT NOT NULL DEFAULT '',
  hace TEXT NOT NULL DEFAULT '',
  leida INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS coberturas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  llamadas_cada_meses INTEGER NOT NULL,
  visitas_al_ano INTEGER NOT NULL,
  descripcion TEXT NOT NULL DEFAULT ''
);
`);

// ---------- migración: cobertura y fechas en clientes ----------
for (const col of ["cobertura_id TEXT REFERENCES coberturas(id)", "fecha_alta TEXT", "fecha_baja TEXT", "ultimo_contacto TEXT"]) {
  try {
    db.exec(`ALTER TABLE clientes ADD COLUMN ${col}`);
  } catch {
    /* la columna ya existe */
  }
}

// ---------- migración: ciclo de vida oportunidad/oferta ----------
// Una oportunidad tiene N ofertas versionadas; solo una activa (oportunidades.oferta_activa_id)
// que sincroniza los valores de la oportunidad. Estados terminales: Ganada / Perdida.
for (const col of [
  "oportunidad_id TEXT",
  "numero INTEGER DEFAULT 1",
  "fecha_envio TEXT",
  "fecha_vencimiento TEXT",
  "notas TEXT DEFAULT ''",
]) {
  try {
    db.exec(`ALTER TABLE ofertas ADD COLUMN ${col}`);
  } catch {
    /* la columna ya existe */
  }
}
for (const col of [
  "estado TEXT DEFAULT 'Abierta'",
  "oferta_activa_id TEXT",
  "fecha_cierre TEXT",
  "motivo TEXT DEFAULT ''",
]) {
  try {
    db.exec(`ALTER TABLE oportunidades ADD COLUMN ${col}`);
  } catch {
    /* la columna ya existe */
  }
}

function count(table) {
  return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
}

function seed() {
  if (count("clientes") > 0) return; // ya sembrado

  const ins = (table, cols) =>
    db.prepare(`INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map((c) => `@${c}`).join(",")})`);

  const tx = db.transaction(() => {
    [
      { id: "prospeccion", nombre: "Prospección", total: 18, color: "#22d3ee", glow: "rgba(34,211,238,.35)" },
      { id: "contacto", nombre: "Contacto", total: 12, color: "#2f7bff", glow: "rgba(47,123,255,.35)" },
      { id: "propuesta", nombre: "Propuesta", total: 8, color: "#a78bfa", glow: "rgba(167,139,250,.35)" },
      { id: "negociacion", nombre: "Negociación", total: 6, color: "#f5c542", glow: "rgba(245,197,66,.35)" },
      { id: "cierre", nombre: "Cierre", total: 4, color: "#2dd4bf", glow: "rgba(45,212,191,.35)" },
    ].forEach((r) => ins("pipeline_stages", ["id", "nombre", "total", "color", "glow"]).run(r));

    [
      { id: "op-1", empresa: "TechSolutions S.L.", importe: 12000, prioridad: "Alta", etapa: "propuesta", avatar_color: "#0ea5e9", iniciales: "TS", probabilidad: 72 },
      { id: "op-2", empresa: "NovaDigital", importe: 8500, prioridad: "Media", etapa: "contacto", avatar_color: "#8b5cf6", iniciales: "ND", probabilidad: 45 },
      { id: "op-3", empresa: "GreenEnergy", importe: 25000, prioridad: "Alta", etapa: "negociacion", avatar_color: "#10b981", iniciales: "GE", probabilidad: 81 },
      { id: "op-4", empresa: "Logistica 360", importe: 28000, prioridad: "Alta", etapa: "prospeccion", avatar_color: "#f59e0b", iniciales: "L3", probabilidad: 30 },
      { id: "op-5", empresa: "RetailPro", importe: 32000, prioridad: "Media", etapa: "propuesta", avatar_color: "#ec4899", iniciales: "RP", probabilidad: 64 },
      { id: "op-6", empresa: "Construmax", importe: 19500, prioridad: "Baja", etapa: "contacto", avatar_color: "#64748b", iniciales: "CM", probabilidad: 38 },
    ].forEach((r) => ins("oportunidades", ["id", "empresa", "importe", "prioridad", "etapa", "avatar_color", "iniciales", "probabilidad"]).run(r));

    [
      { id: "c-1", nombre: "Hospital San Jorge", empresa: "San Jorge Group", email: "contacto@sanjorge.es", telefono: "+34 910 204 881", estado: "Activo", hace: "hace 12 min", avatar_color: "#0ea5e9", iniciales: "SJ", valor: 48000 },
      { id: "c-2", nombre: "RetailPro", empresa: "RetailPro S.A.", email: "compras@retailpro.eu", telefono: "+34 932 771 450", estado: "Activo", hace: "hace 40 min", avatar_color: "#ec4899", iniciales: "RP", valor: 32000 },
      { id: "c-3", nombre: "TechSolutions S.L.", empresa: "TechSolutions", email: "hola@techsolutions.es", telefono: "+34 911 308 772", estado: "Prospecto", hace: "hace 2 h", avatar_color: "#8b5cf6", iniciales: "TS", valor: 12000 },
      { id: "c-4", nombre: "BlueOcean", empresa: "BlueOcean Logistics", email: "ops@blueocean.io", telefono: "+34 960 118 334", estado: "En seguimiento", hace: "hace 5 h", avatar_color: "#2dd4bf", iniciales: "BO", valor: 21500 },
    ].forEach((r) => ins("clientes", ["id", "nombre", "empresa", "email", "telefono", "estado", "hace", "avatar_color", "iniciales", "valor"]).run(r));

    [
      { id: "e-1", nombre: "TechSolutions S.L.", sector: "Software", empleados: 85, pais: "España" },
      { id: "e-2", nombre: "NovaDigital", sector: "Marketing", empleados: 42, pais: "España" },
      { id: "e-3", nombre: "GreenEnergy", sector: "Energía", empleados: 210, pais: "Portugal" },
      { id: "e-4", nombre: "RetailPro", sector: "Retail", empleados: 340, pais: "España" },
      { id: "e-5", nombre: "BlueOcean", sector: "Logística", empleados: 120, pais: "España" },
    ].forEach((r) => ins("empresas", ["id", "nombre", "sector", "empleados", "pais"]).run(r));

    [
      { id: "ct-1", nombre: "Marta Vidal", cargo: "Directora de Compras", empresa: "TechSolutions S.L.", email: "m.vidal@techsolutions.es" },
      { id: "ct-2", nombre: "Javier Roca", cargo: "CEO", empresa: "NovaDigital", email: "j.roca@novadigital.es" },
      { id: "ct-3", nombre: "Elena Sanz", cargo: "CFO", empresa: "GreenEnergy", email: "e.sanz@greenenergy.pt" },
    ].forEach((r) => ins("contactos", ["id", "nombre", "cargo", "empresa", "email"]).run(r));

    [
      { id: "of-1", titulo: "Propuesta comercial · RetailPro", importe: 32000, dias_restantes: 14, prioridad: "Alta", estado: "Enviada" },
      { id: "of-2", titulo: "Oferta · Soluciones IT", importe: 9500, dias_restantes: 7, prioridad: "Media", estado: "Enviada" },
      { id: "of-3", titulo: "Propuesta · GreenEnergy", importe: 25000, dias_restantes: 12, prioridad: "Alta", estado: "Borrador" },
      { id: "of-4", titulo: "Oferta · Food&Co", importe: 17000, dias_restantes: 5, prioridad: "Baja", estado: "Enviada" },
    ].forEach((r) => ins("ofertas", ["id", "titulo", "importe", "dias_restantes", "prioridad", "estado"]).run(r));

    [
      { id: "a-1", tipo: "cliente", titulo: "Nuevo cliente registrado", detalle: "TechSolutions S.L.", hace: "Hace 2 min" },
      { id: "a-2", tipo: "oferta", titulo: "Oferta enviada", detalle: "Propuesta comercial · RetailPro", hace: "Hace 15 min" },
      { id: "a-3", tipo: "llamada", titulo: "Llamada completada", detalle: "Cliente: BlueOcean", hace: "Hace 1 h" },
      { id: "a-4", tipo: "tarea", titulo: "Tarea completada", detalle: "Seguimiento · AlfaTech", hace: "Hace 2 h" },
      { id: "a-5", tipo: "oportunidad", titulo: "Nueva oportunidad", detalle: "Logistica 360 · €28.000", hace: "Hace 3 h" },
    ].forEach((r) => ins("actividades", ["id", "tipo", "titulo", "detalle", "hace"]).run(r));

    [
      { id: "ac-1", hora: "10:00", tipo: "Llamada", empresa: "BlueOcean", dia: "hoy" },
      { id: "ac-2", hora: "12:30", tipo: "Reunión", empresa: "RetailPro", dia: "hoy" },
      { id: "ac-3", hora: "16:00", tipo: "Seguimiento", empresa: "AlfaTech", dia: "hoy" },
      { id: "ac-4", hora: "09:30", tipo: "Presentación", empresa: "NovaDigital", dia: "manana" },
      { id: "ac-5", hora: "11:00", tipo: "Llamada", empresa: "Logistica 360", dia: "manana" },
      { id: "ac-6", hora: "17:00", tipo: "Enviar oferta", empresa: "Construmax", dia: "manana" },
    ].forEach((r) => ins("acciones", ["id", "hora", "tipo", "empresa", "dia"]).run(r));

    [
      { id: "clientes", titulo: "Total Clientes", valor: "248", delta: "+12%", spark: "[180,190,196,205,214,226,248]" },
      { id: "oportunidades", titulo: "Oportunidades", valor: "56", delta: "+18%", spark: "[34,38,40,44,48,52,56]" },
      { id: "ofertas", titulo: "Ofertas Enviadas", valor: "32", delta: "+23%", spark: "[18,20,22,25,27,30,32]" },
      { id: "ventas", titulo: "Ventas", valor: "€124.500", delta: "+35%", spark: "[32,38,45,55,62,82,124.5]" },
      { id: "conversion", titulo: "Tasa de Conversión", valor: "22,4%", delta: "+6%", spark: "[16,17.5,18.2,19.4,20.8,21.6,22.4]" },
    ].forEach((r) => ins("kpi_cards", ["id", "titulo", "valor", "delta", "spark"]).run(r));

    [
      { mes: "Ene", ventas: 32000 },
      { mes: "Feb", ventas: 38000 },
      { mes: "Mar", ventas: 45000 },
      { mes: "Abr", ventas: 55000 },
      { mes: "May", ventas: 62000 },
      { mes: "Jun", ventas: 82000 },
      { mes: "Jul", ventas: 124500 },
    ].forEach((r) => ins("ventas_mensuales", ["mes", "ventas"]).run(r));

    [
      { id: "activos", valor: 78, etiqueta: "Clientes activos" },
      { id: "ganadas", valor: 62, etiqueta: "Oportunidades ganadas" },
      { id: "cierre", valor: 45, etiqueta: "Tiempo medio de cierre" },
      { id: "satisfaccion", valor: 91, etiqueta: "Satisfacción cliente" },
    ].forEach((r) => ins("kpis_circulares", ["id", "valor", "etiqueta"]).run(r));

    [
      { id: "n-1", titulo: "Oferta próxima a vencer", detalle: "Oferta · Food&Co vence en 5 días", hace: "hace 20 min", leida: 0 },
      { id: "n-2", titulo: "Nueva oportunidad asignada", detalle: "Logistica 360 · €28.000", hace: "hace 1 h", leida: 0 },
      { id: "n-3", titulo: "Reunión en 30 minutos", detalle: "Reunión · RetailPro a las 12:30", hace: "hace 2 h", leida: 1 },
    ].forEach((r) => ins("notificaciones", ["id", "titulo", "detalle", "hace", "leida"]).run(r));
  });

  tx();
  console.log(`[db] seed inicial en ${DB_PATH}`);
}

seed();

// ---------- tipos de cobertura ----------
function seedCoberturas() {
  if (count("coberturas") > 0) return;
  const ins = db.prepare(
    "INSERT INTO coberturas (id,nombre,llamadas_cada_meses,visitas_al_ano,descripcion) VALUES (@id,@nombre,@llamadas_cada_meses,@visitas_al_ano,@descripcion)",
  );
  const tx = db.transaction(() =>
    [
      { id: "A", nombre: "Tipo A · Esencial", llamadas_cada_meses: 6, visitas_al_ano: 1, descripcion: "Una llamada cada 6 meses y una visita al año" },
      { id: "B", nombre: "Tipo B · Avanzada", llamadas_cada_meses: 3, visitas_al_ano: 2, descripcion: "Una llamada cada 3 meses y dos visitas al año" },
      { id: "C", nombre: "Tipo C · Premium", llamadas_cada_meses: 1, visitas_al_ano: 4, descripcion: "Una llamada al mes y cuatro visitas al año" },
    ].forEach((r) => ins.run(r)),
  );
  tx();
  console.log("[db] tipos de cobertura creados (A/B/C)");
}

// ---------- backfill demo: cobertura + fechas para los seed conocidos ----------
// Solo toca los ids de seed (c-1..c-4, c-05..c-20) que aún no tengan cobertura.
// Idempotente y no pisa clientes creados por el usuario.
const isoHace = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
};
// +n = dentro de n días, -n = hace n días
const isoEn = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

export function backfillCoberturaDemo() {
  const plan = [
    // [id, cobertura|null, ultimoContactoHaceDias|null, altaHaceDias, bajaHaceDias|null]
    ["c-1", "A", 40, 800, null],
    ["c-2", "C", 10, 650, null],
    ["c-3", "B", 120, 400, null],
    ["c-4", "A", 300, 500, null],
    ["c-05", "B", 20, 300, null],
    ["c-06", "C", 50, 250, null],
    ["c-07", "A", 300, 700, null],
    ["c-08", "C", 5, 200, null],
    ["c-09", null, null, 120, null],
    ["c-10", "B", 100, 450, null],
    ["c-11", "A", 90, 180, null],
    ["c-12", "C", 35, 380, null],
    ["c-13", "B", 200, 320, null],
    ["c-14", "A", 30, 540, null],
    ["c-15", "B", 260, 600, 20],
    ["c-16", "A", 150, 420, null],
    ["c-17", "C", 60, 150, null],
    ["c-18", "B", 10, 90, null],
    ["c-19", "A", 190, 480, null],
    ["c-20", "C", null, 60, null],
  ];
  const upd = db.prepare(
    "UPDATE clientes SET cobertura_id=@cobertura_id, ultimo_contacto=@ultimo_contacto, fecha_alta=@fecha_alta, fecha_baja=@fecha_baja WHERE id=@id AND cobertura_id IS NULL",
  );
  const tx = db.transaction(() =>
    plan.forEach(([id, cob, ult, alta, baja]) =>
      upd.run({
        id,
        cobertura_id: cob,
        ultimo_contacto: ult === null ? null : isoHace(ult),
        fecha_alta: isoHace(alta),
        fecha_baja: baja === null ? null : isoHace(baja),
      }),
    ),
  );
  tx();
}

// ---------- seed modelo oferta/oportunidad ----------
// Idempotente: todo con guards (OR IGNORE / WHERE ... IS NULL).
function seedOfertasModelo() {
  // 1. nuevas oportunidades demo (una abierta temprana, una ganada, una perdida)
  const insOp = db.prepare(
    "INSERT OR IGNORE INTO oportunidades (id,empresa,importe,prioridad,etapa,avatar_color,iniciales,probabilidad,estado,oferta_activa_id,fecha_cierre,motivo) VALUES (@id,@empresa,@importe,@prioridad,@etapa,@avatar_color,@iniciales,@probabilidad,@estado,@oferta_activa_id,@fecha_cierre,@motivo)",
  );
  const txOps = db.transaction(() =>
    [
      { id: "op-7", empresa: "Food&Co", importe: 17000, prioridad: "Media", etapa: "prospeccion", avatar_color: "#f97316", iniciales: "FC", probabilidad: 20, estado: "Abierta", oferta_activa_id: null, fecha_cierre: null, motivo: "" },
      { id: "op-8", empresa: "Bodegas Ribera", importe: 38900, prioridad: "Alta", etapa: "cierre", avatar_color: "#a855f7", iniciales: "BR", probabilidad: 100, estado: "Ganada", oferta_activa_id: "of-6", fecha_cierre: isoEn(-2), motivo: "" },
      { id: "op-9", empresa: "Papelería Moderna", importe: 5400, prioridad: "Media", etapa: "negociacion", avatar_color: "#a78bfa", iniciales: "PM", probabilidad: 0, estado: "Perdida", oferta_activa_id: null, fecha_cierre: isoEn(-9), motivo: "Precio por encima del presupuesto" },
    ].forEach((r) => insOp.run(r)),
  );
  txOps();

  // 2. vincular ofertas legacy (solo las aún sin vincular)
  const vincular = db.prepare(
    "UPDATE ofertas SET oportunidad_id=?, numero=?, importe=?, estado=?, fecha_envio=?, fecha_vencimiento=? WHERE id=? AND oportunidad_id IS NULL",
  );
  const txLegacy = db.transaction(() => {
    vincular.run("op-5", 1, 32000, "Enviada", isoEn(-6), isoEn(8), "of-1");
    vincular.run("op-1", 1, 12000, "Borrador", null, isoEn(14), "of-2");
    vincular.run("op-3", 2, 25000, "Enviada", isoEn(-4), isoEn(8), "of-3");
    vincular.run("op-7", 1, 17000, "Enviada", isoEn(-9), isoEn(5), "of-4");
  });
  txLegacy();

  // 3. ofertas nuevas (versiones e historial)
  const insOf = db.prepare(
    "INSERT OR IGNORE INTO ofertas (id,oportunidad_id,numero,titulo,importe,prioridad,estado,fecha_envio,fecha_vencimiento,notas) VALUES (@id,@oportunidad_id,@numero,@titulo,@importe,@prioridad,@estado,@fecha_envio,@fecha_vencimiento,@notas)",
  );
  const txOf = db.transaction(() =>
    [
      { id: "of-5", oportunidad_id: "op-3", numero: 1, titulo: "Primera propuesta · GreenEnergy", importe: 22000, prioridad: "Media", estado: "Descartada", fecha_envio: isoEn(-40), fecha_vencimiento: isoEn(-26), notas: "Superada por la v2 a petición del cliente" },
      { id: "of-6", oportunidad_id: "op-8", numero: 1, titulo: "Oferta · Bodegas Ribera", importe: 38900, prioridad: "Alta", estado: "Aceptada", fecha_envio: isoEn(-12), fecha_vencimiento: isoEn(16), notas: "Adjudicado" },
      { id: "of-7", oportunidad_id: "op-9", numero: 1, titulo: "Oferta · Papelería Moderna", importe: 5400, prioridad: "Media", estado: "Rechazada", fecha_envio: isoEn(-30), fecha_vencimiento: isoEn(-16), notas: "Rechazada por precio" },
    ].forEach((r) => insOf.run(r)),
  );
  txOf();

  // 4. activar la oferta vigente por oportunidad (solo si no hay ninguna) y sincronizar importe
  const activar = db.prepare(
    "UPDATE oportunidades SET oferta_activa_id=?, importe=?, probabilidad=?, etapa=? WHERE id=? AND oferta_activa_id IS NULL AND estado='Abierta'",
  );
  const txAct = db.transaction(() => {
    activar.run("of-1", 32000, 64, "propuesta", "op-5");
    activar.run("of-3", 25000, 81, "negociacion", "op-3");
    activar.run("of-2", 12000, 45, "propuesta", "op-1");
    activar.run("of-4", 17000, 20, "prospeccion", "op-7");
  });
  txAct();

  // 5. retirar la columna legacy de días relativos (ya migrada a fecha_vencimiento)
  try {
    db.exec("ALTER TABLE ofertas DROP COLUMN dias_restantes");
  } catch {
    /* sqlite antiguo o ya retirada */
  }
}

// ---------- migración: acciones comerciales ----------
// Tipos: llamada | reunion | visita | tarea. Estados: Pendiente | Hecha | Cancelada.
// Campo detalle para notas + tabla de fotos.
db.exec(`
CREATE TABLE IF NOT EXISTS accion_fotos (
  id TEXT PRIMARY KEY,
  accion_id TEXT NOT NULL REFERENCES acciones(id) ON DELETE CASCADE,
  archivo TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT 'image/jpeg',
  creada TEXT NOT NULL DEFAULT ''
);
`);
for (const col of ["titulo TEXT", "estado TEXT DEFAULT 'Pendiente'", "fecha TEXT", "detalle TEXT DEFAULT ''", "cliente_id TEXT", "duracion_min INTEGER DEFAULT 60", "prioridad TEXT DEFAULT 'Media'", "responsable TEXT DEFAULT ''"]) {
  try {
    db.exec(`ALTER TABLE acciones ADD COLUMN ${col}`);
  } catch {
    /* la columna ya existe */
  }
}

// Mapea tipos legacy al nuevo catálogo y rellena demo. Idempotente (solo filas sin fecha).
function seedAccionesModelo() {
  const demo = [
    // [id, tipo, titulo, estado, fechaOffset, detalle, clienteId]
    ["ac-1", "llamada", "Llamada de seguimiento", "Hecha", 0, "Confirmado interés en la propuesta. Piden revisar plazos de entrega.", "c-4"],
    ["ac-2", "reunion", "Reunión de presentación", "Pendiente", 0, "Llevar propuesta impresa v2 y casos de éxito del sector retail.", "c-2"],
    ["ac-3", "visita", "Visita a instalaciones", "Pendiente", 1, "Visitar planta y almacén. Contacto en recepción: Marta.", null],
    ["ac-4", "reunion", "Presentación de oferta", "Pendiente", 1, "", null],
    ["ac-5", "llamada", "Llamada de primer contacto", "Pendiente", 2, "", null],
    ["ac-6", "tarea", "Enviar oferta por email", "Pendiente", 3, "Adjuntar condiciones de pago a 30 días y garantía.", null],
  ];
  const stmt = db.prepare(
    "UPDATE acciones SET tipo=?, titulo=?, estado=?, fecha=?, detalle=?, cliente_id=? WHERE id=? AND fecha IS NULL",
  );
  const tx = db.transaction(() =>
    demo.forEach(([id, tipo, titulo, estado, off, detalle, cli]) =>
      stmt.run(tipo, titulo, estado, isoEn(off), detalle, cli, id),
    ),
  );
  tx();
  // duraciones demo variadas (solo si nadie las ha tocado)
  if (!db.prepare("SELECT 1 FROM acciones WHERE duracion_min != 60").get()) {
    const dur = db.prepare("UPDATE acciones SET duracion_min=? WHERE id=?");
    dur.run(30, "ac-1");
    dur.run(90, "ac-2");
    dur.run(120, "ac-3");
    dur.run(45, "ac-4");
  }
  // tareas demo (tipo tarea con responsable y prioridad)
  const insTarea = db.prepare(
    "INSERT OR IGNORE INTO acciones (id,titulo,tipo,estado,fecha,hora,duracion_min,empresa,cliente_id,detalle,prioridad,responsable) VALUES (@id,@titulo,'tarea',@estado,@fecha,@hora,30,@empresa,@cliente_id,@detalle,@prioridad,@responsable)",
  );
  const txTareas = db.transaction(() =>
    [
      { id: "t-01", titulo: "Preparar propuesta RetailPro", estado: "Pendiente", fecha: isoEn(0), hora: "09:00", empresa: "RetailPro", cliente_id: "c-2", detalle: "Incluir descuento por volumen y plazos de entrega en 3 fases.", prioridad: "Alta", responsable: "Alex" },
      { id: "t-02", titulo: "Llamar a GreenEnergy", estado: "Pendiente", fecha: isoEn(2), hora: "11:30", empresa: "GreenEnergy", cliente_id: null, detalle: "Preguntar por Elena Sanz. Tema: ampliación de la v2.", prioridad: "Media", responsable: "Marta" },
      { id: "t-03", titulo: "Revisar contrato BlueOcean", estado: "Hecha", fecha: isoEn(-1), hora: "16:00", empresa: "BlueOcean", cliente_id: "c-4", detalle: "Contrato revisado y firmado. Archivado en el gestor documental.", prioridad: "Alta", responsable: "Alex" },
      { id: "t-04", titulo: "Enviar catálogo a Textil Litoral", estado: "Pendiente", fecha: isoEn(5), hora: "10:00", empresa: "Litoral Moda", cliente_id: null, detalle: "Catálogo 2026 + lista de precios con IVA.", prioridad: "Baja", responsable: "Javier" },
      { id: "t-05", titulo: "Facturar visita Miramar", estado: "Pendiente", fecha: isoEn(1), hora: "13:00", empresa: "Miramar Hotels", cliente_id: "c-12", detalle: "Factura de la visita técnica de octubre.", prioridad: "Media", responsable: "Alex" },
      { id: "t-06", titulo: "Archivar expediente Papelería", estado: "Cancelada", fecha: isoEn(-3), hora: "12:00", empresa: "PapelMod", cliente_id: null, detalle: "Cliente de baja: se archiva sin facturar.", prioridad: "Baja", responsable: "Marta" },
    ].forEach((r) => insTarea.run(r)),
  );
  txTareas();
  db.prepare("UPDATE acciones SET prioridad='Alta', responsable='Alex' WHERE id='ac-6' AND (responsable IS NULL OR responsable='')").run();
  // retirar columna legacy de día relativo
  try {
    const cols = db.prepare("PRAGMA table_info(acciones)").all().map((c) => c.name);
    if (cols.includes("dia")) db.exec("ALTER TABLE acciones DROP COLUMN dia");
  } catch {
    /* sqlite antiguo o ya retirada */
  }
}

seedCoberturas();
backfillCoberturaDemo();
seedOfertasModelo();
seedAccionesModelo();

export { DB_PATH };
