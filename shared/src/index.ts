export const PROTOCOL_VERSION = 1;

export interface ClipboardPayload {
  text?: string;
  html?: string;
  ts: number;
  src: string;
}

export type ClientMessage =
  | { kind: 'push'; payload: ClipboardPayload }
  | { kind: 'get' }
  | { kind: 'ping' };

export type ServerMessage =
  | { kind: 'pong' }
  | { kind: 'welcome'; serverVersion: string }
  | { kind: 'clipboard'; payload: ClipboardPayload | null }
  | { kind: 'error'; message: string };