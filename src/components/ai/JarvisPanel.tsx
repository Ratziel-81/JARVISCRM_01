import { Ear, Mic, Moon, Send, Square, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { respuestasIA } from "../../data/mockData";
import AICore from "./AICore";
import QuickActions from "./QuickActions";

interface Mensaje {
  id: number;
  de: "jarvis" | "user";
  texto: string;
  meta?: string;
}

type Mente = "voz" | "cerebro";

// Piloto automático: decide la mente según la pregunta.
// VOZ para saludos y foto rápida; CEREBRO para análisis, agenda, listas y comparativas.
function clasificar(pregunta: string): Mente {
  const t = pregunta.toLowerCase();
  if (/rápido|rapido|\bvoz\b/.test(t)) return "voz"; // forzar: "dímelo por voz"
  if (/cerebro|profund/.test(t)) return "cerebro"; // forzar: "pásalo al cerebro"
  if (t.length > 140) return "cerebro";
  return /agenda|organiz|planific|analiz|análisis|compara|recomien|ofrec|prioriz|estrateg|detal|\blista\b|vence|desatend|\bkpi\b|informe|semana|trimestre|quién|quiénes|por qué|cuáles/i.test(t)
    ? "cerebro"
    : "voz";
}

// Navegación por voz: "abre clientes", "ve al calendario", "muéstrame las ofertas"...
const MODULOS: Array<{ nombres: string[]; ruta: string; nombre: string }> = [
  { nombres: ["oportunidades", "oportunidad"], ruta: "/oportunidades", nombre: "Oportunidades" },
  { nombres: ["ofertas", "oferta", "presupuestos"], ruta: "/ofertas", nombre: "Ofertas" },
  { nombres: ["acciones", "accion"], ruta: "/acciones", nombre: "Acciones" },
  { nombres: ["calendario"], ruta: "/calendario", nombre: "Calendario" },
  { nombres: ["tareas", "tarea"], ruta: "/tareas", nombre: "Tareas" },
  { nombres: ["kpis", "kpi"], ruta: "/kpis", nombre: "KPIs" },
  { nombres: ["informes", "informe"], ruta: "/informes", nombre: "Informes" },
  { nombres: ["configuracion", "configuración", "ajustes"], ruta: "/configuracion", nombre: "Configuración" },
  { nombres: ["clientes", "cliente"], ruta: "/clientes", nombre: "Clientes" },
  { nombres: ["dashboard", "inicio", "principal"], ruta: "/dashboard", nombre: "Dashboard" },
];
const VERBO_NAV = /\b(abre|abrir|ve|vete|ir|muestra|muéstrame|muestrame|llévame|llevame|enséñame|ensename|pon|vamos)\b/;

function extraerNavegacion(texto: string): { ruta: string; nombre: string; puro: boolean } | null {
  const t = texto.toLowerCase();
  if (!VERBO_NAV.test(t)) return null;
  for (const m of MODULOS) {
    if (!m.nombres.some((n) => t.includes(n))) continue;
    let resto = t.replace(VERBO_NAV, " ").replace(/\b(por favor|el|la|los|las|al|a|de|del|un|una|módulo|modulo|apartado|sección|seccion|pantalla|vista)\b/g, " ");
    for (const mm of MODULOS) for (const n of mm.nombres) resto = resto.split(n).join(" ");
    resto = resto.replace(/\s+/g, " ").trim();
    return { ruta: m.ruta, nombre: m.nombre, puro: resto.length <= 2 };
  }
  return null;
}

interface ResultadoVoz {
  results: Array<Array<{ transcript: string }>>;
}
interface Reconocedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: ResultadoVoz) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function reconocerVoz(): new () => Reconocedor {
  const w = window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor };
  const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!SR) throw new Error("Tu navegador no soporta dictado por voz. Usa Chrome o Edge.");
  return SR;
}
function textoParaVoz(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,4}\s+/gm, "")
    .replace(/^[-*•]\s+/gm, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

const SALUDO: Mensaje = {
  id: 0,
  de: "jarvis",
  texto: "En línea, con voz y acceso a tu base de datos. Pregunta lo que sea: respondo al instante o pienso en profundidad según lo que pidas.",
};

const PREGUNTAS: Record<string, string> = {
  clientes: "Dame el resumen de mi cartera de clientes",
  oportunidades: "¿Qué oportunidades abiertas tengo y cuáles priorizo?",
  oferta: "¿Qué ofertas tengo enviadas y cuáles vencen pronto?",
  llamada: "Organiza mi agenda de hoy: ¿qué hago primero y por qué?",
  kpis: "Dame los KPIs clave del negocio",
};

let nextId = 1;

export default function JarvisPanel({ onCerrar }: { onCerrar?: () => void }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO]);
  const [pensando, setPensando] = useState(false);
  const [usando, setUsando] = useState<Mente>("voz");
  const [forzado, setForzado] = useState<"auto" | "light" | "smart">("auto");
  const [vozAlta, setVozAlta] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [manosLibres, setManosLibres] = useState(false);
  const [despierto, setDespierto] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<Reconocedor | null>(null);
  const manosLibresRef = useRef(false);
  const despiertoRef = useRef(false);
  const comandoRef = useRef("");
  const silencioRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hablandoRef = useRef(false);
  const [hablando, setHablando] = useState(false);
  // espejos para callbacks estables (efectos y reconocimiento)
  const mensajesRef = useRef<Mensaje[]>([SALUDO]);
  const pensandoRef = useRef(false);
  const vozAltaRef = useRef(true);

  const agregarMensaje = useCallback((m: Mensaje) => {
    mensajesRef.current = [...mensajesRef.current, m];
    setMensajes(mensajesRef.current);
  }, []);

  // Decir en voz alta con seguimiento de estado (para el botón Parar y el anti-bucle)
  const decir = useCallback(
    (texto: string) => {
      if (!vozAltaRef.current) return;
      try {
        const synth = window.speechSynthesis;
        if (!synth) return;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(textoParaVoz(texto));
        u.lang = "es-ES";
        const vozEs = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith("es"));
        if (vozEs) u.voice = vozEs;
        u.rate = 1.05;
        u.onstart = () => {
          hablandoRef.current = true;
          setHablando(true);
        };
        const fin = () => {
          hablandoRef.current = false;
          setHablando(false);
        };
        u.onend = fin;
        u.onerror = fin;
        synth.speak(u);
      } catch {
        /* sin síntesis */
      }
    },
    [],
  );

  // Parar todo: calla la voz, aborta la petición en curso y limpia el comando
  const pararTodo = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* sin síntesis */
    }
    hablandoRef.current = false;
    setHablando(false);
    abortRef.current?.abort();
    abortRef.current = null;
    comandoRef.current = "";
    despiertoRef.current = false;
    setDespierto(false);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, pensando]);

  // al desmontar, callar
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const navigate = useNavigate();

  const enviar = useCallback(
    async (texto: string) => {
      const pregunta = texto.trim();
      if (!pregunta || pensandoRef.current) return;
      // navegación por voz: si pide ir a un módulo, vamos; si solo era eso, avisamos en local
      const nav = extraerNavegacion(pregunta);
      if (nav) navigate(nav.ruta);
      const mente: Mente = forzado === "auto" ? clasificar(pregunta) : forzado === "smart" ? "cerebro" : "voz";
      const historial = mensajesRef.current.slice(-8).map((m) => ({ rol: m.de === "user" ? "yo" : "jarvis", texto: m.texto }));
      agregarMensaje({ id: nextId++, de: "user", texto: pregunta });
      setInput("");
      if (nav?.puro) {
        const ack = `Abriendo ${nav.nombre}.`;
        agregarMensaje({ id: nextId++, de: "jarvis", texto: ack, meta: "navegación por voz" });
        decir(ack);
        return;
      }
      pensandoRef.current = true;
      setPensando(true);
      setUsando(mente);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      // POST que propaga el mensaje real del servidor (no solo el estado HTTP)
      async function postIA(url: string, body: unknown) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`);
        return d;
      }
      try {
        window.speechSynthesis?.cancel();
        if (mente === "cerebro") {
          const d = await postIA("/api/ia/cerebro", { pregunta, historial });
          agregarMensaje({
            id: nextId++,
            de: "jarvis",
            texto: d.respuesta,
            meta: `${d.modelo} · ${(d.ms / 1000).toFixed(1)}s · ${d.herramientas?.join(", ") ?? ""}`,
          });
          if (d.navegar) navigate(d.navegar);
          decir(d.respuesta);
        } else {
          const d = await postIA("/api/ia/chat", { mensaje: pregunta, historial });
          agregarMensaje({
            id: nextId++,
            de: "jarvis",
            texto: d.respuesta,
            meta: `${d.modelo} · ${(d.ms / 1000).toFixed(1)}s`,
          });
          decir(d.respuesta);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          agregarMensaje({ id: nextId++, de: "jarvis", texto: "⏹ Detenido.", meta: "parado por ti" });
        } else {
          // sin API o fallo interno: se muestra el motivo real + fallback local
          const motivo = e instanceof Error ? e.message : "error desconocido";
          const key = Object.keys(PREGUNTAS).find((k) => PREGUNTAS[k] === pregunta);
          const fb = (key && respuestasIA[key]) || "Te respondo en local.";
          agregarMensaje({ id: nextId++, de: "jarvis", texto: fb, meta: `fallo: ${motivo.slice(0, 140)}` });
          decir(fb);
        }
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        pensandoRef.current = false;
        setPensando(false);
      }
    },
    [agregarMensaje, decir, navigate, forzado],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    enviar(input);
  }

  // Dictado por micro: transcribe y lo envía solo al chat
  function alternarMicro() {
    if (escuchando) {
      recogRef.current?.stop();
      return;
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* sin síntesis */
    }
    let SR: new () => Reconocedor;
    try {
      SR = reconocerVoz();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Sin dictado por voz");
      return;
    }
    const rec = new SR();
    rec.lang = "es-ES";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recogRef.current = rec;
    rec.onresult = (e) => {
      setEscuchando(false);
      const texto = e.results?.[0]?.[0]?.transcript?.trim() ?? "";
      if (texto) enviar(texto);
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    setEscuchando(true);
    rec.start();
  }

  // --- manos libres: escucha continua, solo reacciona a "JARVIS" ---
  useEffect(() => {
    manosLibresRef.current = manosLibres;
    if (!manosLibres) return;
    window.speechSynthesis?.cancel();

    const parar = () => {
      if (silencioRef.current) clearTimeout(silencioRef.current);
      silencioRef.current = null;
      try {
        recogRef.current?.stop();
      } catch {
        /* ya parado */
      }
      recogRef.current = null;
      despiertoRef.current = false;
      comandoRef.current = "";
      setDespierto(false);
      setEscuchando(false);
    };

    const vaciarComando = () => {
      const cmd = comandoRef.current
        .replace(/^(oye|eh|oye jarvis|eh jarvis|jarvis)[\s,]*/i, "")
        .replace(/\bjarvis\b/gi, "")
        .trim();
      comandoRef.current = "";
      setDespierto(false);
      despiertoRef.current = false;
      // orden directa de parada por voz: no va a la IA
      if (/^(para|para ya|parate|para eso|cállate|callate|silencio|stop|basta)\b/i.test(cmd)) {
        pararTodo();
        return;
      }
      if (cmd) enviar(cmd);
    };

    const arrancar = () => {
      let SR: new () => Reconocedor;
      try {
        SR = reconocerVoz();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Sin dictado por voz");
        setManosLibres(false);
        return;
      }
      const rec = new SR();
      rec.lang = "es-ES";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      recogRef.current = rec;
      rec.onresult = (e) => {
        // anti-bucle: mientras habla, el micro oye al altavoz → se ignora
        if (hablandoRef.current) return;
        let texto = "";
        for (const r of Array.from(e.results ?? [])) texto += `${r?.[0]?.transcript ?? ""} `;
        if (!despiertoRef.current) {
          if (/jarvis/i.test(texto)) {
            despiertoRef.current = true;
            comandoRef.current = "";
            setDespierto(true);
            decir("Dime");
          }
          return;
        }
        comandoRef.current = texto;
        if (silencioRef.current) clearTimeout(silencioRef.current);
        silencioRef.current = setTimeout(vaciarComando, 2500); // 2,5 s callado = fin del comando
      };
      rec.onerror = () => {};
      rec.onend = () => {
        // el navegador corta la escucha cada cierto tiempo: reenganchar
        setTimeout(() => {
          if (!manosLibresRef.current) return;
          try {
            arrancar();
          } catch {
            /* reintento en el siguiente ciclo */
          }
        }, 400);
      };
      setEscuchando(true);
      rec.start();
    };

    arrancar();
    return () => {
      manosLibresRef.current = false;
      parar();
    };
  }, [manosLibres, enviar, decir, pararTodo]);

  // Dormir la IA: libera la GPU; despierta sola al hablarle
  async function dormir() {
    try {
      window.speechSynthesis?.cancel();
      const res = await fetch("/api/ia/dormir", { method: "POST" });
      const d = await res.json();
      const texto =
        d.dormidos?.length > 0
          ? `IA dormida: ${d.dormidos.join(", ")} fuera de la GPU, VRAM libre. Me despierto sola cuando me hables.`
          : "La IA ya estaba dormida.";
      agregarMensaje({ id: nextId++, de: "jarvis", texto, meta: "bajo consumo" });
      decir(texto);
    } catch {
      alert("No se pudo dormir la IA.");
    }
  }

  return (
    <aside
      className="jarvis-assistant anim-rise stagger-2 relative flex h-full min-h-[560px] flex-col overflow-hidden rounded-2xl p-5"
      aria-label="Asistente J.A.R.V.I.S."
    >
      <div className="tech-grid-bg absolute inset-0 opacity-70" aria-hidden />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{ background: "radial-gradient(300px 200px at 50% 0%, rgba(34,211,238,.14), transparent 70%)" }}
      />

      <div className="relative text-center">
        {onCerrar && (
          <button
            onClick={onCerrar}
            title="Cerrar panel (la conversación se conserva)"
            aria-label="Cerrar panel"
            className="absolute right-0 top-0 rounded-lg p-1.5 text-slate-500 transition hover:text-slate-200"
          >
            <X size={16} />
          </button>
        )}
        <p className="font-mono text-[10px] tracking-[0.34em] text-cyan-300/80">NÚCLEO ACTIVO</p>
        <h2 className="mt-0.5 text-xl font-extrabold tracking-[0.12em] text-slate-100">
          J.A.R.V.I.S.
        </h2>
        <p className="text-xs text-slate-400">Asistente Virtual</p>
        {/* piloto automático + voz */}
        <div className="mx-auto mt-2 flex w-fit items-center gap-1 overflow-hidden rounded-full border border-cyan-300/15 px-1 py-1">
          <select
            value={forzado}
            onChange={(e) => setForzado(e.target.value as "auto" | "light" | "smart")}
            title="AUTO decide solo · LIGHT siempre el rápido · SMART siempre el grande"
            aria-label="Elegir cerebro"
            className="cursor-pointer bg-transparent px-1 font-mono text-[10px] tracking-widest text-cyan-200/80 outline-none"
          >
            <option value="auto">AUTO</option>
            <option value="light">LIGHT</option>
            <option value="smart">SMART</option>
          </select>
          <span className="px-1 font-mono text-[10px] tracking-widest text-cyan-200/80" title="Mente en uso">
            {manosLibres
              ? despierto
                ? "TE ESCUCHO"
                : "DI «JARVIS»"
              : forzado === "auto"
                ? usando === "cerebro"
                  ? "CEREBRO"
                  : "VOZ"
                : forzado === "smart"
                  ? "SMART"
                  : "LIGHT"}
          </span>
          <button
            onClick={() => setManosLibres((v) => !v)}
            title={manosLibres ? "Apagar manos libres" : "Manos libres: se activa al oír «JARVIS»"}
            aria-label={manosLibres ? "Apagar manos libres" : "Activar manos libres"}
            aria-pressed={manosLibres}
            className={`rounded-full p-1.5 transition ${manosLibres ? (despierto ? "animate-pulse bg-red-400/20 text-red-200" : "bg-cyan-300/20 text-cyan-100") : "text-slate-500 hover:text-slate-300"}`}
          >
            <Ear size={13} />
          </button>
          <button
            onClick={() => {
              const siguiente = !vozAlta;
              vozAltaRef.current = siguiente;
              setVozAlta(siguiente);
              if (!siguiente) window.speechSynthesis?.cancel();
            }}
            title={vozAlta ? "Silenciar voz" : "Activar voz"}
            aria-label={vozAlta ? "Silenciar voz" : "Activar voz"}
            aria-pressed={vozAlta}
            className={`rounded-full p-1.5 transition ${vozAlta ? "bg-cyan-300/20 text-cyan-100" : "text-slate-500 hover:text-slate-300"}`}
          >
            {vozAlta ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          <button
            onClick={dormir}
            title="Dormir IA: libera la GPU hasta que vuelvas a hablar"
            aria-label="Dormir IA"
            className="rounded-full p-1.5 text-slate-500 transition hover:text-slate-300"
          >
            <Moon size={13} />
          </button>
        </div>
      </div>

      <div className="relative mt-3">
        <AICore active={pensando} />
      </div>

      {/* onda audio */}
      <div className="relative mt-2 flex h-8 items-center justify-center gap-1" aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="anim-wave-bar w-[3px] rounded-full bg-gradient-to-t from-cyan-500/40 to-cyan-200"
            style={{ height: `${8 + Math.abs(14 - i) * 1.6}px`, animationDelay: `${(i % 9) * 0.12}s` }}
          />
        ))}
      </div>

      {/* conversación */}
      <div ref={scrollRef} className="relative mt-2 max-h-52 min-h-[104px] flex-1 space-y-2 overflow-y-auto pr-1" aria-live="polite">
        {mensajes.slice(-6).map((m) =>
          m.de === "jarvis" ? (
            <div key={m.id} className="jarvis-msg rounded-xl rounded-tl-sm p-3 text-[13px] leading-relaxed">
              <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-cyan-300">J.A.R.V.I.S.</span>
              <span className="whitespace-pre-wrap">“{m.texto}”</span>
              {m.meta && <span className="mt-1.5 block font-mono text-[9px] tracking-widest text-slate-500">{m.meta}</span>}
            </div>
          ) : (
            <div key={m.id} className="jarvis-msg-user ml-8 rounded-xl rounded-tr-sm p-2.5 text-[13px] text-slate-200">
              {m.texto}
            </div>
          ),
        )}
        {pensando && (
          <div className="flex items-center gap-1.5 rounded-xl border border-cyan-300/20 bg-cyan-300/[.07] p-3">
            {[0, 1, 2].map((d) => (
              <span key={d} className="anim-breathe h-1.5 w-1.5 rounded-full bg-cyan-300" style={{ animationDelay: `${d * 0.25}s` }} />
            ))}
            <span className="ml-1 font-mono text-[10px] tracking-widest text-cyan-200/70">
              {usando === "cerebro" ? "CEREBRO PENSANDO… CONSULTA LA BD" : "RESPONDIENDO…"}
            </span>
          </div>
        )}
      </div>

      {/* entrada libre */}
      <form onSubmit={onSubmit} className="relative mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta lo que sea…"
          disabled={pensando}
          className="jarvis-field min-w-0 flex-1 rounded-xl border border-cyan-300/20 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-300/50 disabled:opacity-50"
          aria-label="Preguntar a J.A.R.V.I.S."
        />
        <button
          type="button"
          onClick={alternarMicro}
          title={escuchando ? "Dejar de escuchar" : "Dictar por micro"}
          aria-label={escuchando ? "Dejar de escuchar" : "Dictar por micro"}
          aria-pressed={escuchando}
          className={`jarvis-icon-button p-2 ${
            escuchando
              ? "animate-pulse border-red-300/60 bg-red-400/20 text-red-200"
              : "hover:border-cyan-300/40 hover:text-cyan-100"
          }`}
        >
          <Mic size={15} />
        </button>
        <button
          type="submit"
          disabled={pensando || !input.trim()}
          className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 p-2 text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
          aria-label="Enviar"
        >
          <Send size={15} />
        </button>
        {(pensando || hablando || escuchando || despierto) && (
          <button
            type="button"
            onClick={pararTodo}
            title="Parar: calla la voz y cancela la petición"
            aria-label="Parar"
            className="flex items-center gap-1.5 rounded-xl border border-red-300/50 bg-red-400/15 px-3 py-2 text-xs font-bold tracking-widest text-red-200 transition hover:bg-red-400/25"
          >
            <Square size={13} fill="currentColor" /> PARAR
          </button>
        )}
      </form>

      <div className="relative mt-2">
        <QuickActions
          pending={pensando}
          onSelect={(id) => {
            const labels: Record<string, string> = {
              clientes: "Resumen de clientes",
              oportunidades: "Buscar oportunidades",
              oferta: "Crear oferta",
              llamada: "Programar llamada",
              kpis: "Analizar KPIs",
            };
            enviar(PREGUNTAS[id] ?? labels[id] ?? id);
          }}
        />
      </div>

      <p className="relative mt-2 border-t border-cyan-300/10 pt-2 text-center font-mono text-[9px] tracking-[0.22em] text-slate-500">
        IA LOCAL · OLLAMA · TUS DATOS NO SALEN
      </p>
    </aside>
  );
}
