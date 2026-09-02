-- ============================================================
-- Migration 004: Seed Data (initial store settings)
-- Run AFTER 003_indexes.sql
-- ============================================================

-- Default store settings
INSERT INTO store_settings (key, value) VALUES
  ('store_name',    '"ShopBD"'),
  ('store_tagline', '"Your Trusted Online Shop"'),
  ('contact_email', '"support@shopbd.com"'),
  ('contact_phone', '"+880 1700-000000"'),
  ('address',       '"Dhaka, Bangladesh"'),
  ('bkash_number',  '"01700000000"'),
  ('nagad_number',  '"01700000000"'),
  ('shipping_inside_dhaka',  '60'),
  ('shipping_outside_dhaka', '120'),
  ('free_shipping_above',    '1500'),
  ('telegram_bot_token', '""'),
  ('telegram_chat_id',   '""'),
  ('social_facebook',  '"https://facebook.com/shopbd"'),
  ('social_instagram', '"https://instagram.com/shopbd"'),
  ('social_telegram',  '"https://t.me/shopbd"'),
  ('cod_enabled',    'true'),
  ('bkash_enabled',  'true'),
  ('nagad_enabled',  'true')
ON CONFLICT (key) DO NOTHING;

-- Sample categories (admin can add more from the admin panel)
INSERT INTO categories (name_en, name_bn, slug, display_order, is_active) VALUES
  ('Fashion',     'ফ্যাশন',    'fashion',     1, true),
  ('Electronics', 'ইলেকট্রনিক্স', 'electronics', 2, true),
  ('Lifestyle',   'লাইফস্টাইল', 'lifestyle',    3, true),
  ('Sports',      'স্পোর্টস',  'sports',       4, true),
  ('Home & Garden', 'হোম ও গার্ডেন', 'home-garden', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- Enable Supabase Realtime for chat_messages table
-- (Also do this manually in Supabase Dashboard → Database → Replication)
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
