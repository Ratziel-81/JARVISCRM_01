// IA local (Ollama): VOZ rápida + CEREBRO con herramientas sobre SQLite.
// VOZ (qwen3:1.7b): respuestas instantáneas con un resumen de contexto.
// CEREBRO (qwen3.5, con thinking): piensa, consulta la BD con herramientas,
// organiza la agenda y propone próximos pasos. La VOZ presenta el resultado.
import { db } from "./db.js";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const VOZ = process.env.IA_RAPIDO ?? "qwen3:1.7b";
const CEREBRO = process.env.IA_CEREBRO ?? "qwen3.5";

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ---------- herramientas (lectura) sobre la BD ----------
function resumenCartera() {
  const clientes = db.prepare("SELECT COUNT(*) n FROM clientes WHERE fecha_baja IS NULL").get().n;
  const pipe = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(importe),0) s FROM oportunidades WHERE estado='Abierta'").get();
  const ofertasActivas = db.prepare("SELECT COUNT(*) n FROM oportunidades WHERE oferta_activa_id IS NOT NULL AND estado='Abierta'").get().n;
  const tareas = db.prepare("SELECT COUNT(*) n FROM acciones WHERE tipo='tarea' AND estado='Pendiente'").get().n;
  const hoy = db.prepare("SELECT COUNT(*) n FROM acciones WHERE fecha=? AND estado='Pendiente'").get(hoyISO()).n;
  return { clientes, oportunidades_abiertas: pipe.n, pipeline_eur: Math.round(pipe.s), ofertas_activas: ofertasActivas, tareas_pendientes: tareas, acciones_hoy: hoy };
}

function listaOportunidades(estado = "Abierta") {
  const where = estado === "Todas" ? "" : "WHERE op.estado = ?";
  const args = estado === "Todas" ? [] : [estado];
  return db
    .prepare(
      `SELECT op.id, op.empresa, op.etapa, ps.nombre AS etapa_nombre, op.importe, op.probabilidad, op.estado,
        (SELECT COUNT(*) FROM ofertas o WHERE o.oportunidad_id = op.id) AS versiones,
        (SELECT oo.titulo || ' v' || oo.numero || ' (' || oo.estado || ')' FROM ofertas oo WHERE oo.id = op.oferta_activa_id) AS oferta_activa
       FROM oportunidades op LEFT JOIN pipeline_stages ps ON ps.id = op.etapa ${where} ORDER BY op.importe DESC`,
    )
    .all(...args);
}

function ofertasPorVencer(dias = 7) {
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  const lim = limite.toISOString().slice(0, 10);
  return db
    .prepare(
      `SELECT o.id, o.titulo, o.numero, o.importe, o.fecha_vencimiento, op.empresa AS oportunidad
       FROM ofertas o LEFT JOIN oportunidades op ON op.id = o.oportunidad_id
       WHERE o.estado='Enviada' AND o.fecha_vencimiento IS NOT NULL AND o.fecha_vencimiento <= ? ORDER BY o.fecha_vencimiento`,
    )
    .all(lim);
}

function cadenciaDias(c) {
  if (!c.cobertura_id || !c.llamadas_cada_meses) return null;
  return Math.min(c.llamadas_cada_meses * 30.44, c.visitas_al_ano ? 365 / c.visitas_al_ano : Infinity);
}

function clientesDesatendidos(limite = 10) {
  const rows = db
    .prepare(
      `SELECT c.id, c.nombre, c.empresa, c.cobertura_id, co.nombre AS cobertura,
        co.llamadas_cada_meses, co.visitas_al_ano, c.ultimo_contacto
       FROM clientes c LEFT JOIN coberturas co ON co.id = c.cobertura_id
       WHERE c.fecha_baja IS NULL AND c.cobertura_id IS NOT NULL`,
    )
    .all();
  const hoy = new Date(`${hoyISO()}T00:00:00`).getTime();
  return rows
    .map((c) => {
      const cad = cadenciaDias(c);
      const dias = c.ultimo_contacto ? Math.floor((hoy - new Date(`${c.ultimo_contacto}T00:00:00`).getTime()) / 86400000) : 9999;
      return { ...c, dias_sin_contacto: dias, ratio: cad ? dias / cad : 9999 };
    })
    .filter((c) => c.ratio > 1)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limite)
    .map(({ id, nombre, empresa, cobertura, dias_sin_contacto }) => ({ id, nombre, empresa, cobertura, dias_sin_contacto }));
}

