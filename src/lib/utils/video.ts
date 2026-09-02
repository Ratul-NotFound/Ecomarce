import type { Product } from '@/types';

/**
 * Parses any YouTube, Google Drive, or direct video URL and returns the embeddable URL.
 */
export function parseVideoEmbedUrl(rawUrl: string | null | undefined): {
  type: 'youtube' | 'gdrive' | 'direct' | 'invalid';
  embedUrl: string | null;
  videoId?: string;
} {
  if (!rawUrl || !rawUrl.trim()) {
    return { type: 'invalid', embedUrl: null };
  }

  const url = rawUrl.trim();

  // 1. YouTube Formats:
  // - youtube.com/watch?v=ID
  // - youtu.be/ID
  // - youtube.com/shorts/ID
  // - youtube.com/embed/ID
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/
  );

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
    };
  }

  // 2. Google Drive Formats:
  // - drive.google.com/file/d/FILE_ID/view...
  // - drive.google.com/open?id=FILE_ID
  const gDriveMatch = url.match(/drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?id=([a-zA-Z0-9_-]+))/);
  if (gDriveMatch) {
    const fileId = gDriveMatch[1] || gDriveMatch[2];
    return {
      type: 'gdrive',
      videoId: fileId,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    };
  }

  // 3. Direct Video File (.mp4, .webm, .ogg)
  if (url.match(/\.(mp4|webm|ogg)($|\?)/i)) {
    return {
      type: 'direct',
      embedUrl: url,
    };
  }

  // Fallback if already an embed link
  if (url.includes('youtube.com/embed') || url.includes('drive.google.com') && url.includes('preview')) {
    return {
      type: url.includes('youtube') ? 'youtube' : 'gdrive',
      embedUrl: url,
    };
  }

  return { type: 'invalid', embedUrl: null };
}

/**
 * Extracts product video URL from product.video_url or tags array (tag: "video:<url>")
 */
export function getProductVideoUrl(product: Partial<Product>): string | null {
  if (product.video_url && product.video_url.trim()) {
    return product.video_url.trim();
  }

  if (Array.isArray(product.tags)) {
    const vTag = product.tags.find(t => t.startsWith('video:'));
    if (vTag) {
      return vTag.replace('video:', '').trim();
    }
  }

  return null;
}

/**
 * Syncs video URL into tags array so it is preserved even if native video_url column is pending
 */
export function syncVideoToTags(existingTags: string[] = [], videoUrl: string | null | undefined): string[] {
  const filtered = existingTags.filter(t => !t.startsWith('video:'));
  if (videoUrl && videoUrl.trim()) {
    filtered.push(`video:${videoUrl.trim()}`);
  }
  return filtered;
}
