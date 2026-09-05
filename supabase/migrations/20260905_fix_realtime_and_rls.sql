-- ============================================================
-- MIGRATION: Fix Realtime & RLS for Chat + Orders + Push Subscriptions
-- Copy and run this script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Enable Supabase Realtime for chat_messages, orders, and order_tracking
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_tracking'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_tracking;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. Fix RLS for chat_messages:
--    Allow reading outbound support replies for real-time sync
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin reads all chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone reads outbound support replies" ON public.chat_messages;

CREATE POLICY "Anyone reads outbound support replies"
  ON public.chat_messages FOR SELECT
  USING (direction = 'out');

-- ────────────────────────────────────────────────────────────
-- 3. Create push_subscriptions table for Web Push & PWA
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own push subscriptions
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service role reads all push subscriptions
DROP POLICY IF EXISTS "Service role reads all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role reads all push subscriptions"
  ON public.push_subscriptions FOR SELECT TO service_role USING (true);

-- Service role can delete stale subscriptions
DROP POLICY IF EXISTS "Service role deletes stale push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role deletes stale push subscriptions"
  ON public.push_subscriptions FOR DELETE TO service_role USING (true);

-- ────────────────────────────────────────────────────────────
-- 4. Add index for fast Telegram webhook lookup
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_telegram_msg_id
  ON public.chat_messages (telegram_message_id)
  WHERE telegram_message_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 5. Reload PostgREST schema cache
-- ────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
