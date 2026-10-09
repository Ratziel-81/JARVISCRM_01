#!/usr/bin/env bash
# Arranca todo el proyecto de una vez: Ollama + API (Express + SQLite) + frontend (Vite).
# - Si Ollama ya está corriendo (p. ej. servicio del sistema), lo reutiliza y NO lo apaga.
# - Si está caído, levanta un `ollama serve` temporal que se apaga con Ctrl+C.
# Uso: ./dev.sh
set -euo pipefail
cd "$(dirname "$0")"

command -v node >/dev/null || { echo "ERROR: falta node" >&2; exit 1; }
command -v npm >/dev/null || { echo "ERROR: falta npm" >&2; exit 1; }

[ -d node_modules ] || { echo "==> instalando dependencias…"; npm install; }

echo "==> preparando BD local…"
node server/seed-clientes.mjs

cleanup() { kill $OLLAMA_PID $API_PID $WEB_PID $MDNS_PID 2>/dev/null || true; }
trap cleanup INT TERM EXIT
OLLAMA_PID=""
API_PID=""
WEB_PID=""
MDNS_PID=""

# --- Ollama (IA local) ---
if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "==> ollama ya corriendo, lo reutilizo (no se apagará al salir)"
else
  command -v ollama >/dev/null || { echo "AVISO: ollama no instalado, la IA quedará no disponible" >&2; }
  if command -v ollama >/dev/null; then
    echo "==> arrancando ollama temporal para esta sesión…"
    ollama serve > /tmp/ollama-crm.log 2>&1 &
    OLLAMA_PID=$!
    for _ in $(seq 1 30); do
      curl -sf http://localhost:11434/api/tags >/dev/null 2>&1 && break
      sleep 0.5
    done
    curl -sf http://localhost:11434/api/tags >/dev/null 2>&1 \
      && echo "==> ollama listo (se apagará al salir)" \
      || echo "AVISO: ollama no responde, la IA quedará no disponible" >&2
  fi
fi

if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "==> precalentando modelos IA en segundo plano…"
  (
    for m in "${IA_RAPIDO:-qwen3:1.7b}" "${IA_CEREBRO:-qwen3.5}"; do
      ollama list 2>/dev/null | grep -q "^${m%%:*}:" || continue
      curl -s -X POST http://localhost:11434/api/generate \
        -H 'Content-Type: application/json' \
        -d "{\"model\":\"$m\",\"prompt\":\"ok\",\"stream\":false,\"keep_alive\":\"30m\",\"options\":{\"num_predict\":1}}" \
        > /dev/null 2>&1 || true
    done
  ) &
fi

if curl -sf http://localhost:3001/api/health >/dev/null 2>&1; then
  echo "==> API ya corriendo en :3001, la reutilizo"
  API_PID=""
else
  echo "==> arrancando API…"
  node server/index.js &
  API_PID=$!
  for _ in $(seq 1 25); do
    curl -sf http://localhost:3001/api/health >/dev/null 2>&1 && break
    sleep 0.2
  done
fi

echo "==> arrancando frontend…"
node node_modules/vite/bin/vite.js --host &
WEB_PID=$!

LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')

# alias mDNS best-effort (requiere avahi): JARVISCRM.local
if [ -n "${LAN_IP:-}" ] && command -v avahi-publish >/dev/null 2>&1; then
  avahi-publish -a JARVISCRM.local "$LAN_IP" > /tmp/avahi-crm.log 2>&1 &
  MDNS_PID=$!
fi

echo ""
echo "  IA   http://localhost:11434  (modelos: ${IA_RAPIDO:-qwen3:1.7b} + ${IA_CEREBRO:-qwen3.5})"
echo "  API  http://localhost:3001/api/health"
echo "  Web  http://localhost:5173  (clientes: /clientes)"
if [ -n "${LAN_IP:-}" ]; then
  echo "  Red  http://$LAN_IP:5173  (toda tu red local)"
  if [ -n "${MDNS_PID:-}" ] && kill -0 "$MDNS_PID" 2>/dev/null; then
    echo "  mDNS http://JARVISCRM.local:5173  (si tu red/dispositivo lo resuelve)"
  else
    echo "  (instala avahi-utils para el alias http://JARVISCRM.local:5173)"
  fi
fi
echo "  Ctrl+C para parar todo"
echo ""
wait
