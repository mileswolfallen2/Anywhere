import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import {
  PROTOCOL_VERSION,
  ClipboardPayload,
  ClientMessage,
  ServerMessage,
} from '@anywhere/shared';

const PORT = Number(process.env.ANYWHERE_PORT ?? 8777);
const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'clipboard.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

let latest: ClipboardPayload | null = null;

function loadState(): void {
  try {
    latest = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as ClipboardPayload;
  } catch {
    latest = null;
  }
}

function saveState(): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(latest));
}

loadState();

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, protocolVersion: PROTOCOL_VERSION, devices: wss.clients.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

function send(ws: WebSocket, msg: ServerMessage): void {
  ws.send(JSON.stringify(msg));
}

wss.on('connection', (ws) => {
  send(ws, { kind: 'welcome', serverVersion: String(PROTOCOL_VERSION) });

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      send(ws, { kind: 'error', message: 'invalid JSON' });
      return;
    }

    switch (msg.kind) {
      case 'ping':
        send(ws, { kind: 'pong' });
        break;

      case 'push': {
        latest = { ...msg.payload, ts: Date.now() };
        saveState();
        for (const client of wss.clients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            send(client, { kind: 'clipboard', payload: latest });
          }
        }
        break;
      }

      case 'get':
        send(ws, { kind: 'clipboard', payload: latest });
        break;

      case 'pair':
        send(ws, { kind: 'paired' });
        break;
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[anywhere] relay listening on http://0.0.0.0:${PORT}`);
});