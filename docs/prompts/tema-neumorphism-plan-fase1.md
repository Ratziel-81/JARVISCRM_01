# FASE 1 — Inspección y plan (tema NEUROMORPHISM_01 + selector de skins)

Fecha: 2026-10-08 · Rama: `develop` · Baseline: `npm run build` OK, `npm run lint` 0 errores (3 warnings pre-existentes).

## 1. Discrepancias con la descripción del prompt

El prompt describe bien la arquitectura, pero la realidad es más amplia:

- Hay **30 ficheros `.tsx`** en `src/`, no solo los listados. Páginas reales:
  `Dashboard, Clientes, Oportunidades, Acciones, Ofertas, Calendario, Tareas,
  Kpis, Informes, Configuracion, Placeholder`. Componentes extra no mencionados:
  `components/oportunidades/VersionOferta.tsx`, `lib/api.ts`, `lib/cobertura.ts`.
- `MainLayout.tsx` no es solo Topbar+Sidebar+contenido: incluye el **dock
  lateral de JARVIS** (`JarvisPanel` persistente) y botón flotante de reapertura.
- `Topbar.tsx` incluye buscador global contra `/api/search`, notificaciones,
  menú de usuario y menú móvil (más de lo descrito).
- `Sidebar.tsx` exporta `NAV_ITEMS` (también usado por el lint como warning
  pre-existente, igual que `QuickActions.tsx` y `VersionOferta.tsx`).
- Los datos del dashboard ya vienen de la **API SQLite** con fallback a mocks
  (`src/data/mockData.ts` conserva tipos + mocks + estilos de badges).
- Recharts se usa en `SalesChart.tsx`, `KPIOverview.tsx` (anillos SVG, no
  Recharts) y `KpisPage.tsx` (BarChart + PieChart con `contentStyle` inline).

## 2. Inventario de estilos del tema oscuro actual

Contado con `grep` sobre `src/` (30 tsx):

| Patrón | Ocurrencias | Notas |
|---|---|---|
| `text-slate-*` | ~230 | Escala completa 100–600 en 25 ficheros |
| `cyan-300` (texto/bordes/fondos) | 196 líneas | Acento principal |
| `border-white/*`, `bg-white/*` translúcidos | 95 líneas | Superficies y bordes sutiles |
| `text-white` | 34 líneas | Títulos y valores |
| `bg-[#041321]` y otros 6 hex arbitrarios oscuros | 27 (7 valores) | `#041321`×15, `#020812`×5, resto ×1 |
| glows `rgba(34,211,238` / `rgba(47,123,255` | 28 líneas | Sombras neón inline |
| Clases compartidas en `index.css` | 1 sitio | `.jarvis-panel`, `.jarvis-panel-hover`, `.tech-grid-bg`, `.hud-line`, `.section-title`, `.num-display`, animaciones, `.recharts-default-tooltip`, `::selection` |
| Badges de estado en `mockData.ts` | 6 mapas | `ESTADO_*_STYLES`, `PRIORIDAD_STYLES` (clases Tailwind oscuras) |

## 3. Estrategia de skins (decisión de arquitectura)

Requisito del usuario: `JARVIS DARK` (actual, por defecto, intacto) y
`NEUROMORPHISM_01` conviviendo con **selector global**.

1. **Selector**: `src/lib/skin.tsx` → `SkinContext` (`skin`, `setSkin`),
   skins `jarvis-dark` / `neumorphism-01`, persistencia en `localStorage`,
   `document.documentElement.dataset.theme`. Selector visible en `Topbar`
   (y réplica en Configuración). `JARVIS DARK` = valor por defecto.
2. **Atajo Tailwind v4**: los colores por defecto de Tailwind 4 son variables
   CSS (`--color-slate-100`, `--color-cyan-300`, …). Sobrescribiéndolas bajo
   `[data-theme="neumorphism-01"]` se remapean de golpe los ~230 `text-slate-*`,
   los `cyan-300` y los `white/*` (los modificadores de opacidad usan
   `color-mix` y siguen funcionando). Esto evita reescribir cientos de clases.
3. **Clases semánticas nuevas** (las que pide el prompt: `.jarvis-surface`,
   `.jarvis-card`, `.jarvis-input`, `.jarvis-button(-primary)`, `.jarvis-badge`,
   `.jarvis-section-title`, `.jarvis-icon-button`, …) definidas con variables
   para ambos temas; sustitución selectiva donde el remapeo no llegue.
4. **Casos manuales**: los 27 `bg-[#…]` arbitrarios → variables/clases
   semánticas; los 28 glows neón inline → variable `--jarvis-glow`;
   `.tech-grid-bg`, `.recharts-default-tooltip`, `::selection`, gradientes de
   `MainLayout`; Recharts (ticks/tooltips/gradientes) vía `style` con `var()`
   o paleta por tema; badges de `mockData.ts` → mapas por skin o clases
   semánticas.
5. **Regla de seguridad**: FASE 2 solo AÑADE (variables + clases + selector con
   `JARVIS DARK` por defecto) sin cambiar ni un píxel del tema actual.
   El resto de fases trabajan bajo `[data-theme="neumorphism-01"]`.

## 4. Mapeo de fases 2–8

- **FASE 2** (`index.css` + `lib/skin.tsx`): variables de los 2 temas, remapeo
  Tailwind v4, clases neumórficas, selector en Topbar. Validar: dark idéntico.
- **FASE 3** (layout): `MainLayout`, `Sidebar`, `Topbar` bajo el nuevo tema.
- **FASE 4** (dashboard): HeroBanner, KPICard, pipeline, actividad, charts
  (Recharts con `var()`), módulos secundarios intactos.
- **FASE 5** (JARVIS): `AICore`, `JarvisPanel`, `QuickActions` + dock del layout.
- **FASE 6** (páginas): las 9 páginas + `VersionOferta`; tablas claras, inputs
  hundidos, badges con significado.
- **FASE 7**: interactivos, responsive (4 anchos), `prefers-reduced-motion`,
  contraste sobre claro, `focus-visible`.
- **FASE 8**: validación final + informe de entrega.

Validación de cada fase: `npm run build`, `npm run lint`, revisión de archivos,
sin eliminar funcionalidad; informar lo no comprobable (p. ej. voz/micrófono en
entorno sin audio, revisión visual fina sin navegador).

## 5. Riesgos

- Los `bg-[#…]` arbitrarios y algunos `style={{...}}` con hex no responden al
  remapeo: requieren edición manual (listados arriba, acotados).
- Recharts/SVG necesitan `style` con `var()` (los atributos `fill` no aceptan
  `var()`); `KpiOverview` usa anillos SVG propios.
- `prefers-reduced-motion` hoy no existe: añadirlo en FASE 7.
- No tocar `server/`, modelos ni API (reglas 4, 5, 13).
