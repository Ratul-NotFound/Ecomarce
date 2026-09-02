'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { UploadCloud, X, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/shared/ToastProvider';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export default function ImageUploader({ images = [], onChange }: ImageUploaderProps) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const supabase = createClient();
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const bucketName = 'products';
        let uploadRes = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadRes.error) {
          // Try capital 'Products' bucket if lowercase failed
          uploadRes = await supabase.storage
            .from('Products')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });
        }

        const { data, error } = uploadRes;

        if (error) {
          // If storage bucket doesn't exist yet, create data URL fallback for demonstration
          console.warn('Storage bucket upload error, using FileReader fallback:', error.message);
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          const base64 = await base64Promise;
          uploadedUrls.push(base64);
        } else if (data) {
          const usedBucket = uploadRes.data ? (uploadRes.error === null && uploadRes.data ? 'products' : 'Products') : 'products';
          const { data: publicUrlData } = supabase.storage
            .from(usedBucket)
            .getPublicUrl(filePath);
          uploadedUrls.push(publicUrlData.publicUrl);
        }
      }

      onChange([...images, ...uploadedUrls]);
      showToast('Image(s) added successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Image upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onChange([...images, customUrl.trim()]);
    setCustomUrl('');
    showToast('Image URL added', 'success');
  };

  const handleRemove = (idxToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== idxToRemove));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* File Upload Box */}
      <div
        style={{
          border: '2px dashed var(--color-admin-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          textAlign: 'center',
          background: 'var(--color-admin-surface-2)',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
          }}
        />
        <UploadCloud size={36} color="var(--color-primary-light)" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
          {uploading ? 'Uploading media...' : 'Click or Drag images to upload'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
          PNG, JPG, WEBP up to 5MB
        </div>
      </div>

      {/* Or Paste Direct Image URL */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="url"
          placeholder="Or paste direct image URL (e.g. Unsplash, Cloudinary)..."
          className="admin-input"
          value={customUrl}
          onChange={e => setCustomUrl(e.target.value)}
        />
        <button
          type="button"
          onClick={handleAddUrl}
          disabled={!customUrl.trim()}
          className="btn btn-secondary btn-sm"
          style={{ background: 'var(--color-admin-surface-2)', color: '#ffffff', borderColor: 'var(--color-admin-border)' }}
        >
          <Plus size={14} />
          <span>Add URL</span>
        </button>
      </div>

      {/* Uploaded Thumbnails Grid */}
      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '12px' }}>
          {images.map((img, idx) => (
            <div
              key={idx}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1px solid var(--color-admin-border)',
                background: 'var(--color-admin-surface)',
              }}
            >
              <Image src={img} alt={`Preview ${idx + 1}`} fill style={{ objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: 'rgba(239, 68, 68, 0.85)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="Remove image"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
