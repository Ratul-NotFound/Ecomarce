-- ============================================================
-- Migration 004: Add Product Video URL (YouTube, Google Drive, MP4)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN products.video_url IS 'Streaming video link (YouTube unlisted/public, Google Drive preview, or direct MP4)';
