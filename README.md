# Anywhere

Apple's continuity features — Universal Clipboard, Handoff, file sharing — but cross-platform, open, and privacy-first. Start on one device, pick up on another, without being locked into Apple's ecosystem.

## How it works

Anywhere is a small set of pieces that together make device boundaries disappear:

| Piece | What it is | Tech |
|-------|------------|------|
| **Relay server** | The always-on mailbox. Devices sync clipboard and handoff data through it (over WebSockets), so copy on your phone can be pasted on your desktop even on different networks. Runs in a Docker container — on a Raspberry Pi, a home NAS, or a VPS you own. | TypeScript, Node.js, `ws` |
| **Native app** | The desktop frontend: a clipboard console and the installer that detects your browsers and installs the extension on the one you pick. Runs on native webviews (WKWebView / WebView2 / WebKitGTK), not Chromium. | [Gelectron](https://github.com/mileswolfallen2/gelectron) (Electron-compatible API) |
| **Browser extension** | Adds continuity copy/paste to Chrome and Firefox. One TypeScript source builds both versions. | TypeScript, Manifest V3 |
| **Shared protocol** | The message types every piece speaks — `push`, `get`, `pair`, `clipboard` — defined once, shared everywhere. | TypeScript types |

```
┌─────────────┐                  ┌──────────────┐                  ┌─────────────┐
│  Extension  │  ──WebSocket──▶ │  Relay server │  ──WebSocket──▶ │  Extension  │
│  (Chrome)   │                 (Docker/server) │                  │  (Firefox)  │
│  extension  │                  │              │                  │  extension  │
└─────────────┘                  └──────────────┘                  └─────────────┘
        ▲                              │                                    ▲
        └──────────────────────────────┴────────────────────────────────────┘
                               clipboard is "last write wins":
                    push once, every connected device gets it
```

## Repository layout

```
shared/              Shared protocol types (imported by everything)
server/              Relay server — TypeScript + Node.js, ships as a Docker image
  Dockerfile         Multi-stage image: builds TS, runtime has zero dev deps
  docker-compose.yml Deploy target for a Raspberry Pi
extensions/anywhere  One TS source → dist/chrome + dist/firefox manifests
app/                 Native Gelectron frontend + browser installer
scripts/setup.sh     One command dev bootstrap (installs every package)
Dockerfile           Server image for the Pi
```

## Running the relay on a Raspberry Pi

```sh
# on the Pi, from this repo:
docker compose up --build -d
```

The relay listens on port `8777` (`http://<pi-address>:8777/health` to check it), persists clipboard state in a Docker volume, and restarts on boot (`restart: unless-stopped`).

## Development

One command installs every package — server, shared, extensions, and the Gelectron runtime (installed locally, no sudo):

```sh
./scripts/setup.sh
```

That runs `npm install` across all npm workspaces, builds each TypeScript package, and verifies the Gelectron runtime and extension bundles.

Then:

```sh
npm run dev        # run the relay server locally (also used inside Docker)
npm run start --workspace @anywhere/app   # launch the native app
npm run build --workspace @anywhere/extension  # rebuild Chrome + Firefox bundles
```

To load the extension in a browser, use "Load unpacked" and point it at `extensions/anywhere/dist/chrome` or `extensions/anywhere/dist/firefox`. The native app will automate this.

> Prerequisites: Node.js 18+, npm. No Rust toolchain needed — Gelectron's prebuilt native binary comes from npm.

## Status

Early development. The skeleton — monorepo, relay server with clipboard mailbox, Docker image, Gelectron frontend shell, and the dual-build extension — is in place. The copy/paste feature wiring between extension → relay → extension is next.

## Roadmap

- **Phase 1 (current)** — Clipboard sync end to end: extension → relay → extension, plus the Gelectron installer choosing a browser.
- **Phase 2** — Device pairing, E2E encryption (server becomes a dumb encrypted mailbox).
- **Phase 3** — Handoff + instant file transfer.
- **Phase 4** — Phone-as-camera, tethering, polish.

## License

Currently under the custom terms in [LICENSE](LICENSE). The intent is to eventually release under an **MIT license**.