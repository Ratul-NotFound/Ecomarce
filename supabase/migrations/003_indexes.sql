-- ============================================================
-- Migration 003: Performance Indexes
-- Run AFTER 002_rls_policies.sql
-- ============================================================

-- Products: most common query patterns
CREATE INDEX idx_products_slug          ON products (slug);
CREATE INDEX idx_products_category      ON products (category_id, is_active, display_order);
CREATE INDEX idx_products_featured      ON products (is_featured, is_active) WHERE is_featured = true;
CREATE INDEX idx_products_flash_sale    ON products (is_flash_sale, flash_sale_ends_at) WHERE is_flash_sale = true;
CREATE INDEX idx_products_active_new    ON products (is_active, created_at DESC);
CREATE INDEX idx_products_active_sold   ON products (is_active, total_sold DESC);
CREATE INDEX idx_products_active_price  ON products (is_active, sale_price ASC NULLS LAST);

-- Full-text search index (English + Bangla product names)
CREATE INDEX idx_products_fts
  ON products
  USING GIN (to_tsvector('english',
    COALESCE(name_en, '') || ' ' ||
    COALESCE(brand, '') || ' ' ||
    COALESCE(name_bn, '')
  ));

-- Trigram index for partial matching / autocomplete
CREATE INDEX idx_products_name_trgm
  ON products
  USING GIN (name_en gin_trgm_ops);

-- Categories
CREATE INDEX idx_categories_slug        ON categories (slug);
CREATE INDEX idx_categories_parent      ON categories (parent_id, is_active, display_order);
CREATE INDEX idx_categories_active      ON categories (is_active, display_order);

-- Orders: user history, admin dashboard
CREATE INDEX idx_orders_user            ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_status          ON orders (status, created_at DESC);
CREATE INDEX idx_orders_payment_status  ON orders (payment_status, created_at DESC);
CREATE INDEX idx_orders_number          ON orders (order_number);
CREATE INDEX idx_orders_created_at      ON orders (created_at DESC);

-- Order items
CREATE INDEX idx_order_items_order      ON order_items (order_id);
CREATE INDEX idx_order_items_product    ON order_items (product_id);

-- Order tracking
CREATE INDEX idx_order_tracking_order   ON order_tracking (order_id, created_at DESC);

-- Reviews
CREATE INDEX idx_reviews_product        ON product_reviews (product_id, status, created_at DESC);
CREATE INDEX idx_reviews_user           ON product_reviews (user_id);

-- Q&A
CREATE INDEX idx_questions_product      ON product_questions (product_id, created_at DESC);

-- Wishlists
CREATE INDEX idx_wishlists_user         ON wishlists (user_id);

-- Addresses
CREATE INDEX idx_addresses_user         ON addresses (user_id);

-- Payments
CREATE INDEX idx_payments_order         ON payments (order_id);
CREATE INDEX idx_payments_user          ON payments (user_id, created_at DESC);

-- Inventory logs
CREATE INDEX idx_inventory_product      ON inventory_logs (product_id, created_at DESC);
CREATE INDEX idx_inventory_type         ON inventory_logs (change_type, created_at DESC);

-- Analytics (time-series queries)
CREATE INDEX idx_analytics_type_date    ON analytics_events (event_type, created_at DESC);
CREATE INDEX idx_analytics_product      ON analytics_events (product_id, event_type) WHERE product_id IS NOT NULL;
CREATE INDEX idx_analytics_session      ON analytics_events (session_id, created_at DESC);
CREATE INDEX idx_analytics_date         ON analytics_events (created_at DESC);

-- Special offers
CREATE INDEX idx_offers_type_active     ON special_offers (type, is_active, display_order);

-- Chat messages
CREATE INDEX idx_chat_user              ON chat_messages (user_id, created_at DESC);
CREATE INDEX idx_chat_direction         ON chat_messages (direction, created_at DESC);
