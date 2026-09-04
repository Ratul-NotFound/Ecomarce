import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/types';

export interface AdminAuthResult {
  authorized: boolean;
  user?: any;
  role?: string;
  effectiveRole?: 'super_admin' | 'admin' | 'moderator' | 'customer';
  isSuperAdmin?: boolean;
  dbClient: any;
  response?: NextResponse;
}

/**
 * Checks if a user is the root Super Admin.
 * Checks metadata flag, environment owner email, or permanent founder ID.
 */
export function isSuperAdmin(user: any, profile?: any): boolean {
  if (!user) return false;

  // 1. User metadata flag
  if (user.user_metadata?.is_super_admin === true) return true;

  // 2. Verified owner email
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'm.h.ratul18@gmail.com').toLowerCase().trim();
  if (user.email && user.email.toLowerCase().trim() === superAdminEmail) return true;

  // 3. Founder user ID
  if (user.id === '17267732-4774-45f6-8cfc-40ef0cdd602d') return true;

  return false;
}

/**
 * Resolves the hierarchical effective role of a user.
 */
export function getEffectiveRole(user: any, profile?: any): 'super_admin' | 'admin' | 'moderator' | 'customer' {
  if (isSuperAdmin(user, profile)) return 'super_admin';
  const r = profile?.role;
  if (r === 'admin') return 'admin';
  if (r === 'moderator') return 'moderator';
  return 'customer';
}

/**
 * Enforces admin or moderator role on API endpoints (Base Staff Access).
 * Allows: super_admin, admin, moderator.
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
    .select('role, id, full_name')
    .eq('id', user.id)
    .maybeSingle();

  const effectiveRole = getEffectiveRole(user, profile);
  const isSuper = effectiveRole === 'super_admin';

  if (effectiveRole === 'customer') {
    return {
      authorized: false,
      user,
      role: 'customer',
      effectiveRole: 'customer',
      isSuperAdmin: false,
      dbClient,
      response: NextResponse.json(
        { error: 'Forbidden: Admin or Moderator privileges required' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user,
    role: profile?.role || (isSuper ? 'admin' : 'customer'),
    effectiveRole,
    isSuperAdmin: isSuper,
    dbClient,
  };
}

/**
 * Enforces Admin or Super Admin role.
 * Blocks: moderators and customers.
 */
export async function requireAdminOrAbove(request?: NextRequest): Promise<AdminAuthResult> {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) return auth;

  if (auth.effectiveRole !== 'super_admin' && auth.effectiveRole !== 'admin') {
    return {
      ...auth,
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden: Operations Admin or Super Admin privileges required' },
        { status: 403 }
      ),
    };
  }

  return auth;
}

/**
 * Enforces strictly Super Admin role.
 * Blocks: admins, moderators, and customers.
 */
export async function requireSuperAdminAuth(request?: NextRequest): Promise<AdminAuthResult> {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) return auth;

  if (auth.effectiveRole !== 'super_admin') {
    return {
      ...auth,
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden: Super Admin privileges required for this action' },
        { status: 403 }
      ),
    };
  }

  return auth;
}
