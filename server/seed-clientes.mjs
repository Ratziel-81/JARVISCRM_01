// Seed de clientes demo para SQLite local.
// Idempotente: solo inserta los que no existan.
// Uso: node server/seed-clientes.mjs
import "./db.js"; // asegura esquema + seed base
import { backfillCoberturaDemo } from "./db.js";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.CRM_DB ?? path.join(__dirname, "..", "data", "crm.db");
const db = new Database(DB_PATH);

const demo = [
  { id: "c-05", nombre: "AlfaTech Sistemas", empresa: "AlfaTech S.L.", email: "info@alfatech.es", telefono: "+34 910 552 310", estado: "Prospecto", hace: "hace 1 día", avatar_color: "#38bdf8", iniciales: "AT", valor: 15400 },
  { id: "c-06", nombre: "Construmax Obras", empresa: "Construmax S.A.", email: "obras@construmax.es", telefono: "+34 913 884 201", estado: "En seguimiento", hace: "hace 1 día", avatar_color: "#f59e0b", iniciales: "CO", valor: 26700 },
  { id: "c-07", nombre: "Food&Co Distribución", empresa: "Food&Co Iberia", email: "pedidos@foodandco.es", telefono: "+34 934 112 768", estado: "Activo", hace: "hace 2 días", avatar_color: "#f97316", iniciales: "FC", valor: 18900 },
  { id: "c-08", nombre: "Logística 360", empresa: "Logistica 360 Group", email: "ops@logistica360.es", telefono: "+34 960 445 112", estado: "Activo", hace: "hace 2 días", avatar_color: "#eab308", iniciales: "L3", valor: 34100 },
  { id: "c-09", nombre: "NovaDigital Media", empresa: "NovaDigital", email: "hola@novadigital.es", telefono: "+34 911 903 455", estado: "Prospecto", hace: "hace 3 días", avatar_color: "#8b5cf6", iniciales: "ND", valor: 9800 },
  { id: "c-10", nombre: "GreenEnergy Iberia", empresa: "GreenEnergy", email: "contacto@greenenergy.pt", telefono: "+351 210 334 889", estado: "Activo", hace: "hace 3 días", avatar_color: "#10b981", iniciales: "GE", valor: 42300 },
  { id: "c-11", nombre: "Farmacia Central", empresa: "FarmaSur S.L.", email: "info@farmasur.es", telefono: "+34 955 231 908", estado: "En seguimiento", hace: "hace 4 días", avatar_color: "#34d399", iniciales: "FC", valor: 7600 },
  { id: "c-12", nombre: "Hotel Miramar", empresa: "Miramar Hotels", email: "reservas@miramarhotels.es", telefono: "+34 952 771 340", estado: "Activo", hace: "hace 5 días", avatar_color: "#0ea5e9", iniciales: "HM", valor: 51800 },
  { id: "c-13", nombre: "Clínica Dental Norte", empresa: "Dental Norte", email: "cita@dentalnorte.es", telefono: "+34 944 218 673", estado: "Prospecto", hace: "hace 6 días", avatar_color: "#67e8f9", iniciales: "DN", valor: 11200 },
  { id: "c-14", nombre: "AutoRecambios Gil", empresa: "Gil Auto S.L.", email: "taller@gilauto.es", telefono: "+34 976 554 021", estado: "Activo", hace: "hace 1 sem", avatar_color: "#f43f5e", iniciales: "AG", valor: 23400 },
  { id: "c-15", nombre: "Papelería Moderna", empresa: "PapelMod", email: "ventas@papelmod.es", telefono: "+34 915 667 234", estado: "En seguimiento", hace: "hace 1 sem", avatar_color: "#a78bfa", iniciales: "PM", valor: 5400 },
  { id: "c-16", nombre: "Bodegas Ribera", empresa: "Ribera Alta S.C.", email: "comercial@riberaalta.es", telefono: "+34 947 502 118", estado: "Activo", hace: "hace 2 sem", avatar_color: "#a855f7", iniciales: "BR", valor: 38900 },
  { id: "c-17", nombre: "Textil Litoral", empresa: "Litoral Moda", email: "info@litoralmoda.es", telefono: "+34 965 143 876", estado: "Prospecto", hace: "hace 2 sem", avatar_color: "#ec4899", iniciales: "TL", valor: 13100 },
  { id: "c-18", nombre: "Seguros Prisma", empresa: "Prisma Seguros", email: "hola@prismaseguros.es", telefono: "+34 917 889 450", estado: "En seguimiento", hace: "hace 3 sem", avatar_color: "#2f7bff", iniciales: "SP", valor: 27600 },
  { id: "c-19", nombre: "EducaOnline", empresa: "EducaOnline Academy", email: "info@educaonline.es", telefono: "+34 910 778 392", estado: "Activo", hace: "hace 3 sem", avatar_color: "#2dd4bf", iniciales: "EO", valor: 19750 },
  { id: "c-20", nombre: "Talleres Hermanos Ruiz", empresa: "Hnos. Ruiz C.B.", email: "taller@hnosruiz.es", telefono: "+34 925 340 567", estado: "Prospecto", hace: "hace 1 mes", avatar_color: "#94a3b8", iniciales: "HR", valor: 8300 },
];

const stmt = db.prepare(
  "INSERT OR IGNORE INTO clientes (id,nombre,empresa,email,telefono,estado,hace,avatar_color,iniciales,valor) VALUES (@id,@nombre,@empresa,@email,@telefono,@estado,@hace,@avatar_color,@iniciales,@valor)",
);
const tx = db.transaction(() => demo.forEach((r) => stmt.run(r)));
tx();
backfillCoberturaDemo(); // asigna cobertura/fechas a los seed (las filas demo se insertan después del import)

const n = db.prepare("SELECT COUNT(*) AS n FROM clientes").get().n;
console.log(`[seed] clientes en BD: ${n}`);
