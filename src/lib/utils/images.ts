/**
 * Advanced 2-Tier Image Optimization Engine
 * Tier 1 (thumb): Highly compressed, lightweight (15KB-35KB, 360px) for cards, suggestions, admin.
 * Tier 2 (full): High-definition fidelity (120KB-220KB, 1200px) for product detail page & zoom modal.
 */

export type ImageSizeVariant = 'thumb' | 'full';

const DEFAULT_FALLBACK_THUMB = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=360&q=70&auto=format';
const DEFAULT_FALLBACK_FULL = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=85&auto=format';

/**
 * Returns the optimized URL variant ('thumb' or 'full') based on URL patterns
 * Supports Supabase Storage, Unsplash, Cloudinary, custom paired filenames, and data URLs.
 */
export function getOptimizedImageUrl(
  rawUrl: string | null | undefined,
  variant: ImageSizeVariant = 'thumb'
): string {
  if (!rawUrl || !rawUrl.trim()) {
    return variant === 'thumb' ? DEFAULT_FALLBACK_THUMB : DEFAULT_FALLBACK_FULL;
  }

  const url = rawUrl.trim();

  // 1. Data URLs or Blobs: return as is
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // 2. Custom Paired filename support (_thumb vs _full)
  if (variant === 'thumb' && url.includes('_full.')) {
    return url.replace('_full.', '_thumb.');
  }
  if (variant === 'full' && url.includes('_thumb.')) {
    return url.replace('_thumb.', '_full.');
  }

  try {
    // 3. Unsplash URLs
    if (url.includes('images.unsplash.com') || url.includes('plus.unsplash.com')) {
      const parsed = new URL(url);
      if (variant === 'thumb') {
        parsed.searchParams.set('w', '320');
        parsed.searchParams.set('q', '70');
        parsed.searchParams.set('auto', 'format');
      } else {
        parsed.searchParams.set('w', '900');
        parsed.searchParams.set('q', '85');
        parsed.searchParams.set('auto', 'format');
      }
      return parsed.toString();
    }

    // 4. Supabase Storage URLs (with Image Transformations API)
    if (url.includes('.supabase.co/storage/v1/object/public/')) {
      const renderBase = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
      const parsed = new URL(renderBase);
      if (variant === 'thumb') {
        parsed.searchParams.set('width', '320');
        parsed.searchParams.set('height', '320');
        parsed.searchParams.set('resize', 'contain');
        parsed.searchParams.set('quality', '70');
      } else {
        parsed.searchParams.set('width', '900');
        parsed.searchParams.set('height', '900');
        parsed.searchParams.set('resize', 'contain');
        parsed.searchParams.set('quality', '85');
      }
      return parsed.toString();
    }

    // 5. Cloudinary URLs
    if (url.includes('res.cloudinary.com')) {
      const transform = variant === 'thumb' ? 'c_scale,w_320,q_auto:eco' : 'c_scale,w_900,q_auto:good';
      return url.replace('/upload/', `/upload/${transform}/`);
    }
  } catch {
    // If URL parsing fails, fallback to raw string
  }

  return url;
}

/**
 * Compresses an image file on the client using HTML5 Canvas.
 * Produces tiny, optimized WebP images (or JPEG fallback).
 */
export async function compressImageClient(
  file: File,
  options: { maxWidth: number; maxHeight: number; quality: number; type?: string }
): Promise<{ blob: Blob; dataUrl: string; sizeBytes: number }> {
  const { maxWidth, maxHeight, quality, type = 'image/webp' } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Apply smooth downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP or JPEG
        let exportType = type;
        // Check WebP canvas support
        if (!canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
          exportType = 'image/jpeg';
        }

        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('Failed to create image blob'));
              return;
            }
            const dataUrl = canvas.toDataURL(exportType, quality);
            resolve({
              blob,
              dataUrl,
              sizeBytes: blob.size,
            });
          },
          exportType,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image into DOM'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Creates dual-tier resolution images (Thumbnail + Full HD) from a single user uploaded file.
 */
export async function createDualResolutionUpload(file: File) {
  // 1. Generate Tier 1: Compressed Thumbnail (Max 380px, 72% quality)
  const thumb = await compressImageClient(file, {
    maxWidth: 380,
    maxHeight: 380,
    quality: 0.72,
  });

  // 2. Generate Tier 2: High Definition Full Image (Max 1200px, 88% quality)
  const full = await compressImageClient(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.88,
  });

  return {
    originalSizeBytes: file.size,
    thumb: {
      blob: thumb.blob,
      dataUrl: thumb.dataUrl,
      sizeBytes: thumb.sizeBytes,
    },
    full: {
      blob: full.blob,
      dataUrl: full.dataUrl,
      sizeBytes: full.sizeBytes,
    },
  };
}
