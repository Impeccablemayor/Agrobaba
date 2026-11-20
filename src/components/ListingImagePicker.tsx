import { useRef, useState, type ChangeEvent } from 'react';
import { showToast } from '../lib/toastBus';
import { prepareImage } from '../lib/imagePrep';

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
