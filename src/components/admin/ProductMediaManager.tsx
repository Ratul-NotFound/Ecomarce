'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  UploadCloud,
  X,
  Plus,
  Star,
  ArrowLeft,
  ArrowRight,
  Video,
  Play,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/shared/ToastProvider';
import { parseVideoEmbedUrl } from '@/lib/utils/video';
import { createDualResolutionUpload, getOptimizedImageUrl } from '@/lib/utils/images';

interface ProductMediaManagerProps {
  images: string[];
  onChangeImages: (images: string[]) => void;
  videoUrl: string;
  onChangeVideoUrl: (url: string) => void;
}

export default function ProductMediaManager({
  images = [],
  onChangeImages,
  videoUrl = '',
  onChangeVideoUrl,
}: ProductMediaManagerProps) {
  const { showToast } = useToast();
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [activeUrlSlot, setActiveUrlSlot] = useState<number | null>(null);
  const [slotUrlInput, setSlotUrlInput] = useState('');

  // Exactly 4 image slots
  const slots = [
    { index: 0, label: 'Main Cover Picture', sublabel: 'Shown on store cards & search', isCover: true },
    { index: 1, label: 'Angle 2', sublabel: 'Detail / Side profile shot', isCover: false },
    { index: 2, label: 'Angle 3', sublabel: 'Lifestyle / In-use context', isCover: false },
    { index: 3, label: 'Angle 4', sublabel: 'Packaging / Specifications', isCover: false },
  ];

  // Helper to update a specific slot
  const updateSlot = (index: number, newUrl: string) => {
    const updated = [...images];
    while (updated.length < 4) updated.push('');
    updated[index] = newUrl;
    // Clean trailing empty strings if any
    onChangeImages(updated);
  };

  // Helper to remove an image from a slot
  const removeSlot = (index: number) => {
    const updated = [...images];
    while (updated.length < 4) updated.push('');
    updated[index] = '';
    onChangeImages(updated);
    showToast(`Image slot #${index + 1} cleared`, 'info');
  };

  // Helper to set an image as main cover (swap with index 0)
  const setAsCover = (index: number) => {
    if (index === 0) return;
    const updated = [...images];
    while (updated.length < 4) updated.push('');
    const temp = updated[0];
    updated[0] = updated[index];
    updated[index] = temp;
    onChangeImages(updated);
    showToast(`Slot #${index + 1} promoted to Main Cover!`, 'success');
  };

  // Handle file upload for a specific slot with automatic 2-tier dual resolution compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, slotIdx: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingSlot(slotIdx);
      const file = files[0];

      // Automatically generate Tier 1 (ultra-compressed thumb) & Tier 2 (HD detail)
      const { thumb, full, originalSizeBytes } = await createDualResolutionUpload(file);

      const supabase = createClient();
      const baseId = `${Date.now()}_slot${slotIdx}_${Math.random().toString(36).substring(2, 6)}`;
      const filePathThumb = `products/${baseId}_thumb.webp`;
      const filePathFull = `products/${baseId}_full.webp`;

      // Upload both WebP variants to Supabase storage
      let bucket = 'products';
      let uploadThumbRes = await supabase.storage.from(bucket).upload(filePathThumb, thumb.blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });
      if (uploadThumbRes.error) {
        bucket = 'Products';
        uploadThumbRes = await supabase.storage.from(bucket).upload(filePathThumb, thumb.blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });
      }

      const uploadFullRes = await supabase.storage.from(bucket).upload(filePathFull, full.blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });

      if (uploadFullRes.error || uploadThumbRes.error) {
        // Storage bucket fallback to compressed WebP dataUrl
        updateSlot(slotIdx, full.dataUrl);
        showToast('Image compressed & saved (Client WebP mode)', 'success');
      } else {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePathFull);
        updateSlot(slotIdx, publicUrlData.publicUrl);
        const savedPercent = Math.round(((originalSizeBytes - thumb.sizeBytes) / originalSizeBytes) * 100);
        showToast(`Optimized! Thumbnail is ${Math.round(thumb.sizeBytes / 1024)}KB (${savedPercent}% smaller)`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Image upload failed', 'error');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSaveUrlSlot = (slotIdx: number) => {
    if (!slotUrlInput.trim()) return;
    updateSlot(slotIdx, slotUrlInput.trim());
    setSlotUrlInput('');
    setActiveUrlSlot(null);
    showToast(`Image URL set for slot #${slotIdx + 1}`, 'success');
  };

  // Video parsing
  const videoData = parseVideoEmbedUrl(videoUrl);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ────────────────────────────────────────────────────────────
         PART 1: 4 PRODUCT PICTURE SLOTS
         ──────────────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
              Product Pictures (4 Slots)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
              Slot #1 is the primary store cover. You can promote any image to cover anytime.
            </p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>
            {images.filter(Boolean).length}/4 Photos Uploaded
          </span>
        </div>

        {/* 4 Slots Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {slots.map(slot => {
            const currentImg = images[slot.index];
            const isUploading = uploadingSlot === slot.index;
            const isEnteringUrl = activeUrlSlot === slot.index;

            return (
              <div
                key={slot.index}
                style={{
                  background: slot.isCover ? '#ffffff' : 'var(--color-admin-surface-2)',
                  border: slot.isCover
                    ? '2px solid var(--color-primary)'
                    : '1px solid var(--color-admin-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: slot.isCover ? '0 4px 12px rgba(59, 130, 246, 0.08)' : 'none',
                }}
              >
                {/* Slot Header Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {slot.isCover ? (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          background: 'var(--color-primary)',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Star size={10} fill="#ffffff" />
                        MAIN COVER
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>
                        Slot #{slot.index + 1}
                      </span>
                    )}
                  </div>

                  {currentImg && !slot.isCover && (
                    <button
                      type="button"
                      onClick={() => setAsCover(slot.index)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--color-admin-border)',
                        color: 'var(--color-primary)',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      title="Promote this photo to Main Cover"
                    >
                      <Star size={10} />
                      Set Cover
                    </button>
                  )}
                </div>

                {/* Slot Image Box or Upload Box */}
                {currentImg ? (
                  <div>
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '150px',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: '1px solid var(--color-admin-border)',
                        background: '#f8fafc',
                      }}
                    >
                      <Image
                        src={currentImg}
                        alt={`Product slot ${slot.index + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeSlot(slot.index)}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(15, 23, 42, 0.75)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 'var(--radius-full)',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          backdropFilter: 'blur(4px)',
                        }}
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                      {slot.sublabel}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      height: '150px',
                      border: '2px dashed var(--color-admin-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px',
                      textAlign: 'center',
                      background: '#ffffff',
                    }}
                  >
                    {isUploading ? (
                      <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 700 }}>
                        Uploading...
                      </div>
                    ) : isEnteringUrl ? (
                      <div style={{ width: '100%' }}>
                        <input
                          type="url"
                          className="admin-input"
                          placeholder="Paste image link..."
                          value={slotUrlInput}
                          onChange={e => setSlotUrlInput(e.target.value)}
                          autoFocus
                          style={{ height: '30px', fontSize: '11px', marginBottom: '6px' }}
                        />
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleSaveUrlSlot(slot.index)}
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, padding: '3px', fontSize: '10px' }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveUrlSlot(null)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '10px' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={24} color="var(--color-admin-muted)" style={{ marginBottom: '6px' }} />
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-admin-text)' }}>
                          {slot.label}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-admin-muted)', marginBottom: '8px' }}>
                          {slot.sublabel}
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <label
                            style={{
                              background: 'var(--color-primary)',
                              color: '#ffffff',
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={e => handleFileUpload(e, slot.index)}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveUrlSlot(slot.index);
                              setSlotUrlInput('');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 700 }}
                          >
                            Link URL
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
         PART 2: STREAMABLE PRODUCT VIDEO (YouTube / Google Drive / MP4)
         ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          border: '1px solid var(--color-admin-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          background: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
              Product Video Stream (YouTube / Google Drive / MP4)
            </h3>
          </div>

          {videoData.type !== 'invalid' && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(34, 197, 94, 0.12)',
                color: 'var(--color-success)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={12} />
              Connected ({videoData.type.toUpperCase()})
            </span>
          )}
        </div>

        <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginBottom: '12px' }}>
          Uploading heavy video files makes websites slow. Instead, upload your product review or demonstration to <strong>YouTube (Public or Unlisted)</strong>, <strong>Google Drive</strong>, or provide a direct MP4 link. It streams smoothly directly inside your store!
        </p>

        {/* Video Link Input */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <input
            type="url"
            className="admin-input"
            placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/... or Google Drive link"
            value={videoUrl}
            onChange={e => onChangeVideoUrl(e.target.value)}
            style={{ height: '38px', fontSize: '13px' }}
          />
          {videoUrl && (
            <button
              type="button"
              onClick={() => onChangeVideoUrl('')}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0 12px', color: 'var(--color-danger)' }}
              title="Remove Video"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Live Video Player Preview in Admin */}
        {videoData.type !== 'invalid' && videoData.embedUrl ? (
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '520px',
              aspectRatio: '16 / 9',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              background: '#000000',
              border: '1px solid var(--color-admin-border)',
              marginTop: '10px',
            }}
          >
            {videoData.type === 'direct' ? (
              <video
                src={videoData.embedUrl}
                controls
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <iframe
                src={videoData.embedUrl}
                title="Product video preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        ) : videoUrl.trim() ? (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '6px',
            }}
          >
            <AlertCircle size={14} />
            <span>Could not detect video. Please provide a valid YouTube link or Google Drive share link.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
