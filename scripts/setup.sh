#!/usr/bin/env bash
#
# Anywhere — development bootstrap
# Installs every package (server, shared, extensions, Gelectron app) so a
# contributor can go from clone to running in one command.
#
# Usage:
#   ./scripts/setup.sh
#
# Requirements: Node.js 18+ and npm (git to clone, obviously).
# Gelectron's runtime is installed as a local dependency, no sudo needed.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log()  { printf '\033[1;34m[setup]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[setup] ERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# --- 1. Prerequisites -----------------------------------------------------
log "Checking prerequisites..."

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js is not installed. Install Node 18+ first:
  macOS:  brew install node
  Linux:  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
  Windows: install from https://nodejs.org and run this script from Git Bash"
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js 18+ is required (found $(node -v)). Upgrade your Node."
fi

command -v npm >/dev/null 2>&1 || fail "npm is not installed (it ships with Node.js)."

log "Node $(node -v) / npm $(npm -v) OK"

# --- 2. Install all workspace dependencies -------------------------------
log "Installing all workspace packages (shared, server, extensions, Gelectron app)..."
npm install

# --- 3. Build every TypeScript package ------------------------------------
log "Building shared types..."
npm run build --workspace @anywhere/shared

log "Building server..."
npm run build --workspace @anywhere/server

log "Building browser extension (Chrome + Firefox)..."
npm run build --workspace @anywhere/extension

log "Building Gelectron app..."
npm run build --workspace @anywhere/app

# --- 4. Verify ------------------------------------------------------------
log "Verifying installation..."

GELECTRON_BIN="$(command -v gelectron-core || [ -x "$ROOT/node_modules/.bin/gelectron-core" ] && echo "$ROOT/node_modules/.bin/gelectron-core" || true)"
if [ -n "$GELECTRON_BIN" ]; then
  GELECTRON_VERSION="$("$GELECTRON_BIN" --version 2>/dev/null || echo "installed")"
  log "Gelectron runtime: $GELECTRON_VERSION"
else
  log "Gelectron runtime not found (expected from the app's gelectron-core devDependency)."
fi

EXT_CHROME="$ROOT/extensions/anywhere/dist/chrome/manifest.json"
EXT_FIREFOX="$ROOT/extensions/anywhere/dist/firefox/manifest.json"
if [ -f "$EXT_CHROME" ]; then log "Chrome extension:  $EXT_CHROME"; fi
if [ -f "$EXT_FIREFOX" ]; then log "Firefox extension: $EXT_FIREFOX"; fi

# --- 5. What's next -------------------------------------------------------
cat <<'EOF'

[setup] Done. You're ready to work on Anywhere.

  Run the relay server locally:
      npm run dev

  Run the relay in Docker (same image the Raspberry Pi runs):
      docker compose up --build

  Launch the native Gelectron app:
      npm run start --workspace @anywhere/app
      (Gelectron runs the Electron-compatible frontend on native webviews.)

  Rebuild the browser extension:
      npm run build --workspace @anywhere/extension
      Then load unpacked from extensions/anywhere/dist/chrome (Chrome)
      or extensions/anywhere/dist/firefox (Firefox).
EOF