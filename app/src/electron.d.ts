// Minimal ambient types for the subset of the Electron API that Gelectron
// implements (see gelectron's ELECTRON_API_STATUS.md). Avoids pulling the
// full `electron` npm package (which would download Chromium).
declare module 'electron' {
  export const app: {
    whenReady(): Promise<void>;
    quit(): void;
    on(event: string, listener: (...args: unknown[]) => void): void;
  };

  export class BrowserWindow {
    constructor(options: { width?: number; height?: number; title?: string });
    loadFile(path: string): Promise<void>;
  }
}