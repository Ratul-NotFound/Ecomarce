-- ============================================================
-- Migration 001: Initial Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy/trigram text search

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  role          TEXT        NOT NULL DEFAULT 'customer'
                            CHECK (role IN ('customer', 'moderator', 'admin')),
  referral_code TEXT        UNIQUE NOT NULL
                            DEFAULT substring(md5(random()::text || now()::text), 1, 8),
  referred_by   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  points        INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en          TEXT        NOT NULL,
  name_bn          TEXT,
  slug             TEXT        UNIQUE NOT NULL,
  parent_id        UUID        REFERENCES categories(id) ON DELETE SET NULL,
  image_url        TEXT,
  display_order    INTEGER     NOT NULL DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  meta_title       TEXT,
  meta_description TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en              TEXT        NOT NULL,
  name_bn              TEXT,
  slug                 TEXT        UNIQUE NOT NULL,
  description_en       TEXT,
  description_bn       TEXT,
  category_id          UUID        REFERENCES categories(id) ON DELETE SET NULL,
  brand                TEXT,
  sku                  TEXT        UNIQUE NOT NULL,
  base_price           NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
  sale_price           NUMERIC(10,2) CHECK (sale_price >= 0),
  -- Auto-calculated discount percentage
  discount_percent     NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN sale_price IS NOT NULL AND base_price > 0
      THEN ROUND(((base_price - sale_price) / base_price * 100), 2)
      ELSE NULL
    END
  ) STORED,
  stock_quantity       INTEGER     NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold  INTEGER     NOT NULL DEFAULT 5,
  images               TEXT[]      NOT NULL DEFAULT '{}',
  tags                 TEXT[]      NOT NULL DEFAULT '{}',
  has_variants         BOOLEAN     NOT NULL DEFAULT false,
  weight_grams         INTEGER,
  is_active            BOOLEAN     NOT NULL DEFAULT true,
  is_featured          BOOLEAN     NOT NULL DEFAULT false,
  is_flash_sale        BOOLEAN     NOT NULL DEFAULT false,
  flash_sale_ends_at   TIMESTAMPTZ,
  display_order        INTEGER     NOT NULL DEFAULT 0,
  total_sold           INTEGER     NOT NULL DEFAULT 0,
  total_views          INTEGER     NOT NULL DEFAULT 0,
  meta_title           TEXT,
  meta_description     TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCT VARIANTS (size / color / material)
-- ============================================================
CREATE TABLE product_variants (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id     UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size           TEXT,
  color          TEXT,
  material       TEXT,
  sku            TEXT        NOT NULL,
  price_modifier NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER     NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  images         TEXT[]      NOT NULL DEFAULT '{}'
);

