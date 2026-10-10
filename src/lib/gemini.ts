// Puente con Gemini (web, sin registro): como Google prohíbe embeberlo
// (X-Frame-Options: DENY), el flujo es: copiar prompt -> abrir pestaña ->
// pegar respuesta -> importar lo entendido a la ficha.
export const GEMINI_URL = "https://gemini.google.com/app";

export function construirPromptGemini(empresa: string): string {
  return `Dame los datos básicos para crear la ficha de cliente en un CRM de la empresa ${empresa}. Responde SOLO con estas líneas, una por línea, con este formato exacto "Etiqueta: valor" (deja vacío lo que no sepas):
Nombre comercial:
Razón social:
CIF:
Sector:
Dirección:
Teléfono:
Móvil:
Email:
Web:`;
}

export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function abrirGemini(): void {
  window.open(GEMINI_URL, "_blank", "noopener");
}

export interface DatoGemini {
  nombre?: string;
  razonSocial?: string;
  cif?: string;
  sector?: string;
  direccion?: string;
  telefono?: string;
  telMovil?: string;
  email?: string;
  web?: string;
}

export interface ParseoGemini {
  datos: DatoGemini;
  encontrados: string[];
}

function normalizaEtiqueta(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[:.]/g, "")
    .trim();
}

// (las claves ya van sin tildes porque normalizaEtiqueta las quita)
const MAPA_ETIQUETAS: Record<string, keyof DatoGemini> = {
  "nombre comercial": "nombre",
  nombre: "nombre",
  empresa: "nombre",
  "razon social": "razonSocial",
  "denominacion social": "razonSocial",
  cif: "cif",
  nif: "cif",
  sector: "sector",
  actividad: "sector",
  direccion: "direccion",
  domicilio: "direccion",
  telefono: "telefono",
  tel: "telefono",
  movil: "telMovil",
  celular: "telMovil",
  email: "email",
  correo: "email",
  "correo electronico": "email",
  web: "web",
  pagina: "web",
  "pagina web": "web",
  sitio: "web",
};

export function parsearRespuestaGemini(texto: string): ParseoGemini {
  const datos: DatoGemini = {};
  const encontrados: string[] = [];
  for (const linea of texto.split("\n")) {
    const m = linea.match(/^\s*[-*•\d.)\s]*([A-Za-záéíóúñü .()/]+?)\s*:\s*(.+?)\s*$/);
    if (!m) continue;
    const campo = MAPA_ETIQUETAS[normalizaEtiqueta(m[1])];
    const valor = m[2].trim();
    if (!campo || !valor || /^(no|desconocido|n\/a|-|—)$/i.test(valor)) continue;
    if (campo === "cif" && !/^[A-Za-z0-9][\w.-]{7,}$/.test(valor)) continue;
    if (campo === "email" && !/[\w.+-]+@[\w-]+\.[\w.]+/.test(valor)) continue;
    if (datos[campo]) continue;
    datos[campo] = valor;
    encontrados.push(campo);
  }
  return { datos, encontrados };
}
