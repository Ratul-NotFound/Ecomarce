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

      // Safety check: Ensure profile exists in profiles table and Google avatar is saved
      if (data?.session?.user) {
        const user = data.session.user;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceRoleKey) {
          const adminClient = createAdmin(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          // Extract avatar from all possible Google OIDC claims
          let googleAvatar: string | null = null;
          const meta = user.user_metadata || {};
          if (meta.avatar_url && typeof meta.avatar_url === 'string') googleAvatar = meta.avatar_url;
          else if (meta.picture && typeof meta.picture === 'string') googleAvatar = meta.picture;
          else if (Array.isArray(user.identities)) {
            for (const id of user.identities) {
              const idData = id.identity_data || {};
              if (idData.avatar_url && typeof idData.avatar_url === 'string') {
                googleAvatar = idData.avatar_url;
                break;
              }
              if (idData.picture && typeof idData.picture === 'string') {
                googleAvatar = idData.picture;
                break;
              }
            }
          }

          const fullName =
            meta.full_name ||
            meta.name ||
            user.identities?.[0]?.identity_data?.full_name ||
            user.identities?.[0]?.identity_data?.name ||
            user.email?.split('@')[0] ||
            'Customer';

          const { data: existingProfile } = await adminClient
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .eq('id', user.id)
            .maybeSingle();

          if (!existingProfile) {
            await adminClient.from('profiles').insert({
              id: user.id,
              full_name: fullName,
              avatar_url: googleAvatar,
              role: 'customer',
            });
          } else {
            const updates: Record<string, any> = {};
            if (googleAvatar && existingProfile.avatar_url !== googleAvatar) {
              updates.avatar_url = googleAvatar;
            }
            if (fullName && (!existingProfile.full_name || existingProfile.full_name === 'Customer')) {
              updates.full_name = fullName;
            }
            if (Object.keys(updates).length > 0) {
              await adminClient.from('profiles').update(updates).eq('id', user.id);
            }
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
