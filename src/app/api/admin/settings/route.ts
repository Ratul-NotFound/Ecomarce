import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const { data, error } = await dbClient.from('store_settings').select('*');
    if (error) throw error;

    const settingsMap: Record<string, any> = {};
    (data || []).forEach(row => {
      settingsMap[row.key] = row.value;
    });

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const body = await request.json();
    const entries = Object.entries(body);

    for (const [key, value] of entries) {
      await dbClient.from('store_settings').upsert({
        key,
        value,
      });
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save settings' }, { status: 500 });
  }
}
