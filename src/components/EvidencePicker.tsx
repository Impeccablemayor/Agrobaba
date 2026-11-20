import { useRef, useState, type ChangeEvent } from 'react';
import { showToast } from '../lib/toastBus';
import { prepareImage, readAsDataUrl } from '../lib/imagePrep';
import { evidenceFileError, MAX_ATTACHMENTS } from '../lib/disputeRules';

/** Photos (resized on the phone before upload) and PDFs attached to a dispute or a reply (Batch 6). */
export function EvidencePicker({ files, onChange, disabled }: { files: string[]; onChange: (f: string[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    const room = MAX_ATTACHMENTS - files.length;
    if (picked.length > room) showToast(`You can attach up to ${MAX_ATTACHMENTS} files.`, 'error');
    setBusy(true);
    const added: string[] = [];
    for (const file of picked.slice(0, Math.max(room, 0))) {
      const err = evidenceFileError(file.type, file.size);
      if (err) { showToast(`${file.name}: ${err}`, 'error'); continue; }
      try {
        added.push(file.type === 'application/pdf' ? await readAsDataUrl(file) : await prepareImage(file));
      } catch {
        showToast(`${file.name} couldn’t be read. Try another photo.`, 'error');
      }
    }
    setBusy(false);
    if (added.length) onChange([...files, ...added]);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {files.map((f, i) => (
          <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: 6, border: '1px solid var(--border-light)', overflow: 'hidden', background: 'var(--surface)' }}>
            {f.startsWith('data:application/pdf')
              ? <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 11, fontWeight: 700 }}><i className="fa-solid fa-file-pdf" style={{ fontSize: 20, color: 'var(--danger)' }}></i>PDF</div>
              : <img src={f} alt={`Evidence ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            <button type="button" aria-label={`Remove file ${i + 1}`} disabled={disabled}
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              style={{ position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', fontSize: 11 }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        ))}
        {files.length < MAX_ATTACHMENTS && (
          <button type="button" className="btn-outline btn-sm btn-inline" disabled={disabled || busy} onClick={() => input.current?.click()}
            style={{ height: 64, minWidth: 64 }}>
            {busy ? '…' : <><i className="fa-solid fa-camera"></i> Add</>}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => void add(e)} />
      <small style={{ color: 'var(--muted)', fontSize: 11 }}>Up to {MAX_ATTACHMENTS} photos or PDFs (receipts, delivery notes).</small>
    </div>
  );
}

/** Shows attachments on a message: photos open in a viewer; PDFs download. */
export function EvidenceList({ files }: { files: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!files.length) return null;
  const box = { width: 72, height: 72, borderRadius: 6, border: '1px solid var(--border-light)', overflow: 'hidden', display: 'grid', placeItems: 'center', background: 'var(--surface)', padding: 0, cursor: 'pointer' } as const;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
      {files.map((f, i) => {
        const pdf = f.startsWith('data:application/pdf') || /\.pdf($|\?)/i.test(f);
        return pdf ? (
          <a key={i} href={f} target="_blank" rel="noopener noreferrer" download={f.startsWith('data:') ? `evidence-${i + 1}.pdf` : undefined} style={box}>
            <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'center' }}><i className="fa-solid fa-file-pdf" style={{ fontSize: 22, color: 'var(--danger)' }}></i><br />PDF</span>
          </a>
        ) : (
          <button key={i} type="button" style={box} onClick={() => setOpen(f)} aria-label={`View photo ${i + 1}`}>
            <img src={f} alt={`Evidence ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </button>
        );
      })}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setOpen(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'grid', placeItems: 'center', padding: 16 }}>
          <img src={open} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 6 }} />
          <button type="button" onClick={() => setOpen(null)} aria-label="Close"
            style={{ position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 18, cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}
    </div>
  );
}
