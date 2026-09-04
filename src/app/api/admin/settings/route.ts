import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminAuth } from '@/lib/auth/admin-guard';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const { data, error } = await dbClient.from('store_settings').select('*');
    if (error) throw error;

    const settingsMap: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      settingsMap[row.key] = row.value;
    });

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    const entries = Object.entries(body);

    for (const [key, value] of entries) {
      await dbClient.from('store_settings').upsert({
        key,
        value,
      });
    }

    // If flash sale end time is updated, ensure both keys stay synced
    const flashEnd = body.flash_sale_end_time || body.homepage_flash_sale_end;
    if (flashEnd !== undefined) {
      await dbClient.from('store_settings').upsert({
        key: 'flash_sale_end_time',
        value: flashEnd,
      });
      await dbClient.from('store_settings').upsert({
        key: 'homepage_flash_sale_end',
        value: flashEnd,
      });

      // Synchronize all active flash sale products to the same target date
      if (flashEnd) {
        await dbClient
          .from('products')
          .update({ flash_sale_ends_at: flashEnd })
          .eq('is_flash_sale', true);
      }
    }

    // Invalidate Next.js cache so Homepage and Deals page update instantly
    try {
      revalidatePath('/', 'page');
      revalidatePath('/deals', 'page');
    } catch {}

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save settings' }, { status: 500 });
  }
}
