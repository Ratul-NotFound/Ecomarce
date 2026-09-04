import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AdminAuthResult {
  authorized: boolean;
  user?: any;
  role?: string;
  dbClient: any;
  response?: NextResponse;
}

/**
 * Enforces admin or moderator role on API endpoints.
 * Returns authorized: true with the user, role, and appropriate dbClient.
 * If unauthorized, returns authorized: false and an immediate NextResponse (401 or 403).
 */
export async function requireAdminAuth(request?: NextRequest): Promise<AdminAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      dbClient: supabase,
      response: NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      ),
    };
  }

  let dbClient = supabase;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      dbClient = createAdminClient();
    } catch {}
  }

  // Check role in profiles table
  const { data: profile } = await dbClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role;
  if (!role || (role !== 'admin' && role !== 'moderator')) {
    return {
      authorized: false,
      user,
      role,
      dbClient,
      response: NextResponse.json(
        { error: 'Forbidden: Admin privileges required' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user,
    role,
    dbClient,
  };
}