function agendaDia(fecha = hoyISO()) {
  const accs = db
    .prepare(
      `SELECT id, titulo, tipo, hora, duracion_min, empresa, estado FROM acciones WHERE fecha=? ORDER BY hora`,
    )
    .all(fecha);
  const tareas = db
    .prepare(
      `SELECT id, titulo, prioridad, responsable, empresa FROM acciones
       WHERE tipo='tarea' AND estado='Pendiente' AND fecha IS NOT NULL AND fecha <= ? ORDER BY fecha, prioridad`,
    )
    .all(fecha);
  return { fecha, acciones: accs, tareas_vencidas_o_hoy: tareas };
}

function buscarCliente(q) {
  const like = `%${String(q).toLowerCase()}%`;
  return db
    .prepare(
      `SELECT c.id, c.nombre, c.empresa, c.estado, c.valor, co.nombre AS cobertura, c.ultimo_contacto, c.fecha_alta
       FROM clientes c LEFT JOIN coberturas co ON co.id = c.cobertura_id
       WHERE lower(c.nombre) LIKE ? OR lower(c.empresa) LIKE ? LIMIT 5`,
    )
    .all(like, like);
}

function detalleOportunidad(id) {
  const op = db.prepare("SELECT * FROM oportunidades WHERE id=?").get(id);
  if (!op) return { error: "no existe" };
  const ofertas = db.prepare("SELECT id, numero, titulo, importe, estado, fecha_envio, fecha_vencimiento, notas FROM ofertas WHERE oportunidad_id=? ORDER BY numero").all(id);
  return { ...op, ofertas };
}

// ---------- web: buscar (sin clave, mejor esfuerzo) y leer páginas ----------
async function wikiResumen(q) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const bus = await fetch(`https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=3`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "JARVIS-CRM/1.0" },
    });
    clearTimeout(t);
    if (!bus.ok) return null;
    const hits = (await bus.json()).query?.search ?? [];
    if (hits.length === 0) return null;
    const titulo = hits[0].title;
    const res = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo)}`, {
      headers: { "User-Agent": "JARVIS-CRM/1.0" },
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.extract) return null;
    return { respuesta: d.extract.slice(0, 1200), fuente: d.content_urls?.desktop?.page ?? "", temas: [] };
  } catch {
    return null;
  }
}

async function buscarWeb(q) {
  if (!q?.trim()) return { error: "consulta vacía" };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&lang=es-es`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "JARVIS-CRM/1.0" },
    });
    clearTimeout(t);
    if (res.ok) {
      const d = await res.json();
      const temas = (d.RelatedTopics ?? [])
        .flatMap((t) => (t.Topics ? t.Topics : [t]))
        .filter((t) => t.Text)
        .slice(0, 6)
        .map((t) => ({ texto: t.Text, url: t.FirstURL }));
      if (d.AbstractText || temas.length > 0) {
        return { respuesta: d.AbstractText || "", fuente: d.AbstractURL || "", temas };
      }
    }
  } catch {
    /* se intenta Wikipedia */
  }
  const wiki = await wikiResumen(q);
  if (wiki) return { ...wiki, nota: "vía Wikipedia (el buscador general no devolvió nada)" };
  return { respuesta: "", temas: [], nota: "sin resultados: pide una URL concreta para leer_web" };
}

function textoDeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(header|nav|footer|aside|form|iframe)[\s>][\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(nbsp|amp|quot|lt|gt|apos|euro|hellip|mdash|ldquo|rdquo);/gi, (m) => (
      { "&nbsp;": " ", "&amp;": "&", "&quot;": '"', "&lt;": "<", "&gt;": ">", "&apos;": "'", "&euro;": "€", "&hellip;": "…", "&mdash;": "—", "&ldquo;": "“", "&rdquo;": "”" }[m.toLowerCase()] ?? " "
    ))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

