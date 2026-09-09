#!/bin/sh
set -e

# Detect environment (Docker container vs local host)
if [ -d "/app/backend" ]; then
  # Inside Docker container: start backend in background then Nginx in foreground
  cd /app/backend
  node index.js &

  # Wait until NodeJS backend is listening on port 3000
  while ! curl -s http://127.0.0.1:3000/api/health >/dev/null; do
    sleep 0.2
  done

  # Start Nginx in foreground
  exec nginx -g 'daemon off;'
else
  # Running locally on developer host
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

  echo "Starting MTG Tabletop Sync locally..."

  # Start backend in background
  cd "$SCRIPT_DIR/backend"
  node index.js &
  BACKEND_PID=$!

  # Clean up child processes on script exit or interrupt
  cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
  }
  trap cleanup INT TERM EXIT

  # Wait until backend is ready
  while ! curl -s http://127.0.0.1:3000/api/health >/dev/null; do
    sleep 0.2
  done

  echo "Backend ready on http://localhost:3000"
  echo "Starting frontend dev server..."

  # Start frontend Vite dev server (runs on http://localhost:5173)
  cd "$SCRIPT_DIR/frontend"
  npm run dev
fi
