# J.A.R.V.I.S. CRM

CRM comercial completo: clientes con cobertura, pipeline de oportunidades con ofertas
versionadas, acciones con calendario y fotos, tareas, KPIs, informes y configuración.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 + Recharts
- **Backend local:** Node + Express + SQLite (`better-sqlite3`)
- **BD:** `data/crm.db` (se crea sola al arrancar, con datos demo)

## Arranque rápido

```bash
./dev.sh
```

Hace todo: instala dependencias si faltan, prepara la BD con datos demo,
levanta Ollama si está caído (temporal, se apaga al salir; si ya corre como
servicio lo reutiliza sin apagarlo), precalienta los modelos de IA, arranca la
API en `:3001` y el frontend en `:5173` expuesto a tu red local.
`Ctrl+C` lo para todo.

Red local: el frontend escucha en todas las interfaces, así que desde otro
dispositivo de tu red abre `http://<IP-de-este-PC>:5173` (el script la muestra
al arrancar). Si instalas `avahi-utils`, además publica el alias
`http://JARVISCRM.local:5173` (lo resuelven Windows, macOS, iOS y Linux;
Android normalmente no).

Manual (2 terminales):

```bash
npm run server   # API + SQLite → http://localhost:3001/api/health
npm run dev      # frontend → http://localhost:5173
```

## Scripts

| Comando          | Qué hace                              |
| ---------------- | ------------------------------------- |
| `./dev.sh`       | Todo de una (recomendado)             |
| `npm run server` | Solo la API                           |
| `npm run dev`    | Solo el frontend (usa proxy a `/api`) |
| `npm run build`  | Compila a `dist/` (el server la sirve)|
| `npm run lint`   | Linter (0 errores)                    |

## Módulos

| Ruta             | Módulo         | Datos |
| ---------------- | -------------- | ----- |
| `/dashboard`     | Centro de mando| API + fallback mock |
| `/clientes`      | Clientes, cobertura y caritas 😊😐☹ | SQLite |
| `/oportunidades` | Pipeline kanban/lista + drag & drop | SQLite |
| `/ofertas`       | Listado de presupuestos versionados | SQLite |
| `/acciones`      | Llamadas, reuniones, visitas, tareas + fotos | SQLite |
| `/calendario`    | Día/semana/mes arrastrable | SQLite |
| `/tareas`        | Lista visual con responsables y prioridades | SQLite |
| `/kpis`          | Indicadores calculados en vivo | SQLite |
| `/informes`      | Tablas + export CSV | SQLite |
| `/configuracion` | Etapas del pipeline y coberturas (CRUD) | SQLite |

## API (resumen)

- `GET /api/health` · `GET /api/search?q=`
- Clientes: `GET/POST /api/clientes`, `PUT/DELETE /api/clientes/:id`,
  `POST /api/clientes/:id/contacto` · `GET /api/coberturas` (+ CRUD)
- Oportunidades: `GET/POST /api/oportunidades`, `PUT /api/oportunidades/:id`,
  `POST :id/cerrar|reabrir`, `GET :id/ofertas`, `POST :id/ofertas`
- Ofertas: `GET /api/ofertas`, `PUT /api/ofertas/:id`,
  `PUT :id/activar|estado`, `DELETE /api/ofertas/:id`
- Acciones: `GET/POST /api/acciones`, `PUT/DELETE /api/acciones/:id`,
  `POST :id/estado`, fotos `GET/POST /api/acciones/:id/fotos`,
  `GET /api/fotos/:id`, `DELETE /api/fotos/:id`
- Dashboard: `/api/kpi-cards`, `/api/ventas-mensuales`, `/api/kpis-circulares`,
  `/api/pipeline-etapas` (+ CRUD), `/api/actividades`, `/api/notificaciones`,
  `/api/empresas`, `/api/contactos`

Reglas de negocio principales: una sola oferta activa por oportunidad (hereda
importe y etapa), máquina de estados de oferta con versiones, cierre
Ganada/Perdida con motivo, y semáforo de cobertura por caritas.

## IA local (Ollama)

Dos mentes, todo en local sin claves ni nube:

| Mente | Modelo | Uso | Latencia medida |
| ----- | ------ | --- | --------------- |
| VOZ | `qwen3:1.7b` (GPU 100%) | chat instantáneo | ~0,5 s |
| CEREBRO | `qwen3.5` (thinking) | piensa y consulta la BD con herramientas | ~15-30 s |

Requisitos: [Ollama](https://ollama.com) corriendo (`ollama serve`) con los
modelos descargados (`ollama pull qwen3:1.7b`). Variables opcionales:
`OLLAMA_URL`, `IA_RAPIDO`, `IA_CEREBRO`.

Endpoints: `GET /api/ia/estado`, `POST /api/ia/chat {mensaje, historial}`,
`POST /api/ia/cerebro {pregunta, historial}` (devuelve respuesta presentadal
por la VOZ + análisis + herramientas usadas + `navegar` si hay que cambiar de
pantalla), `POST /api/ia/dormir` (descarga los modelos de la GPU y libera la
VRAM; despiertan solos al usarlos). El panel J.A.R.V.I.S. tiene selector
**AUTO** (decide solo) / **LIGHT** (siempre el rápido) / **SMART** (siempre el
grande), navega por voz ("abre clientes", "ve al calendario") y lee las
respuestas en voz alta. Clic en un cliente abre su **ficha** (`/clientes/:id`)
con KPIs, oportunidades, ofertas y acciones filtrados más botones para crear
oportunidad, oferta y acción. El CEREBRO dispone de 14 herramientas: 8 de lectura
sobre la BD, `buscar_web` y `leer_web`, más `resolver_fecha` (fechas en
palabras como "el jueves"), `crear_cliente`, `crear_accion` (llamadas,
reuniones, visitas, tareas) e `ir_a` (navegación). Si falta un dato (p. ej. la
hora), lo pregunta y completa en el turno siguiente con el contexto. Botón de oreja para **manos libres**: escucha en
continuo y solo reacciona al oír "JARVIS" (confirma con "Dime", capta el
comando tras 2,5 s de silencio y lo ejecuta).

Futuro (perfil banca): ingesta de Excel (inversiones, cuentas, rendimientos) a
tablas para que el CEREBRO cruce productos con clientes y organice la agenda.

## Estructura

```
server/        API Express + SQLite (db.js: esquema, migraciones y seeds)
data/          crm.db + fotos/ (ignorado en git)
src/
  pages/       una página por módulo
  components/  dashboard, layout, ai, oportunidades
  lib/         api.ts (cliente HTTP), cobertura.ts (caritas)
  data/        mockData.ts (tipos + fallback si la API está apagada)
```
