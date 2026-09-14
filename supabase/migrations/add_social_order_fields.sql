-- Migration: Add social channel tracking to orders table
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times (IF NOT EXISTS guards)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source_channel TEXT
    CHECK (source_channel IN ('facebook','whatsapp','instagram','phone','other')),
  ADD COLUMN IF NOT EXISTS social_handle TEXT;

-- Index for fast filtering of social orders in admin
CREATE INDEX IF NOT EXISTS idx_orders_source_channel
  ON orders (source_channel)
  WHERE source_channel IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN orders.source_channel IS 'Origin channel for manually entered social orders: facebook | whatsapp | instagram | phone | other';
COMMENT ON COLUMN orders.social_handle  IS 'Customer social handle, phone, or profile URL for the social channel order';
