import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') || '/';

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Auth code exchange error:', error.message);
      }
    } catch (err) {
      console.error('Error exchanging auth code:', err);
    }
  }

  // URL to redirect to after sign in process completes
  const target = redirect.startsWith('/') ? redirect : `/${redirect}`;
  return NextResponse.redirect(new URL(target, origin));
}
