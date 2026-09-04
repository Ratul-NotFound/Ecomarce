import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminOrdersManager from '@/components/admin/AdminOrdersManager';
import type { Order } from '@/types';

export const revalidate = 0;

export default async function AdminOrdersPage() {
  const dbClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient();

  const { data } = await dbClient
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const orders = (data as Order[]) || [];

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Orders & Fulfillment</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Verify customer payments, filter orders by Days / Weeks / Months, and manage delivery status.
          </p>
        </div>
      </div>

      <AdminOrdersManager initialOrders={orders} />
    </div>
  );
}
