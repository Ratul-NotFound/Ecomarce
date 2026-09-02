-- ============================================================
-- Migration 003: Add Product Cost Price (Buying Price / COGS)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) CHECK (cost_price >= 0);

COMMENT ON COLUMN products.cost_price IS 'Our buying / wholesale purchase cost per unit from supplier (COGS)';
