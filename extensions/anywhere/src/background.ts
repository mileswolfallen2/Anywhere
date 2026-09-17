import { PROTOCOL_VERSION, ClientMessage, ServerMessage } from '@anywhere/shared';

const DEFAULT_SERVER = 'ws://localhost:8777';
const SERVER_KEY = 'anywhere.server';
const RECONNECT_MS = 3000;

let socket: WebSocket | null = null;

async function loadServerUrl(): Promise<string> {
  const stored = await chrome.storage.local.get(SERVER_KEY);
  return (stored[SERVER_KEY] as string | undefined) ?? DEFAULT_SERVER;
}

async function connect(): Promise<void> {
  const ws = new WebSocket(await loadServerUrl());
  socket = ws;
  console.log(`[anywhere] connecting to ${ws.url}`);

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ kind: 'ping' } satisfies ClientMessage));
  });

  ws.addEventListener('message', (event) => {
    try {
      handle(JSON.parse(event.data as string) as ServerMessage);
    } catch {
      console.warn('[anywhere] ignored malformed server message');
    }
  });

  ws.addEventListener('close', () => {
    if (socket === ws) socket = null;
    setTimeout(() => void connect(), RECONNECT_MS);
  });
}

function handle(msg: ServerMessage): void {
  switch (msg.kind) {
    case 'welcome':
      console.log(`[anywhere] server protocol v${msg.serverVersion} (client v${PROTOCOL_VERSION})`);
      break;
    case 'clipboard':
      // TODO: apply via the content script — a service worker cannot reliably
      // write the OS clipboard without a focused page.
      console.log('[anywhere] clipboard update', msg.payload);
      break;
  }
}

chrome.runtime.onMessage.addListener((message: ClientMessage, _sender, sendResponse) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
    sendResponse({ ok: true });
  } else {
    sendResponse({ ok: false, reason: 'not connected' });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set({ [SERVER_KEY]: DEFAULT_SERVER });
});

void connect();