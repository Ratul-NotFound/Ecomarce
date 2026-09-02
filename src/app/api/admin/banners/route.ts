import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const body = await request.json();
    const { id, title_en, title_bn, subtitle, link_url, image_url, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
    }

    const updatePayload: any = {};
    if (title_en !== undefined) updatePayload.title_en = title_en;
    if (title_bn !== undefined) updatePayload.title_bn = title_bn;
    if (subtitle !== undefined) updatePayload.subtitle = subtitle;
    if (link_url !== undefined) updatePayload.link_url = link_url;
    if (image_url !== undefined) updatePayload.image_url = image_url;
    if (is_active !== undefined) updatePayload.is_active = is_active;

    const { data, error } = await dbClient
      .from('special_offers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, banner: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update banner' }, { status: 500 });
  }
}
