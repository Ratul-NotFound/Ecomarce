import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import SocialOrdersManager from '@/components/admin/SocialOrdersManager';
import type { Order } from '@/types';

export const revalidate = 0;

export default async function SocialOrdersPage() {
  const dbClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient();

  // Only fetch social orders (those with a source_channel set)
  const { data } = await dbClient
    .from('orders')
    .select('*')
    .not('source_channel', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);

  const orders = (data as Order[]) || [];

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Social Orders</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Manually enter and track orders received via Facebook, WhatsApp, Instagram, or phone.
            Fully synced with inventory and order management.
          </p>
        </div>
      </div>

      <SocialOrdersManager initialOrders={orders} />
    </div>
  );
}
