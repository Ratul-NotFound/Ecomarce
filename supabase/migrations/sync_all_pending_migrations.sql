-- ========================================================================
-- ShopBD - Complete Supabase Schema Sync & Catch-Up Migration
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe & Idempotent: Can be run multiple times with ZERO data loss.
-- ========================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Add Missing Columns to `products` (Cost Price & Video Embeds)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) CHECK (cost_price >= 0);

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN public.products.cost_price IS 'Our buying / wholesale purchase cost per unit from supplier (COGS)';
COMMENT ON COLUMN public.products.video_url IS 'Streaming video link (YouTube unlisted/public, Google Drive preview, or direct MP4)';

-- 3. Add Missing Columns to `product_variants` (Variant Cost Price)
ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) CHECK (cost_price >= 0);

-- 4. Add Missing Column to `coupons`
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. Harden Authentication & RLS Security Definer Functions (Prevent Recursion)
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator()
RETURNS BOOLEAN AS $$
DECLARE
  current_role TEXT;
BEGIN
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_role IN ('admin', 'moderator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_role TEXT;
BEGIN
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Performance & Search Indexes (Trigram Autocomplete + FTS)
CREATE INDEX IF NOT EXISTS idx_products_slug          ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category      ON public.products (category_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_products_featured      ON public.products (is_featured, is_active) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_flash_sale    ON public.products (is_flash_sale, flash_sale_ends_at) WHERE is_flash_sale = true;
CREATE INDEX IF NOT EXISTS idx_products_active_new    ON public.products (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_active_sold   ON public.products (is_active, total_sold DESC);
CREATE INDEX IF NOT EXISTS idx_products_active_price  ON public.products (is_active, sale_price ASC NULLS LAST);

-- Full-Text Search (English + Bengali)
CREATE INDEX IF NOT EXISTS idx_products_fts
  ON public.products
  USING GIN (to_tsvector('english',
    COALESCE(name_en, '') || ' ' ||
    COALESCE(brand, '') || ' ' ||
    COALESCE(name_bn, '')
  ));

-- Trigram Index for Live Search Autocomplete & Typo Tolerance
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products
  USING GIN (name_en gin_trgm_ops);

-- Categories & Orders Indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug        ON public.categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent      ON public.categories (parent_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_categories_active      ON public.categories (is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_orders_user            ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status  ON public.orders (payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_number          ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at      ON public.orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order      ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product    ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_order   ON public.order_tracking (order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_product        ON public.product_reviews (product_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user           ON public.product_reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_questions_product      ON public.product_questions (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlists_user         ON public.wishlists (user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user         ON public.addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order         ON public.payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user          ON public.payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_product      ON public.inventory_logs (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_type         ON public.inventory_logs (change_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_type_date    ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_product      ON public.analytics_events (product_id, event_type) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_session      ON public.analytics_events (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_date         ON public.analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offers_type_active     ON public.special_offers (type, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_chat_user              ON public.chat_messages (user_id, created_at DESC);
-- 6b. Coupons Deals Page Visibility
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS show_on_deals_page BOOLEAN DEFAULT true;

-- 6c. Special Offers Types (Allow deals_banner)
ALTER TABLE public.special_offers DROP CONSTRAINT IF EXISTS special_offers_type_check;
ALTER TABLE public.special_offers ADD CONSTRAINT special_offers_type_check CHECK (type IN ('hero_banner', 'promo_card', 'special_offer', 'deals_banner'));

-- 7. Reload PostgREST API Schema Cache (Makes new columns immediately accessible)
NOTIFY pgrst, 'reload schema';

