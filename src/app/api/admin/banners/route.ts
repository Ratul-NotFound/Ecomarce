import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminAuth } from '@/lib/auth/admin-guard';

async function getDealsBannerIds(dbClient: any): Promise<string[]> {
  try {
    const { data } = await dbClient.from('store_settings').select('value').eq('key', 'deals_banner_ids').single();
    if (data && data.value) {
      return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    }
  } catch {}
  return [];
}

async function saveDealsBannerIds(dbClient: any, ids: string[]): Promise<void> {
  await dbClient.from('store_settings').upsert({
    key: 'deals_banner_ids',
    value: ids,
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const dealsIds = await getDealsBannerIds(dbClient);

    let query = dbClient.from('special_offers').select('*').order('display_order', { ascending: true });

    if (type === 'deals_banner') {
      if (dealsIds.length > 0) {
        query = query.or(`type.eq.deals_banner,id.in.(${dealsIds.join(',')})`);
      } else {
        query = query.eq('type', 'deals_banner');
      }
    } else if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw error;

    const banners = (data || []).map((b: any) => {
      if (dealsIds.includes(b.id)) {
        return { ...b, type: 'deals_banner' };
      }
      return b;
    });

    return NextResponse.json({ success: true, banners });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch banners' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const body = await request.json();
    const { title_en, title_bn, subtitle, link_url, image_url, type = 'hero_banner', display_order = 0, is_active = true } = body;

    if (!title_en || !title_en.trim()) {
      return NextResponse.json({ error: 'Banner title is required' }, { status: 400 });
    }

    const insertPayload = {
      title_en: title_en.trim(),
      title_bn: title_bn?.trim() || null,
      subtitle: subtitle?.trim() || null,
      link_url: link_url?.trim() || (type === 'deals_banner' ? '/deals' : '/search'),
      image_url: image_url?.trim() || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
      type,
      display_order: Number(display_order) || 0,
      is_active: is_active !== false,
    };

    let { data, error } = await dbClient
      .from('special_offers')
      .insert(insertPayload)
      .select()
      .single();

    // Fallback if special_offers_type_check does not allow 'deals_banner' yet
    if (error && error.message.includes('special_offers_type_check') && type === 'deals_banner') {
      const fallbackInsert = await dbClient
        .from('special_offers')
        .insert({
          ...insertPayload,
          type: 'special_offer',
        })
        .select()
        .single();

      if (fallbackInsert.error) throw fallbackInsert.error;
      data = fallbackInsert.data;

      const dealsIds = await getDealsBannerIds(dbClient);
      if (!dealsIds.includes(data.id)) {
        dealsIds.push(data.id);
        await saveDealsBannerIds(dbClient, dealsIds);
      }
      data.type = 'deals_banner';
    } else if (error) {
      throw error;
    }

    try {
      revalidatePath('/', 'page');
      revalidatePath('/deals', 'page');
    } catch {}

    return NextResponse.json({ success: true, banner: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create banner' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const body = await request.json();
    const { id, title_en, title_bn, subtitle, link_url, image_url, display_order, is_active, type } = body;

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
    }

    const updatePayload: any = {};
    if (title_en !== undefined) updatePayload.title_en = title_en;
    if (title_bn !== undefined) updatePayload.title_bn = title_bn;
    if (subtitle !== undefined) updatePayload.subtitle = subtitle;
    if (link_url !== undefined) updatePayload.link_url = link_url;
    if (image_url !== undefined) updatePayload.image_url = image_url;
    if (display_order !== undefined) updatePayload.display_order = Number(display_order);
    if (is_active !== undefined) updatePayload.is_active = is_active;
    if (type !== undefined) updatePayload.type = type;

    const { data, error } = await dbClient
      .from('special_offers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    try {
      revalidatePath('/', 'page');
      revalidatePath('/deals', 'page');
    } catch {}

    return NextResponse.json({ success: true, banner: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update banner' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
    }

    const { error } = await dbClient.from('special_offers').delete().eq('id', id);
    if (error) throw error;

    try {
      const dealsIds = await getDealsBannerIds(dbClient);
      if (dealsIds.includes(id)) {
        await saveDealsBannerIds(dbClient, dealsIds.filter(dId => dId !== id));
      }
    } catch {}

    try {
      revalidatePath('/', 'page');
      revalidatePath('/deals', 'page');
    } catch {}

    return NextResponse.json({ success: true, message: 'Banner deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete banner' }, { status: 500 });
  }
}
