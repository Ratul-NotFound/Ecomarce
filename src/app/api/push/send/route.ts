import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin-guard';
import { sendPushToUser } from '@/lib/push-notifications';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    await sendPushToUser(auth.user.id, {
      title:   body.title   ?? '🛍️ Push Notification Test',
      body:    body.message ?? 'Push notifications are working correctly!',
      url:     '/admin',
      tag:     'test-push',
      vibrate: [100, 50, 100, 50, 300],
      actions: [{ action: 'open', title: 'Open Admin' }],
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
