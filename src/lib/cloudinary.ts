/**
 * Cloudinary image URL transformation and responsive srcset generator.
 *
 * Automatically delivers modern formats (WebP/AVIF via f_auto) and compressed
 * quality (q_auto), drastically reducing cellular bandwidth consumption on
 * mobile connections without degrading visual fidelity.
 */

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  crop?: 'limit' | 'fill' | 'scale' | 'thumb';
  quality?: 'auto' | 'auto:eco' | 'auto:good' | 'auto:best' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  dpr?: number | string;
}

/**
 * Transforms a Cloudinary URL to deliver optimal dimensions, format, and compression.
 * Non-Cloudinary URLs (local paths, data URIs, external URLs) are returned untouched.
 */
export function buildOptimizedImageUrl(
  url: string | null | undefined,
  options: CloudinaryTransformOptions = {}
): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }

  // Only transform URLs that match Cloudinary upload endpoints
  if (!trimmed.includes('res.cloudinary.com') || !trimmed.includes('/image/upload/')) {
    return trimmed;
  }

  const {
    width,
    height,
    crop = width && height ? 'fill' : 'limit',
    quality = 'auto',
    format = 'auto',
    dpr,
  } = options;

  const transforms: string[] = [];

  if (format) {
    transforms.push(`f_${format}`);
  }
  if (quality) {
    transforms.push(`q_${quality}`);
  }
  if (crop) {
    transforms.push(`c_${crop}`);
  }
  if (width && width > 0) {
    transforms.push(`w_${Math.round(width)}`);
  }
  if (height && height > 0) {
    transforms.push(`h_${Math.round(height)}`);
  }
  if (dpr) {
    transforms.push(`dpr_${dpr}`);
  }

  if (transforms.length === 0) {
    return trimmed;
  }

  const transformString = transforms.join(',');

  // Check if URL already has transformations directly after /image/upload/
  const match = trimmed.match(/(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)/);
  if (!match) {
    return trimmed;
  }

  const prefix = match[1];
  const rest = match[2];

  // If already prefixed with transformations before version tag (e.g. upload/f_auto,q_auto/v123...)
  // avoid duplicating
  if (/^[a-z]_[a-z0-9_:,]+\//i.test(rest)) {
    return trimmed.replace(
      prefix,
      `${prefix}${transformString}/`
    );
  }

  return `${prefix}${transformString}/${rest}`;
}

/**
 * Builds a responsive `srcset` attribute string for an image across standard viewport widths.
 * Returns undefined if the URL cannot be transformed (e.g. non-Cloudinary).
 */
export function buildCloudinarySrcSet(
  url: string | null | undefined,
  widths: number[] = [320, 480, 640, 768, 1024, 1280]
): string | undefined {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) {
    return undefined;
  }

  return widths
    .map((w) => `${buildOptimizedImageUrl(url, { width: w })} ${w}w`)
    .join(', ');
}
