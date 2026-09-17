import { PROTOCOL_VERSION, ClipboardPayload, ClientMessage, ServerMessage } from '@anywhere/shared';

const DEFAULT_SERVER = 'ws://localhost:8777';

const CONFIG_KEY = 'anywhere.server';

let socket: WebSocket | null = null;
let serverUrl = DEFAULT_SERVER;
let deviceName: string;

async function loadConfig(): Promise<void> {
  const stored = await chrome.storage.local.get(CONFIG_KEY);
  if (stored[CONFIG_KEY]) serverUrl = stored[CONFIG_KEY] as string;
}

async function connect(): Promise<void> {
  await loadConfig();
  console.log(`[anywhere] connecting to ${serverUrl}`);
  socket = new WebSocket(serverUrl);

  socket.onopen = () => {
    socket?.send(JSON.stringify({ kind: 'ping' } satisfies ClientMessage));
    console.log('[anywhere] connected');
  };

  socket.onmessage = (event: MessageEvent) => {
    const msg = JSON.parse(event.data as string) as ServerMessage;
    handleServerMessage(msg);
  };

  socket.onclose = () => {
    socket = null;
    setTimeout(() => void connect(), 3000);
  };
}

function handleServerMessage(msg: ServerMessage): void {
  switch (msg.kind) {
    case 'welcome':
      console.log(`[anywhere] server protocol v${msg.serverVersion} (client v${PROTOCOL_VERSION})`);
      break;

    case 'clipboard':
      // TODO(next): route to a content script / popup, since a service worker
      // cannot reliably write the OS clipboard without a focused page.
      console.log('[anywhere] clipboard update received', msg.payload);
      pushClipboard(msg.payload);
      break;
  }
}

function pushClipboard(payload: ClipboardPayload | null): void {
  if (!socket || socket.readyState !== WebSocket.OPEN || !payload) return;
  // The service worker can only push data it has permission / focus to read;
  // real capture happens in a content script (TODOs land with the feature).
}

chrome.runtime.onMessage.addListener((message: ClientMessage) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
});

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set({ [CONFIG_KEY]: DEFAULT_SERVER, deviceName: 'browser' });
});

void connect();