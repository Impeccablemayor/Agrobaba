/** Browser-side photo preparation shared by listing images and dispute evidence. */

/** Photos at or under this size and already JPEG/PNG/WebP are sent untouched. */
const PASSTHROUGH_BYTES = 1.5 * 1024 * 1024;
/** Longest edge after downscaling - plenty for a product gallery, small enough for mobile data. */
const MAX_EDGE_PX = 1600;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED = ACCEPTED_IMAGE_TYPES;

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Phone cameras routinely produce 4-12MB photos, above the backend's ~5MB per-image limit.
 *  Large or non-web formats are redrawn on a canvas as a JPEG instead of being rejected. */
export async function prepareImage(file: File): Promise<string> {
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
