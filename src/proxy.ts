import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Helper to fetch user role securely
  async function getUserRole(): Promise<string> {
    if (!user) return 'guest';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      try {
        const { createClient: createAdmin } = await import('@supabase/supabase-js');
        const adminClient = createAdmin(supabaseUrl!, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: adminProfile } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        return adminProfile?.role || 'customer';
      } catch {}
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    return profile?.role || 'customer';
  }

  // 1. Protect /api/admin routes at the Edge proxy level
  if (pathname.startsWith('/api/admin')) {
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }
    const role = await getUserRole();
    if (role !== 'admin' && role !== 'moderator') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
  }

  // 2. Protect /admin UI pages
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = new URL('/auth', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    const role = await getUserRole();
    if (role !== 'admin' && role !== 'moderator') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 3. Protect /account, /orders, /wishlist customer routes
  const protectedUserRoutes = ['/account', '/orders', '/wishlist'];
  if (protectedUserRoutes.some(route => pathname.startsWith(route))) {
    if (!user) {
      const url = new URL('/auth', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|sw.js|workbox-.*).*)',
  ],
};
