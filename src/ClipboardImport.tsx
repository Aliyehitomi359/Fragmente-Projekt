import { useEffect, useRef, useState } from 'react';
import { clipboardImages } from './clipboardImages';

type Target = 'source' | 'fragment';

export function ClipboardImport({ onImport }: { onImport: (files: File[], target: Target) => Promise<void> }) {
  const target = useRef<Target | null>(null);
  const importRef = useRef(onImport);
  importRef.current = onImport;
  const dialog = useRef<HTMLDialogElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [pasteNotice, setPasteNotice] = useState('');
  const [previewTarget, setPreviewTarget] = useState<Target | null>(null);

  async function save(images: File[], kind: Target) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      await importRef.current(images, kind);
      setFiles([]);
    } catch (failure) {
      setFiles(images);
      setError(`Image could not be saved: ${String(failure)}`);
    } finally { busyRef.current = false; setBusy(false); }
  }

  useEffect(() => {
    let nativeRead = false;
    const editable = (node: EventTarget | null) => node instanceof HTMLElement &&
      (node.isContentEditable || !!node.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
    const chooseTarget = (event: Event) => {
      if (!(event.target instanceof HTMLElement) || dialog.current?.open || editable(event.target)) return;
      target.current = event.target.closest('.left-panel, .source-viewer') ? 'source'
        : event.target.closest('.right-stack') ? 'fragment' : null;
    };
    const receive = (images: File[]) => {
      setError('');
      setPasteNotice('');
      if (target.current && !dialog.current?.open) void save(images, target.current);
      else setFiles(images);
    };
    const readImage = async (destination?: Target) => {
      if (nativeRead || busyRef.current) return;
      nativeRead = true;
      try {
        let images: File[] = [];
        if (window.desktopLibrary?.readClipboardImage) {
          const bytes = await window.desktopLibrary.readClipboardImage();
          if (bytes?.length) images = clipboardImages({ items: [], files: [new File([new Uint8Array(bytes)], 'clipboard.png', { type: 'image/png' })] });
        } else if (navigator.clipboard?.read) {
          for (const item of await navigator.clipboard.read()) {
            const type = item.types.find((value) => value.startsWith('image/'));
            if (type) { const blob = await item.getType(type); images.push(new File([blob], 'clipboard', { type })); }
          }
          images = clipboardImages({ items: [], files: images });
        } else throw new Error('This browser does not support the Paste button. Use Command+V / Ctrl+V, or Upload.');
        if (!images.length) { setPasteNotice('Please make sure your clipboard contains an image, then try pasting again.'); return; }
        if (destination) {
          setError(''); setPasteNotice(''); setPreviewTarget(destination); setFiles(images);
        } else { setPreviewTarget(null); receive(images); }
      } catch { setPasteNotice('Please make sure your clipboard contains an image, then try pasting again.'); }
      finally { nativeRead = false; }
    };
    const nativePaste = (event: KeyboardEvent) => {
      if (!window.desktopLibrary?.readClipboardImage || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'v' || editable(event.target)) return;
      event.preventDefault();
      if (!event.repeat) void readImage();
    };
    const pasteButton = (event: Event) => {
      const destination = (event as CustomEvent).detail;
      if (destination === 'source' || destination === 'fragment') void readImage(destination);
    };
    const paste = (event: ClipboardEvent) => {
      if (nativeRead || editable(event.target) || !event.clipboardData || busyRef.current) return;
      const images = clipboardImages(event.clipboardData);
      if (!images.length) return;
      event.preventDefault();
      setPreviewTarget(null);
      receive(images);
    };
    document.addEventListener('pointerdown', chooseTarget, true);
    document.addEventListener('focusin', chooseTarget, true);
    document.addEventListener('paste', paste);
    document.addEventListener('keydown', nativePaste);
    document.addEventListener('fragmente:paste-image', pasteButton);
    return () => {
      document.removeEventListener('pointerdown', chooseTarget, true);
      document.removeEventListener('focusin', chooseTarget, true);
      document.removeEventListener('paste', paste);
      document.removeEventListener('keydown', nativePaste);
      document.removeEventListener('fragmente:paste-image', pasteButton);
    };
  }, []);

  useEffect(() => {
    if (!files.length) { dialog.current?.close(); setPreview(''); return; }
    const url = URL.createObjectURL(files[0]);
    setPreview(url);
    if (!dialog.current?.open) dialog.current?.showModal();
    return () => URL.revokeObjectURL(url);
  }, [files]);

  return <>{pasteNotice && <div className="clipboard-paste-notice" role="status"><span>{pasteNotice}</span><button aria-label="Dismiss paste message" onClick={() => setPasteNotice('')}>&#215;</button></div>}
  <dialog className="clipboard-dialog" ref={dialog} aria-labelledby="clipboard-title"
    onCancel={(event) => { event.preventDefault(); if (!busyRef.current) setFiles([]); }}>
    <div className="clipboard-dialog-head"><h2 id="clipboard-title">Add clipboard {files.length > 1 ? `${files.length} images` : 'image'}</h2>
      <button aria-label="Cancel paste" title="Cancel paste" disabled={busy} onClick={() => setFiles([])}>&#215;</button></div>
    {preview && <img className="clipboard-preview" src={preview} alt="Clipboard image preview" />}
    <div className="clipboard-destinations">
      {previewTarget !== 'fragment' && <button disabled={busy} onClick={() => void save(files, 'source')}>Add to Sources</button>}
      {previewTarget !== 'source' && <button disabled={busy} onClick={() => void save(files, 'fragment')}>Add to Fragments</button>}
    </div>
    {busy && <p role="status">Saving...</p>}
    {error && <p role="alert">{error}</p>}
  </dialog></>;
}
