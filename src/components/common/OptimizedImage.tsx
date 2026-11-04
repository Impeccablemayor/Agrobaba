import { useState } from 'react';
import { buildOptimizedImageUrl, buildCloudinarySrcSet, type CloudinaryTransformOptions } from '../../lib/cloudinary';

export interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  targetWidth?: number;
  targetHeight?: number;
  crop?: CloudinaryTransformOptions['crop'];
  fallbackIcon?: string;
  fallbackText?: string;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
}

/**
 * High-performance, responsive image component optimized for mobile networks.
 *
 * Automatically injects WebP/AVIF auto-formatting, auto-compression, and responsive
 * `srcset` breakpoints for Cloudinary images while gracefully falling back to
 * branded placeholders or category icons on missing/broken images.
 */
export function OptimizedImage({
  src,
  alt,
  targetWidth = 480,
  targetHeight,
  crop,
  sizes = '(max-width: 480px) 180px, (max-width: 768px) 240px, 340px',
  loading = 'lazy',
  decoding = 'async',
  fallbackIcon,
  fallbackText,
  wrapperClassName,
  wrapperStyle,
  style,
  className,
  onError,
  ...rest
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);

  // If no source or error occurred and a fallback icon is provided, render the fallback container
  if ((!src || hasError) && (fallbackIcon || fallbackText)) {
    return (
      <div className={`card-img-inner ${wrapperClassName || ''}`} style={wrapperStyle}>
        {fallbackIcon && <i className={`fa-solid ${fallbackIcon}`}></i>}
        {fallbackText && <span className="cat-label">{fallbackText}</span>}
      </div>
    );
  }

  // If no source at all, render simple empty placeholder
  if (!src || hasError) {
    return (
      <div
        className={`card-img-inner ${wrapperClassName || ''}`}
        style={{ background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...wrapperStyle }}
      >
        <i className="fa-solid fa-box" style={{ color: 'var(--muted)', fontSize: 24 }}></i>
      </div>
    );
  }

  const optimizedSrc = buildOptimizedImageUrl(src, {
    width: targetWidth,
    height: targetHeight,
    crop,
    quality: 'auto',
    format: 'auto',
  });

  const srcSet = buildCloudinarySrcSet(src);

  return (
    <img
      src={optimizedSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={className}
      style={style}
      onError={(e) => {
        setHasError(true);
        if (onError) onError(e);
      }}
      {...rest}
    />
  );
}