async function leerWeb(url) {
  let u;
  try {
    u = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return { error: "URL inválida" };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(u.toString(), {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) JARVIS-CRM/1.0", Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return { error: `la página devolvió ${res.status}` };
    const tipo = res.headers.get("content-type") ?? "";
    if (!/text|html|xml|json/i.test(tipo)) return { error: `contenido no legible (${tipo})` };
    const html = await res.text();
    if (html.length > 2000000) return { error: "página demasiado grande" };
    const texto = textoDeHtml(html).slice(0, 8000);
    if (!texto) return { error: "no se extrajo texto" };
    return { url: u.toString(), texto };
  } catch (e) {
    return { error: `no se pudo leer: ${e.message}` };
  }
}

const TOOLS = [
  { type: "function", function: { name: "resumen_cartera", description: "Foto global: nº clientes, pipeline abierto en €, ofertas activas, tareas pendientes y acciones de hoy.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "lista_oportunidades", description: "Lista oportunidades con etapa, importe y probabilidad. Estado: Abierta, Ganada, Perdida o Todas.", parameters: { type: "object", properties: { estado: { type: "string" } } } } },
  { type: "function", function: { name: "ofertas_por_vencer", description: "Ofertas enviadas que vencen en los próximos días.", parameters: { type: "object", properties: { dias: { type: "number" } } } } },
  { type: "function", function: { name: "clientes_desatendidos", description: "Clientes que superan su cadencia de cobertura (los más desatendidos primero).", parameters: { type: "object", properties: { limite: { type: "number" } } } } },
  { type: "function", function: { name: "agenda_dia", description: "Acciones del día y tareas vencidas o de hoy para organizar la agenda. Fecha YYYY-MM-DD, por defecto hoy.", parameters: { type: "object", properties: { fecha: { type: "string" } } } } },
  { type: "function", function: { name: "buscar_cliente", description: "Busca clientes por nombre o empresa.", parameters: { type: "object", properties: { q: { type: "string" } } } } },
  { type: "function", function: { name: "detalle_oportunidad", description: "Ficha completa de una oportunidad con sus versiones de oferta.", parameters: { type: "object", properties: { id: { type: "string" } } } } },
  { type: "function", function: { name: "tareas_pendientes", description: "Tareas pendientes ordenadas por fecha.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "buscar_web", description: "Busca información en internet (respuestas directas y temas; calidad variable, sin clave). Úsalo para datos externos: tipos de interés, noticias, definiciones.", parameters: { type: "object", properties: { q: { type: "string", description: "consulta" } } } } },
  { type: "function", function: { name: "leer_web", description: "Lee el texto de una página web (noticia, ficha de producto, documentación). Devuelve hasta 8000 caracteres.", parameters: { type: "object", properties: { url: { type: "string", description: "URL completa" } } } } },
];

async function ejecutarHerramienta(name, args = {}) {
  switch (name) {
    case "resumen_cartera":
      return resumenCartera();
    case "lista_oportunidades":
      return listaOportunidades(args.estado ?? "Abierta");
    case "ofertas_por_vencer":
      return ofertasPorVencer(Number(args.dias ?? 7) || 7);
    case "clientes_desatendidos":
      return clientesDesatendidos(Number(args.limite ?? 10) || 10);
    case "agenda_dia":
      return agendaDia(args.fecha || hoyISO());
    case "buscar_cliente":
      return buscarCliente(args.q ?? "");
    case "detalle_oportunidad":
      return detalleOportunidad(args.id);
    case "tareas_pendientes":
      return db.prepare("SELECT id, titulo, prioridad, responsable, fecha, empresa FROM acciones WHERE tipo='tarea' AND estado='Pendiente' ORDER BY fecha").all();
    case "buscar_web":
      return await buscarWeb(args.q ?? "");
    case "leer_web":
      return await leerWeb(args.url ?? "");
    default:
      return { error: `herramienta desconocida: ${name}` };
  }
}

// ---------- cliente Ollama ----------
async function ollamaChat({ model, messages, tools, think, numCtx = 4096, temp = 0.3 }) {
  const t0 = Date.now();
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      tools,
      think,
      stream: false,
      keep_alive: "30m",
      options: { num_ctx: numCtx, temperature: temp },
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = await res.json();
  return { ...data, ms: Date.now() - t0 };
}

export async function estadoIA() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!res.ok) throw new Error();
    const { models } = await res.json();
    const nombres = models.map((m) => m.name);
    let cargados = [];
    try {
      const ps = await fetch(`${OLLAMA_URL}/api/ps`);
      if (ps.ok) {
        const { models: enMemoria } = await ps.json();
        cargados = (enMemoria ?? []).map((m) => ({ name: m.name, vram_mb: Math.round((m.size_vram ?? 0) / 1048576) }));
      }
    } catch {
      /* sin detalle de memoria */
    }
    return { ok: true, url: OLLAMA_URL, voz: VOZ, cerebro: CEREBRO, instalados: nombres, cargados };
  } catch {
    return { ok: false, url: OLLAMA_URL, voz: VOZ, cerebro: CEREBRO, instalados: [], cargados: [] };
  }
}

// Dormir: descarga los modelos de la GPU y libera la VRAM.
// Equivale al keep_alive agotado, pero ahora mismo. Despiertan solos al usarlos.
export async function dormirIA() {
  const est = await estadoIA();
  const dormidos = [];
  for (const m of (est.cargados ?? []).map((c) => c.name)) {
    try {
      await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: m, prompt: "", keep_alive: 0, options: { num_predict: 1 } }),
      });
      dormidos.push(m);
    } catch {
      /* sigue con el siguiente */
    }
  }
  return { dormidos };
}

