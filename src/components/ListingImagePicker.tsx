import { useRef, useState, type ChangeEvent } from 'react';
import { showToast } from '../lib/toastBus';

/** Photos at or under this size and already JPEG/PNG/WebP are sent untouched. */
const PASSTHROUGH_BYTES = 1.5 * 1024 * 1024;
/** Longest edge after downscaling - plenty for a product gallery, small enough for mobile data. */
const MAX_EDGE_PX = 1600;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Phone cameras routinely produce 4-12MB photos, above the backend's ~5MB per-image limit.
 *  Large or non-web formats are redrawn on a canvas as a JPEG instead of being rejected. */
async function prepareImage(file: File): Promise<string> {
  if (ACCEPTED.includes(file.type) && file.size <= PASSTHROUGH_BYTES) {
    return readAsDataUrl(file);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode'));
      el.src = url;
    });
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#ffffff'; // JPEG has no alpha - avoid black backgrounds on transparent PNGs
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface ListingImagePickerProps {
  images: string[];
  onChange: (images: string[]) => void;
  max: number;
  label: string;
}

/** Up to `max` listing photos: add several at once, remove, and choose the cover (first image). */
export function ListingImagePicker({ images, onChange, max, label }: ListingImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const remaining = max - images.length;

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-selecting the same file after removing it
    if (files.length === 0) return;
    if (files.length > remaining) {
      showToast(`You can add ${remaining} more photo${remaining === 1 ? '' : 's'} (maximum ${max}).`, 'warning');
    }
    setBusy(true);
    const added: string[] = [];
    for (const file of files.slice(0, Math.max(0, remaining))) {
      if (!file.type.startsWith('image/')) {
        showToast(`"${file.name}" is not an image.`, 'error');
        continue;
      }
      try {
        added.push(await prepareImage(file));
      } catch {
        showToast(`Couldn't read "${file.name}". Please use a JPG, PNG or WebP photo.`, 'error');
      }
    }
    setBusy(false);
    if (added.length) onChange([...images, ...added].slice(0, max));
  }

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function makeCover(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [picked] = next.splice(index, 1);
    onChange([picked, ...next]);
  }

  return (
    <div className="form-group">
      <label>
        {label} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({images.length}/{max})</span>
      </label>
      <div className="listing-image-grid">
        {images.map((src, i) => (
          <div className="listing-image-tile" key={`${i}-${src.slice(-24)}`}>
            <img src={src} alt={`Listing photo ${i + 1}`} />
            {i === 0 ? (
              <span className="listing-image-cover">Cover</span>
            ) : (
              <button type="button" className="listing-image-action cover" onClick={() => makeCover(i)}>
                Make cover
              </button>
            )}
            <button
              type="button" className="listing-image-action remove" onClick={() => remove(i)}
              aria-label={`Remove photo ${i + 1}`}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <button
            type="button" className="listing-image-add" disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <i className={`fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-camera'}`}></i>
            <span>{busy ? 'Preparing…' : images.length === 0 ? 'Add photos' : 'Add more'}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef} type="file" accept="image/*" multiple
        style={{ display: 'none' }} onChange={handleFiles}
      />
      <small style={{ fontSize: 11, color: 'var(--muted)' }}>
        Up to {max} photos. JPG, PNG or WebP - large photos are resized automatically. The first photo is the cover.
      </small>
    </div>
  );
}
