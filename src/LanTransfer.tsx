import { useEffect, useRef, useState } from 'react';
import { loadAllData, saveBox, saveFragment, saveSource } from './db';
import { decodeMaterials, planMaterialImport, serializeMaterials, type MaterialData } from './materialTransfer';
import './lanTransfer.css';

export function LanTransfer({ onImported }: { onImported: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>Transfer over Wi-Fi...</button>{open && <LanTransferDialog onClose={() => setOpen(false)} onImported={onImported} />}</>;
}
function LanTransferDialog({ onClose, onImported }: { onClose: () => void; onImported: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'send' | 'receive'>('send');
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<{ code: string; expiresAt: number } | null>(null);
  const [code, setCode] = useState('');
  const [incoming, setIncoming] = useState<MaterialData | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  useEffect(() => { const el = dialog.current!; el.showModal(); return () => { el.close(); void window.desktopLibrary?.stopLanTransfer(); }; }, []);
  useEffect(() => {
    if (!session) return;
    setExpired(false);
    const timer = setTimeout(() => setExpired(true), Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [session]);
  async function perform(task: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await task(); } catch (failure) { setError((failure instanceof Error ? failure.message : String(failure)).replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')); }
    finally { setBusy(false); }
  }
  async function importMaterials() {
    if (!incoming) return;
    const plan = await planMaterialImport(incoming, await loadAllData());
    const count = plan.sources.length + plan.fragments.length;
    if (plan.conflicts && !window.confirm('Some records differ on these devices. Import this transfer as a separate copy? Existing materials will not be overwritten.')) return;
    // Decode every image before any writes so a malformed incoming image cannot cause a partial import.
    for (const item of [...plan.sources, ...plan.fragments]) {
      const bitmap = await createImageBitmap(item.imageBlob); bitmap.close();
    }
    for (const box of plan.boxes) await saveBox(box);
    for (const fragment of plan.fragments) await saveFragment(fragment);
    for (const source of plan.sources) await saveSource(source);
    await onImported(); setIncoming(null);
    setMessage(`Imported ${count} images and ${plan.boxes.length} boxes. ${plan.skipped} existing records skipped.`);
  }
  return <dialog ref={dialog} className="lan-dialog" aria-labelledby="lan-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <header><h2 id="lan-title">Transfer over Wi-Fi</h2><button title="Close" aria-label="Close Wi-Fi transfer" disabled={busy} onClick={onClose}>×</button></header>
    <nav aria-label="Transfer direction"><button aria-pressed={mode === 'send'} disabled={busy} onClick={() => { setMode('send'); setError(''); setMessage(''); }}>Send</button><button aria-pressed={mode === 'receive'} disabled={busy} onClick={() => { setMode('receive'); setError(''); setMessage(''); }}>Receive</button></nav>
    {mode === 'send' ? <section>
      <button disabled={busy} onClick={() => void perform(async () => {
        if (!window.confirm('Prepare a snapshot of your Sources, Fragments, OCR, notes and boxes for local transfer? The six-letter code expires in 10 minutes. You must approve each receiving device before any materials are sent. Canvases are not included.')) return;
        setSession(await window.desktopLibrary!.startLanTransfer(await serializeMaterials(await loadAllData())));
      })}>{busy ? 'Preparing...' : session ? 'Create new connection code' : 'Create connection code'}</button>
      {session && <div className="lan-session"><label>Connection code<input className="lan-code" aria-label="Connection code" readOnly value={expired ? '' : session.code} /></label>
        <button title="Copy connection code" disabled={expired} onClick={() => void perform(async () => { await navigator.clipboard.writeText(session.code); setMessage('Connection code copied.'); })}>Copy code</button>
        <button onClick={() => void perform(async () => { await window.desktopLibrary!.stopLanTransfer(); setSession(null); })}>Stop sharing</button>
        <p role="status">{expired ? 'Expired. Create a new connection code.' : `Sharing until ${new Date(session.expiresAt).toLocaleTimeString()}.`}</p></div>}
    </section> : <section><label>Connection code<input className="lan-code" aria-label="Enter connection code" placeholder="ABCDEF" maxLength={6} autoCapitalize="characters" autoComplete="off" spellCheck={false} value={code} disabled={busy} onChange={e => { setCode(e.currentTarget.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)); setIncoming(null); }} /></label>
      <button disabled={busy || !/^[A-Z]{6}$/.test(code)} onClick={() => void perform(async () => { setIncoming(decodeMaterials(await window.desktopLibrary!.receiveLanTransfer(code))); })}>{busy ? 'Finding device / waiting for approval...' : 'Receive materials'}</button>
      {incoming && <div className="lan-incoming"><p>{incoming.sources.length} sources · {incoming.fragments.length} fragments · {incoming.boxes.length} boxes</p><button disabled={busy} onClick={() => void perform(importMaterials)}>Import materials</button><button disabled={busy} onClick={() => setIncoming(null)}>Discard</button></div>}
    </section>}
    {message && <p className="lan-success" role="status">{message}</p>}{error && <p className="lan-error" role="alert">{error}</p>}
  </dialog>;
}
