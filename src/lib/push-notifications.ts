// src/lib/push-notifications.ts  — SERVER-ONLY
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  vibrate?: number[];
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

function getVapidConfig() {
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject    = process.env.VAPID_SUBJECT ?? 'mailto:admin@shopbd.com';
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured. Run: npm run generate:vapid');
  }
  return { publicKey, privateKey, subject };
}

export async function removeStaleSubscription(endpoint: string): Promise<void> {
  const db = createAdminClient();
  await db.from('push_subscriptions').delete().eq('endpoint', endpoint);
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const { publicKey, privateKey, subject } = getVapidConfig();
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const db = createAdminClient();
  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error) { console.error('[push] fetch subs error', userId, error); return; }
  if (!subs || subs.length === 0) return;

  const notifPayload = JSON.stringify({
    title:   payload.title,
    body:    payload.body,
    icon:    payload.icon    ?? '/icons/icon-192.png',
    badge:   payload.badge   ?? '/icons/badge-72.png',
    url:     payload.url     ?? '/',
    tag:     payload.tag     ?? 'shopbd-notification',
    vibrate: payload.vibrate ?? [200, 100, 200],
    actions: payload.actions ?? [],
  });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notifPayload,
        { urgency: 'high', TTL: 86400 }
      )
    )
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'rejected') {
      const err = r.reason as any;
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await removeStaleSubscription(subs[i].endpoint);
      } else {
        console.error('[push] send failed:', err?.message ?? err);
      }
    }
  }
}
