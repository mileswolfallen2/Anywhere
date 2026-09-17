// Minimal ambient types for the subset of the Chrome/Firefox extension APIs
// Anywhere uses. Avoids pulling the full @types/chrome package.
declare namespace chrome.runtime {
  interface MessageSender {
    tab?: unknown;
  }

  type SendResponse = (response?: unknown) => void;

  const onMessage: {
    addListener<M>(
      listener: (message: M, sender: MessageSender, sendResponse: SendResponse) => boolean | void,
    ): void;
  };

  const onInstalled: {
    addListener(listener: (details: unknown) => void): void;
  };
}

declare namespace chrome.storage {
  interface StorageArea {
    get(keys: string | string[]): Promise<Record<string, unknown>>;
    set(values: Record<string, unknown>): Promise<void>;
  }

  const local: StorageArea;
}