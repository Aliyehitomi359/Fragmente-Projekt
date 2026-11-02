import { useEffect, useRef, useState } from 'react';
import { createId } from './imageUtils';
import { joinedFragmentText, mergeFragmentImages } from './mergeFragments';
import type { Fragment, FragmentBox } from './types';
import './fragmentMerge.css';

export function FragmentMergeDialog({ fragments, boxes, initialBoxId, onSave, onClose }: {
  fragments: [Fragment, Fragment]; boxes: FragmentBox[]; initialBoxId: string;
  onSave: (fragment: Fragment) => Promise<void>; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [identity] = useState(() => ({ id: createId('fragment'), createdAt: new Date().toISOString() }));
  const [reversed, setReversed] = useState(false);
  const [gap, setGap] = useState(0);
  const [text, setText] = useState(joinedFragmentText(fragments[0].ocrText ?? '', fragments[1].ocrText ?? ''));
  const [boxId, setBoxId] = useState(initialBoxId);
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { const el = dialog.current!; el.showModal(); return () => el.close(); }, []);
  useEffect(() => {
    let cancelled = false, url: string | undefined;
    setPreview(null); setError('');
    const ordered = reversed ? [fragments[1], fragments[0]] : fragments;
    void mergeFragmentImages(ordered.map(f => f.imageBlob), 'horizontal', gap).then(blob => {
      if (cancelled) return;
      url = URL.createObjectURL(blob); setPreview({ blob, url });
    }).catch(failure => { if (!cancelled) setError(String(failure)); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [fragments[0].imageBlob, fragments[1].imageBlob, reversed, gap]);

  async function save() {
    if (!preview || saving) return;
    setSaving(true); setError('');
    const ordered = reversed ? [fragments[1], fragments[0]] : fragments;
    try {
      await onSave({ ...identity, imageBlob: preview.blob, updatedAt: new Date().toISOString(),
        sourceType: 'merged', mergedFromFragmentIds: ordered.map(f => f.id),
        sourcePageId: ordered[0].sourcePageId === ordered[1].sourcePageId ? ordered[0].sourcePageId : undefined,
        ocrText: text.trim(), ocrStatus: 'done', boxId, boxIds: [boxId], isFavorite: false });
      onClose();
    } catch (failure) { setError(String(failure)); setSaving(false); }
  }

  return <dialog ref={dialog} className="fragment-merge-dialog" aria-labelledby="merge-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <div className="merge-dialog-head"><h2 id="merge-title">Merge fragments</h2><button autoFocus aria-label="Cancel merge" title="Cancel" disabled={saving} onClick={onClose}>×</button></div>
    <fieldset disabled={saving} className="merge-options"><legend>Layout</legend>
      <button type="button" title="Swap fragment order" aria-label="Swap fragment order" onClick={() => {
        setReversed(!reversed);
        const ordered = reversed ? fragments : [fragments[1], fragments[0]];
        setText(joinedFragmentText(ordered[0].ocrText ?? '', ordered[1].ocrText ?? ''));
      }}>⇄</button>
      <label>Gap <input aria-label="Merge gap in pixels" type="number" min="0" max="100" value={gap} onChange={e => setGap(Math.max(0, Math.min(100, Math.round(Number(e.currentTarget.value)))))} /> px</label>
    </fieldset>
    <div className="merge-image-preview" aria-busy={!preview && !error}>{preview ? <img src={preview.url} alt="Merged fragment preview" /> : <span>{error ? 'Preview unavailable' : 'Preparing preview...'}</span>}</div>
    <label className="merge-text-label">Text<input aria-label="Merged fragment text" value={text} disabled={saving} onChange={e => setText(e.currentTarget.value)} /></label>
    <label className="merge-box-label">Save in<select aria-label="Merged fragment box" value={boxId} disabled={saving} onChange={e => setBoxId(e.currentTarget.value)}>{boxes.map(box => <option key={box.id} value={box.id}>{box.name}</option>)}</select></label>
    {error && <p role="alert">{error}</p>}
    <div className="merge-save-row"><button disabled={!preview || saving} onClick={() => void save()}>{saving ? 'Saving...' : 'Save merged fragment'}</button></div>
  </dialog>;
}
