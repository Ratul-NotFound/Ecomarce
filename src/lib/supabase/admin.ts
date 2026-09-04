// src/lib/supabase/admin.ts
// Service-role Supabase client — SERVER ONLY. Bypasses RLS.
// Use ONLY in API routes & admin server pages for admin operations.
// Reuses singleton instance to preserve connection pooling.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _adminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (_adminClient) {
    return _adminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key';

  _adminClient = createClient(
    url,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return _adminClient;
}