-- ============================================================
-- PRODUCT REVIEWS
-- ============================================================
CREATE TABLE product_reviews (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id           UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id              UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating               INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                TEXT,
  body                 TEXT        NOT NULL,
  images               TEXT[]      NOT NULL DEFAULT '{}',
  is_verified_purchase BOOLEAN     NOT NULL DEFAULT false,
  helpful_count        INTEGER     NOT NULL DEFAULT 0,
  status               TEXT        NOT NULL DEFAULT 'published'
                                   CHECK (status IN ('published', 'pending', 'rejected')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- ============================================================
-- PRODUCT Q&A
-- ============================================================
CREATE TABLE product_questions (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question    TEXT        NOT NULL,
  answer      TEXT,
  answered_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WISHLISTS
-- ============================================================
CREATE TABLE wishlists (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ============================================================
-- ADDRESSES
-- ============================================================
CREATE TABLE addresses (
  id             UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label          TEXT    NOT NULL DEFAULT 'Home',
  full_name      TEXT    NOT NULL,
  phone          TEXT    NOT NULL,
  district       TEXT    NOT NULL,
  upazila        TEXT    NOT NULL,
  area           TEXT,
  street_address TEXT    NOT NULL,
  is_default     BOOLEAN NOT NULL DEFAULT false
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number           TEXT        UNIQUE NOT NULL,
  user_id                UUID        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  shipping_address       JSONB       NOT NULL,
  items_snapshot         JSONB       NOT NULL DEFAULT '[]',
  subtotal               NUMERIC(10,2) NOT NULL,
  shipping_fee           NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                  NUMERIC(10,2) NOT NULL,
  payment_method         TEXT        NOT NULL
                                     CHECK (payment_method IN ('bkash', 'nagad', 'cod')),
  payment_status         TEXT        NOT NULL DEFAULT 'pending'
                                     CHECK (payment_status IN ('pending', 'submitted', 'confirmed', 'failed')),
  payment_transaction_id TEXT,
  payment_screenshot_url TEXT,
  status                 TEXT        NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned')),
  tracking_info          JSONB       NOT NULL DEFAULT '[]',
  coupon_code            TEXT,
  affiliate_code         TEXT,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDER ITEMS (normalized, but also snapshotted in orders.items_snapshot)
-- ============================================================
CREATE TABLE order_items (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     UUID          REFERENCES products(id) ON DELETE SET NULL,
  variant_id     UUID          REFERENCES product_variants(id) ON DELETE SET NULL,
  name_snapshot  TEXT          NOT NULL,
  image_snapshot TEXT          NOT NULL DEFAULT '',
  quantity       INTEGER       NOT NULL CHECK (quantity > 0),
  unit_price     NUMERIC(10,2) NOT NULL,
  total_price    NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- ORDER TRACKING EVENTS
-- ============================================================
CREATE TABLE order_tracking (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  location   TEXT,
  updated_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id        UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  method         TEXT          NOT NULL,
  transaction_id TEXT,
  screenshot_url TEXT,
  amount         NUMERIC(10,2) NOT NULL,
  status         TEXT          NOT NULL DEFAULT 'pending',
  verified_by    UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at    TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE coupons (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             TEXT          UNIQUE NOT NULL,
  type             TEXT          NOT NULL CHECK (type IN ('percent', 'fixed')),
  value            NUMERIC(10,2) NOT NULL CHECK (value > 0),
  min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses         INTEGER,
  used_count       INTEGER       NOT NULL DEFAULT 0,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN       NOT NULL DEFAULT true
);

-- ============================================================
-- SPECIAL OFFERS / BANNERS
-- ============================================================
CREATE TABLE special_offers (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_en      TEXT        NOT NULL,
  title_bn      TEXT,
  subtitle      TEXT,
  image_url     TEXT        NOT NULL,
  link_url      TEXT,
  type          TEXT        NOT NULL
                            CHECK (type IN ('hero_banner', 'promo_card', 'special_offer')),
  display_order INTEGER     NOT NULL DEFAULT 0,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ
);

-- ============================================================
-- STORE SETTINGS (key-value store)
-- ============================================================
CREATE TABLE store_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- ============================================================
-- INVENTORY LOGS
-- ============================================================
CREATE TABLE inventory_logs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id      UUID        REFERENCES product_variants(id) ON DELETE SET NULL,
  change_type     TEXT        NOT NULL
                              CHECK (change_type IN ('sale', 'restock', 'adjustment', 'return')),
  quantity_before INTEGER     NOT NULL,
  quantity_change INTEGER     NOT NULL,
  quantity_after  INTEGER     NOT NULL,
  reference_id    UUID,
  notes           TEXT,
  created_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AFFILIATES
-- ============================================================
CREATE TABLE affiliates (
  id                 UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID          UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code               TEXT          UNIQUE NOT NULL,
  commission_percent NUMERIC(5,2)  NOT NULL DEFAULT 5,
  total_earned       NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_paid         NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active          BOOLEAN       NOT NULL DEFAULT true
);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
CREATE TABLE analytics_events (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type  TEXT        NOT NULL
                          CHECK (event_type IN ('page_view', 'product_view', 'add_to_cart', 'purchase')),
  page_url    TEXT,
  product_id  UUID        REFERENCES products(id) ON DELETE SET NULL,
  user_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  session_id  TEXT,
  country     TEXT,
  device_type TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHAT MESSAGES (Telegram widget)
-- ============================================================
CREATE TABLE chat_messages (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  user_name           TEXT,
  message             TEXT        NOT NULL,
  direction           TEXT        NOT NULL CHECK (direction IN ('in', 'out')),
  telegram_message_id BIGINT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

-- Auto-update updated_at on products and orders
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Customer'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-generate order number: EC-2024-1001
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'EC-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                      LPAD(nextval('order_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION generate_order_number();

-- Helper RPC: safely increment product views
CREATE OR REPLACE FUNCTION increment_product_views(product_id UUID)
RETURNS VOID AS $$
  UPDATE products SET total_views = total_views + 1 WHERE id = product_id;
$$ LANGUAGE SQL;

-- Helper RPC: increment coupon usage count
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_code TEXT)
RETURNS VOID AS $$
  UPDATE coupons SET used_count = used_count + 1 WHERE code = coupon_code;
$$ LANGUAGE SQL;

-- Helper RPC: ensure only one default address per user
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER single_default_address
  AFTER INSERT OR UPDATE ON addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_address();
