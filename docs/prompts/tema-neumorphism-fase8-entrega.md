# FASE 8 — Informe de entrega (skins JARVIS DARK + NEUROMORPHISM_01)

Fecha: 2026-10-08 · Rama: `develop` (pendiente de merge a `main`).

## Resumen de los cambios

El CRM mantiene intacto su tema oscuro, ahora llamado **JARVIS DARK** (por
defecto), y añade el tema claro **NEUROMORPHISM_01**, conmutables al instante
desde Configuración → Tema visual (persistencia en `localStorage`, atributo
`data-theme` en `<html>`).

- **Infraestructura** (`FASE 2`): variables CSS de ambos temas en
  `src/index.css`, remapeo de la paleta Tailwind v4 bajo
  `[data-theme="neumorphism-01"]` (~500 usos adaptados sin tocar JSX),
  9 clases semánticas reutilizables (`.jarvis-card`, `.jarvis-input`,
  `.jarvis-button(-primary)`, `.jarvis-badge`, `.jarvis-section-title`,
  `.jarvis-icon-button`, …) y `src/lib/skin.tsx` + `src/lib/skins.ts`.
- **Layout** (`FASE 3`): `MainLayout`, `Sidebar`, `Topbar` con clases
  semánticas (app, ambiente, topbar, menús, sidebar, navitem con relieve,
  campo hundido, FAB).
- **Dashboard** (`FASE 4`): los 10 componentes migrados; Recharts con paleta
  por tema (`src/lib/chartTheme.ts`); núcleo y globo con identidad intacta.
- **Asistente** (`FASE 5`): contenedor, núcleo (centro blanco en claro),
  burbujas, input, micro, acciones rápidas; lógica de voz intacta.
- **Páginas** (`FASE 6`): panel claro global, bordes blancos → gris azulado,
  formularios hundidos, selects claros, eventos de calendario, tooltip charts.
- **Accesibilidad/responsive** (`FASE 7`): `prefers-reduced-motion`, teclado
  (Tab+Enter/Espacio) en tarjetas kanban, filas, tareas, acciones y calendario,
  columnas de semana con scroll en móvil, `focus-visible` global.
- **Bugfix incluido**: la franja de prioridad de Tareas no se renderizaba ni
  en dark (las clases de borde en capas Tailwind pierden contra `.jarvis-panel`
  sin capa); ahora va con estilo inline por tema. Es el único cambio visual
  intencional sobre JARVIS DARK.

## Archivos modificados (commits de tema en `develop`)

`70a7861` selector · `5c80e92` FASE 2 · `4990825` FASE 3 · `1987c8f` FASE 4 ·
`0c90754` FASE 5 · `cfa3c47` FASE 6 · `0557b0a` FASE 7.

Tocados: `src/index.css`, `src/lib/skin.tsx`, `src/lib/skins.ts`,
`src/lib/chartTheme.ts` (nuevo), `src/main.tsx`,
`layout/MainLayout|Sidebar|Topbar`, los 10 de `dashboard/`,
`ai/AICore|JarvisPanel|QuickActions`, `oportunidades/VersionOferta`,
9 páginas (`Acciones, Calendario, Clientes, Configuracion, Informes, Kpis,
Ofertas, Oportunidades, Tareas`), más docs en `docs/prompts/`.

## Funcionalidades conservadas (verificado)

Rutas, modelos, API y `server/` intactos (`git diff` sin `server/`,
`App.tsx`, `package.json` ni `mockData.ts` en cambios de lógica; solo
clases/estilos). Voz, dictado, manos libres, PARAR, dormir IA, CRUDs,
drag&drop, calendario arrastrable, fotos y export CSV sin cambios de lógica.

## Validación ejecutada (resultados reales)

- `npm run build` → OK (`✓ built`, ~500 ms).
- `npm run lint` → 0 errores (4 warnings del patrón pre-existente:
  `Sidebar`, `QuickActions`, `VersionOferta`, `skin.tsx`).
- `./dev.sh` → 10/10 rutas HTTP 200, `/api/health` OK, `/api/ia/estado` OK.
- `git diff --stat` por fase revisado; sin eliminaciones de lógica.
- Contrastes medidos en claro: texto principal 8.9:1; secundarios ~3.3:1
  (paleta del prompt, solo microcopy decorativo).

## No verificado aquí (requiere navegador/dispositivo del usuario)

- Revisión visual píxel a píxel en ambos temas y en los 4 anchos.
- Micrófono, síntesis de voz y manos libres (sin audio en este entorno).
- Latencias reales de IA con los modelos calientes.

## Pendientes / siguientes pasos

1. Revisión visual del usuario en NEUROMORPHISM_01 y ajustes finos.
2. Merge `develop` → `main` cuando se apruebe.
3. Futuro (fuera de este prompt): ingesta del Excel de banca para el CEREBRO.
