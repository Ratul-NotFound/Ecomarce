-- ============================================================
-- Migration 002: Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews   ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_offers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER SECURITY FUNCTIONS
-- ============================================================

-- Returns true if current user has admin or moderator role
CREATE OR REPLACE FUNCTION is_admin_or_moderator()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'moderator')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Returns true if current user is admin only
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "Users read own profile or admin reads all"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin_or_moderator());

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin updates any profile"
  ON profiles FOR UPDATE
  USING (is_admin());

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE POLICY "Anyone reads active categories"
  ON categories FOR SELECT
  USING (is_active = true OR is_admin_or_moderator());

CREATE POLICY "Admin manages categories"
  ON categories FOR ALL
  USING (is_admin());

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE POLICY "Anyone reads active products"
  ON products FOR SELECT
  USING (is_active = true OR is_admin_or_moderator());

CREATE POLICY "Admin and moderator manage products"
  ON products FOR ALL
  USING (is_admin_or_moderator());

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================
CREATE POLICY "Anyone reads variants of active products"
  ON product_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_id AND (products.is_active = true OR is_admin_or_moderator())
    )
  );

CREATE POLICY "Admin manages variants"
  ON product_variants FOR ALL
  USING (is_admin_or_moderator());

-- ============================================================
-- PRODUCT REVIEWS
-- ============================================================
CREATE POLICY "Anyone reads published reviews"
  ON product_reviews FOR SELECT
  USING (status = 'published' OR is_admin_or_moderator() OR user_id = auth.uid());

CREATE POLICY "Authenticated users create reviews"
  ON product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users update own review or admin updates any"
  ON product_reviews FOR UPDATE
  USING (auth.uid() = user_id OR is_admin_or_moderator());

CREATE POLICY "Admin deletes reviews"
  ON product_reviews FOR DELETE
  USING (is_admin_or_moderator());

-- ============================================================
-- PRODUCT Q&A
-- ============================================================
CREATE POLICY "Anyone reads questions"
  ON product_questions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users ask questions"
  ON product_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin answers questions"
  ON product_questions FOR UPDATE
  USING (is_admin_or_moderator());

CREATE POLICY "Admin deletes questions"
  ON product_questions FOR DELETE
  USING (is_admin_or_moderator());

-- ============================================================
-- WISHLISTS
-- ============================================================
CREATE POLICY "Users manage own wishlist"
  ON wishlists FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- ADDRESSES
-- ============================================================
CREATE POLICY "Users manage own addresses"
  ON addresses FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE POLICY "Users read own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id OR is_admin_or_moderator());

CREATE POLICY "Authenticated users create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin and moderator update orders"
  ON orders FOR UPDATE
  USING (is_admin_or_moderator());

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE POLICY "Users read own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND (orders.user_id = auth.uid() OR is_admin_or_moderator())
    )
  );

-- Order items are inserted by the API route (service role), not directly by client
CREATE POLICY "Service role inserts order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- ORDER TRACKING
-- ============================================================
CREATE POLICY "Users read tracking for own orders"
  ON order_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND (orders.user_id = auth.uid() OR is_admin_or_moderator())
    )
  );

CREATE POLICY "Admin writes tracking events"
  ON order_tracking FOR INSERT
  WITH CHECK (is_admin_or_moderator());

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE POLICY "Users read own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id OR is_admin_or_moderator());

CREATE POLICY "Users submit payment"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin verifies payments"
  ON payments FOR UPDATE
  USING (is_admin_or_moderator());

-- ============================================================
-- COUPONS
-- ============================================================
CREATE POLICY "Authenticated users read active coupons"
  ON coupons FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admin manages coupons"
  ON coupons FOR ALL
  USING (is_admin());

-- ============================================================
-- SPECIAL OFFERS / BANNERS
-- ============================================================
CREATE POLICY "Anyone reads active offers"
  ON special_offers FOR SELECT
  USING (is_active = true OR is_admin_or_moderator());

CREATE POLICY "Admin manages offers"
  ON special_offers FOR ALL
  USING (is_admin());

-- ============================================================
-- STORE SETTINGS
-- ============================================================
CREATE POLICY "Anyone reads store settings"
  ON store_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin manages settings"
  ON store_settings FOR ALL
  USING (is_admin());

-- ============================================================
-- INVENTORY LOGS
-- ============================================================
CREATE POLICY "Admin reads inventory logs"
  ON inventory_logs FOR SELECT
  USING (is_admin_or_moderator());

CREATE POLICY "Admin writes inventory logs"
  ON inventory_logs FOR INSERT
  WITH CHECK (is_admin_or_moderator());

-- ============================================================
-- AFFILIATES
-- ============================================================
CREATE POLICY "Users read own affiliate data"
  ON affiliates FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admin manages affiliates"
  ON affiliates FOR ALL
  USING (is_admin());

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
-- Anyone can insert events (anonymous tracking)
CREATE POLICY "Anyone inserts analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin reads analytics"
  ON analytics_events FOR SELECT
  USING (is_admin());

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE POLICY "Users read own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id OR is_admin_or_moderator());

CREATE POLICY "Anyone sends chat messages (including guests)"
  ON chat_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin reads all chat messages"
  ON chat_messages FOR SELECT
  USING (is_admin_or_moderator());
