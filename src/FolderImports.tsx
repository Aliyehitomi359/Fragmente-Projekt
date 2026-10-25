import { useEffect, useRef, useState } from 'react';
import { DEFAULT_BOX_ID, loadAllData, nowIso, saveFragment, saveSource } from './db';
import type { Fragment } from './types';

type Candidate = { id: string; name: string; kind: 'source' | 'fragment' | null };

function FilePreview({ item }: { item: Candidate }) {
  const [active, setActive] = useState(false);
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!active) return;
    let canceled = false;
    let objectUrl = '';
    setFailed(false);
    void window.desktopLibrary!.read(item.id).then((file) => {
      if (canceled) return;
      objectUrl = URL.createObjectURL(new Blob([new Uint8Array(file.bytes)], { type: file.type }));
      setUrl(objectUrl);
    }).catch(() => { if (!canceled) setFailed(true); });
    return () => { canceled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); setUrl(''); };
  }, [active, item.id]);
  return <div className="folder-file-preview" onMouseEnter={() => setActive(true)} onMouseLeave={() => setActive(false)}>
    <button type="button" className="folder-file-name" onFocus={() => setActive(true)} onBlur={() => setActive(false)} onClick={() => setActive((current) => !current)} aria-expanded={active}>{item.name}</button>
    {active && <div className="folder-preview-popup" role="tooltip">
      {url ? <img src={url} alt={`Preview of ${item.name}`} onError={() => setFailed(true)} /> : <span>{failed ? 'Preview unavailable' : 'Loading preview...'}</span>}
    </div>}
  </div>;
}

export function FolderImports({ onImported, onFragment }: {
  onImported: () => Promise<void>;
  onFragment: (fragment: Fragment) => void;
}) {
  const [items, setItems] = useState<Candidate[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const unclassified = items.filter((item) => !item.kind);
  const pendingKey = unclassified.map((item) => item.id).sort().join(',');
  const busy = useRef(false);
  const filenamesSynced = useRef(false);
  const callbacks = useRef({ onImported, onFragment });
  callbacks.current = { onImported, onFragment };

  async function importFile(item: Candidate, kind: 'source' | 'fragment') {
    const api = window.desktopLibrary;
    if (!api) return;
    setBusyId(item.id);
    const file = await api.read(item.id);
    const imageBlob = new Blob([new Uint8Array(file.bytes)], { type: file.type });
    const id = `folder-${kind}-${file.hash}`;
    const createdAt = nowIso();
    const fragment: Fragment = { id, imageBlob, createdAt, updatedAt: createdAt, sourceType: 'direct-upload', ocrStatus: 'idle', boxId: DEFAULT_BOX_ID, isFavorite: false };
    // A deterministic ID permits recovery if the app closes between saving and acknowledgment.
    const existing = await loadAllData();
    if (kind === 'source' && !existing.sources.some((source) => source.id === id)) {
      await saveSource({ id, name: file.name, originalFileName: file.name, imageBlob, createdAt, cutRegions: [], ocrStatus: 'idle', isFavorite: false }, false);
    } else if (kind === 'fragment' && !existing.fragments.some((entry) => entry.id === id)) {
      await saveFragment(fragment, false);
    }
    await api.confirm(item.id, kind);
    const current = await loadAllData();
    if (kind === 'source') {
      const saved = current.sources.find((source) => source.id === id);
      if (saved) await saveSource(saved);
    } else {
      const saved = current.fragments.find((entry) => entry.id === id);
      if (saved) await saveFragment(saved);
    }
    await callbacks.current.onImported();
    if (kind === 'fragment' && !existing.fragments.some((entry) => entry.id === id)) callbacks.current.onFragment(fragment);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
  }

  useEffect(() => {
    if (!window.desktopLibrary) return;
    let stopped = false;
    async function poll() {
      if (busy.current || stopped) return;
      busy.current = true;
      try {
        if (!filenamesSynced.current) {
          const saved = await loadAllData();
          for (const source of saved.sources) {
            if (stopped) return;
            await window.desktopLibrary!.store('source', source.id, source.imageBlob.type, new Uint8Array(await source.imageBlob.arrayBuffer()), source.nameEdited ? source.name : source.ocrText || source.name);
          }
          for (const fragment of saved.fragments) {
            if (stopped) return;
            await window.desktopLibrary!.store('fragment', fragment.id, fragment.imageBlob.type, new Uint8Array(await fragment.imageBlob.arrayBuffer()), fragment.ocrText || (fragment.imageBlob instanceof File ? fragment.imageBlob.name : ''));
          }
          filenamesSynced.current = true;
        }
        const candidates = await window.desktopLibrary!.scan();
        if (stopped) return;
        setItems(candidates);
        for (const item of candidates) {
          if (stopped) break;
          if (item.kind) await importFile(item, item.kind);
        }
      } catch (failure) {
        if (!stopped) setError(failure instanceof Error ? failure.message : 'Folder import failed.');
      } finally { busy.current = false; if (!stopped) setBusyId(''); }
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 3000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (pendingKey && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!pendingKey) dialogRef.current?.close();
  }, [pendingKey]);

  if (!window.desktopLibrary || (!items.some((item) => !item.kind) && !error)) return null;
  return <>
    <div className="folder-imports">
      {unclassified.length > 0 && <button onClick={() => dialogRef.current?.showModal()}>Review {unclassified.length} unclassified {unclassified.length === 1 ? 'image' : 'images'}</button>}
      {error && <p role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></p>}
    </div>
    <dialog ref={dialogRef} className="folder-classification-dialog" aria-labelledby="classification-title">
    <div className="classification-header">
      <h2 id="classification-title">You have {unclassified.length} unclassified {unclassified.length === 1 ? 'image' : 'images'}.</h2>
      <button onClick={() => dialogRef.current?.close()} aria-label="Close classification dialog">Close</button>
    </div>
    <p>Is this a source or fragment?</p>
    {error && <p role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></p>}
    {unclassified.map((item) => <div key={item.id} className="classification-row">
      <FilePreview item={item} />
      {(['source', 'fragment'] as const).map((kind) => <button key={kind} disabled={Boolean(busyId)} onClick={async () => {
        if (busy.current) return;
        busy.current = true;
        try { await importFile(item, kind); } catch (failure) { setError(String(failure)); }
        finally { busy.current = false; setBusyId(''); }
      }}>{kind === 'source' ? 'Source' : 'Fragment'}</button>)}
    </div>)}
    </dialog>
  </>;
}
