import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdmin } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectParam = searchParams.get('next') || searchParams.get('redirect') || '/';
  const targetPath = redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`;

  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const redirectUrl = isLocalEnv
    ? `${origin}${targetPath}`
    : forwardedHost
    ? `https://${forwardedHost}${targetPath}`
    : `${origin}${targetPath}`;

  const response = NextResponse.redirect(redirectUrl);

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Auth code exchange error:', error.message);
        return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`);
      }

      // Safety check: Ensure profile exists in profiles table
      if (data?.session?.user) {
        const user = data.session.user;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceRoleKey) {
          const adminClient = createAdmin(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
          const { data: existingProfile } = await adminClient
            .from('profiles')
            .select('id, avatar_url')
            .eq('id', user.id)
            .single();

          const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

          if (!existingProfile) {
            await adminClient.from('profiles').insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Customer',
              avatar_url: googleAvatar,
              role: 'customer',
            }).select();
          } else if (googleAvatar && existingProfile.avatar_url !== googleAvatar) {
            await adminClient.from('profiles').update({
              avatar_url: googleAvatar,
            }).eq('id', user.id);
          }
        }
      }

      return response;
    } catch (err: any) {
      console.error('Callback error:', err);
      return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(err.message || 'auth_failed')}`);
    }
  }

  return response;
}