// ---------- VOZ: respuesta instantánea con resumen de contexto ----------
export async function voz(mensaje, historial = []) {
  const ctx = resumenCartera();
  const system = `Eres la VOZ de J.A.R.V.I.S. CRM, hablas con un comercial. Respuestas de 2 a 4 líneas, directas y accionables, en español.
Foto de la cartera hoy: ${ctx.clientes} clientes, ${ctx.oportunidades_abiertas} oportunidades abiertas por ${ctx.pipeline_eur}€, ${ctx.ofertas_activas} ofertas activas, ${ctx.tareas_pendientes} tareas pendientes, ${ctx.acciones_hoy} acciones hoy.
Si te piden análisis profundo, agenda u ofertas a medida, sugiere usar el CEREBRO.`;
  const messages = [
    { role: "system", content: system },
    ...historial.slice(-8).map((h) => ({ role: h.rol === "yo" ? "user" : "assistant", content: h.texto })),
    { role: "user", content: mensaje },
  ];
  const r = await ollamaChat({ model: VOZ, messages, think: false });
  return { respuesta: r.message.content.trim(), modelo: VOZ, ms: r.ms };
}

// ---------- CEREBRO: piensa, consulta la BD y la VOZ lo presenta ----------
const SISTEMA_CEREBRO = `Eres el CEREBRO de J.A.R.V.I.S. CRM, el analista del comercial. Piensas paso a paso y CONSULTAS la base de datos con las herramientas antes de responder: no inventes cifras, úsalas de las herramientas.
Puedes: organizar la agenda del día (qué hacer primero y por qué), detectar clientes desatendidos, priorizar oportunidades por importe × probabilidad, y proponer qué ofrecer a cada cliente según su historial.
También puedes buscar información externa en internet (buscar_web) y leer páginas concretas (leer_web): úsalo para datos que no estén en la base de datos (tipos, noticias, definiciones) y cita la fuente.
REGLA: si el usuario pide explícitamente buscar en internet, leer una página o datos actuales/externos, USA OBLIGATORIAMENTE buscar_web o leer_web antes de responder. No respondas de memoria cuando te pidan consultar la web.
Hoy es ${hoyISO()}. Responde en español, estructurado con titulares y bullets, máximo 250 palabras.`;

export async function cerebro(pregunta) {
  const t0 = Date.now();
  const messages = [
    { role: "system", content: SISTEMA_CEREBRO },
    { role: "user", content: pregunta },
  ];
  const usadas = [];
  let final = "";
  for (let i = 0; i < 6; i++) {
    const r = await ollamaChat({ model: CEREBRO, messages, tools: TOOLS, think: true, numCtx: 8192, temp: 0.4 });
    const msg = r.message;
    messages.push(msg);
    const calls = msg.tool_calls ?? [];
    if (process.env.IA_DEBUG) {
      console.error(`[cerebro] iter ${i}: tools=${calls.map((c) => c.function.name).join(",") || "ninguna"} thinking=${(msg.thinking || "").slice(0, 120)}`);
    }
    if (calls.length === 0) {
      final = msg.content;
      break;
    }
    for (const c of calls) {
      usadas.push(c.function.name);
      let resultado;
      try {
        resultado = await ejecutarHerramienta(c.function.name, c.function.arguments ?? {});
      } catch (e) {
        resultado = { error: `la herramienta ${c.function.name} falló: ${e.message}` };
      }
      messages.push({ role: "tool", content: JSON.stringify(resultado).slice(0, 6000) });
    }
  }
  if (!final) final = "He consultado la base de datos pero no he llegado a una conclusión. Prueba con una pregunta más concreta.";
  // La VOZ lo dice en voz alta: reescritura breve y accionable
  let presentacion = final;
  try {
    const v = await ollamaChat({
      model: VOZ,
      messages: [
        { role: "system", content: "Reescribe el análisis en 4-6 líneas máximo, tono directo de comercial a comercial, con lo más importante primero y el siguiente paso al final. En español." },
        { role: "user", content: final.slice(0, 4000) },
      ],
      think: false,
    });
    presentacion = v.message.content.trim() || final;
  } catch {
    /* si falla la voz, se sirve el análisis tal cual */
  }
  return {
    respuesta: presentacion,
    analisis: final,
    herramientas: [...new Set(usadas)],
    modelo: `${CEREBRO} + ${VOZ}`,
    ms: Date.now() - t0,
  };
}

export const IA_MODELOS = { voz: VOZ, cerebro: CEREBRO };
