export const PROTOCOL_VERSION = 1;

export interface ClipboardPayload {
  text?: string;
  html?: string;
  ts: number;
  src: string;
}

export type ClientMessage =
  | { kind: 'push'; payload: ClipboardPayload }
  | { kind: 'get'; since?: number }
  | { kind: 'pair'; deviceId: string; displayName: string }
  | { kind: 'ping' };

export type ServerMessage =
  | { kind: 'pong' }
  | { kind: 'welcome'; serverVersion: string }
  | { kind: 'clipboard'; payload: ClipboardPayload | null }
  | { kind: 'paired' }
  | { kind: 'error'; message: string };