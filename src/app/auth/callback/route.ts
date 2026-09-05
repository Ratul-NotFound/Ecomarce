import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdmin } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectParam = searchParams.get('next') || searchParams.get('redirect') || '/';
  const targetPath = redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`;

  // Build canonical base URL with prioritized fallbacks
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';

  let baseUrl: string;
  if (siteUrl && siteUrl.startsWith('http')) {
    baseUrl = siteUrl.replace(/\/$/, '');
  } else if (isLocalEnv) {
    baseUrl = origin;
  } else if (forwardedHost) {
    baseUrl = `https://${forwardedHost}`;
  } else {
    baseUrl = origin;
  }

  const redirectUrl = `${baseUrl}${targetPath}`;

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

    const cookiesToSetList: Array<{ name: string; value: string; options?: any }> = [];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            cookiesToSetList.push({ name, value, options });
          });
        },
      },
    });

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Auth code exchange error:', error.message);
        return NextResponse.redirect(`${baseUrl}/auth?error=${encodeURIComponent(error.message)}`);
      }

      // Profile upsert & Google avatar preservation
      if (data?.session?.user) {
        const user = data.session.user;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceRoleKey) {
          const adminClient = createAdmin(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

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

      // Return an HTML bridge with full PWA cross-window sync
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authenticating...</title>
  <meta http-equiv="refresh" content="2;url=${redirectUrl}">
  <style>
    body {
      margin: 0;
      background: #0f0f1a;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      text-align: center;
      padding: 32px 24px;
      max-width: 320px;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3.5px solid rgba(99, 102, 241, 0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 18px; margin: 0 0 8px; font-weight: 700; }
    p { font-size: 13.5px; color: #94a3b8; margin: 0; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Signed In Successfully</h2>
    <p>Returning you to ShopBD...</p>
  </div>
  <script>
    try {
      localStorage.setItem('shopbd_auth_sync', Date.now().toString());
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('shopbd_auth_channel');
        channel.postMessage({ type: 'AUTH_SUCCESS', timestamp: Date.now() });
      }
    } catch(e) {}
    window.location.replace('${redirectUrl}');
  </script>
</body>
</html>`;

      const response = new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });

      // Apply all session cookies to the response
      cookiesToSetList.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          ...options,
        });
      });

      return response;
    } catch (err: any) {
      console.error('Callback error:', err);
      return NextResponse.redirect(`${baseUrl}/auth?error=${encodeURIComponent(err.message || 'auth_failed')}`);
    }
  }

  return NextResponse.redirect(redirectUrl);
}
