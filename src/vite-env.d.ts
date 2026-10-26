/// <reference types="vite/client" />

interface Window {
  desktopLibrary?: {
    readClipboardImage(): Promise<Uint8Array | null>;
    onCapture(callback: (payload: { id: string; kind: 'source' | 'fragment'; bytes: Uint8Array; name: string }) => void): () => void;
    completeCapture(id: string, error?: string): Promise<void>;
    openFolder(): Promise<void>;
    reclassify(kind: 'source' | 'fragment', type: string, bytes: Uint8Array): Promise<void>;
    scan(): Promise<{ id: string; name: string; kind: 'source' | 'fragment' | null }[]>;
    read(id: string): Promise<{ name: string; type: string; bytes: Uint8Array; hash: string }>;
    confirm(id: string, kind: 'source' | 'fragment'): Promise<void>;
    store(kind: 'source' | 'fragment', id: string, type: string, bytes: Uint8Array, text?: string): Promise<void>;
  };
}
