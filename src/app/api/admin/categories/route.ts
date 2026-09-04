import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin-guard';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const { data, error } = await dbClient
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, categories: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch categories' }, { status: 500 });
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
    const { name_en, name_bn, slug, image_url, display_order, is_active } = body;

    if (!name_en || !name_en.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const autoSlug = (slug || name_en)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { data, error } = await dbClient
      .from('categories')
      .insert({
        name_en: name_en.trim(),
        name_bn: name_bn ? name_bn.trim() : null,
        slug: autoSlug,
        image_url: image_url || null,
        display_order: Number(display_order) || 99,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, category: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create category' }, { status: 500 });
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
    const { id, name_en, name_bn, slug, image_url, display_order, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const updatePayload: any = {};
    if (name_en !== undefined) updatePayload.name_en = name_en.trim();
    if (name_bn !== undefined) updatePayload.name_bn = name_bn ? name_bn.trim() : null;
    if (slug !== undefined) updatePayload.slug = slug.trim().toLowerCase();
    if (image_url !== undefined) updatePayload.image_url = image_url;
    if (display_order !== undefined) updatePayload.display_order = Number(display_order);
    if (is_active !== undefined) updatePayload.is_active = is_active;

    const { data, error } = await dbClient
      .from('categories')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, category: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update category' }, { status: 500 });
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
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const { error } = await dbClient.from('categories').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete category' }, { status: 500 });
  }
}
