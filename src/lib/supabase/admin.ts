// src/lib/supabase/admin.ts
// Service-role Supabase client — SERVER ONLY. Bypasses RLS.
// Use ONLY in API routes for admin operations (payment confirm, analytics write, etc.)
// NEVER expose this client to the browser.
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key';

  return createClient(
    url,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
