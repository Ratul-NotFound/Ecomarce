import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminCustomersManager, { CustomerRecord } from '@/components/admin/AdminCustomersManager';

export const revalidate = 0;

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  let dbClient = supabase;
  let adminClient: any = null;

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      adminClient = createAdminClient();
      dbClient = adminClient;
    }
  } catch (err) {
    console.error('Error initializing admin client:', err);
  }

  // Fetch profiles, auth users (for email & oauth avatars), and orders (for lifetime stats) in parallel
  const [profilesRes, usersRes, ordersRes] = await Promise.all([
    dbClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false }),
    adminClient
      ? adminClient.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] } }))
      : Promise.resolve({ data: { users: [] } }),
    Promise.resolve(
      dbClient.from('orders').select('id, user_id, customer_email, total, status')
    ).catch(() => ({ data: [] as any[] })),
  ]);

  const profiles = profilesRes?.data || [];
  const authUsers = usersRes?.data?.users || [];
  const orders = ordersRes?.data || [];

  // Map auth users by id for instant O(1) lookup of email and OAuth avatar
  const authMap = new Map<string, { email: string | null; avatar_url: string | null }>();
  for (const u of authUsers) {
    const avatar =
      u.user_metadata?.avatar_url ||
      u.user_metadata?.picture ||
      u.identities?.[0]?.identity_data?.avatar_url ||
      u.identities?.[0]?.identity_data?.picture ||
      null;

    authMap.set(u.id, {
      email: u.email || null,
      avatar_url: avatar,
    });
  }

  // Aggregate order stats by user_id and customer_email
  const orderStatsByUserId = new Map<string, { count: number; spent: number }>();
  const orderStatsByEmail = new Map<string, { count: number; spent: number }>();

  for (const order of orders) {
    const total = Number(order.total) || 0;
    const isValidOrder = order.status !== 'cancelled';

    if (order.user_id) {
      const curr = orderStatsByUserId.get(order.user_id) || { count: 0, spent: 0 };
      orderStatsByUserId.set(order.user_id, {
        count: curr.count + 1,
        spent: isValidOrder ? curr.spent + total : curr.spent,
      });
    }

    if (order.customer_email) {
      const emailKey = order.customer_email.trim().toLowerCase();
      const curr = orderStatsByEmail.get(emailKey) || { count: 0, spent: 0 };
      orderStatsByEmail.set(emailKey, {
        count: curr.count + 1,
        spent: isValidOrder ? curr.spent + total : curr.spent,
      });
    }
  }

  // Get current user to determine viewer's admin privileges
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const currentAdminRole: 'super_admin' | 'admin' | 'moderator' =
    currentUser?.id === '17267732-4774-45f6-8cfc-40ef0cdd602d' ||
    currentUser?.user_metadata?.is_super_admin === true ||
    currentUser?.email?.toLowerCase().trim() === 'm.h.ratul18@gmail.com'
      ? 'super_admin'
      : profiles.find((p: any) => p.id === currentUser?.id)?.role === 'admin'
      ? 'admin'
      : 'moderator';

  // Combine into unified CustomerRecord
  const customerRecords: CustomerRecord[] = profiles.map((p: any) => {
    const authInfo = authMap.get(p.id);
    const email = authInfo?.email || p.email || null;
    const avatarUrl = p.avatar_url || authInfo?.avatar_url || null;

    // Prioritize user_id match, fallback to email match
    let stats = orderStatsByUserId.get(p.id);
    if (!stats && email) {
      stats = orderStatsByEmail.get(email.toLowerCase());
    }

    const isSuper =
      p.id === '17267732-4774-45f6-8cfc-40ef0cdd602d' ||
      email?.toLowerCase().trim() === 'm.h.ratul18@gmail.com';

    const role: 'super_admin' | 'admin' | 'moderator' | 'customer' = isSuper
      ? 'super_admin'
      : p.role === 'admin'
      ? 'admin'
      : p.role === 'moderator'
      ? 'moderator'
      : 'customer';

    return {
      id: p.id,
      full_name: p.full_name || null,
      email,
      phone: p.phone || null,
      avatar_url: avatarUrl,
      role,
      points: Number(p.points) || 0,
      referral_code: p.referral_code || '—',
      created_at: p.created_at || new Date().toISOString(),
      orderCount: stats?.count || 0,
      totalSpent: stats?.spent || 0,
    };
  });

  return (
    <div>
      <AdminCustomersManager
        initialCustomers={customerRecords}
        currentAdminRole={currentAdminRole}
        currentAdminId={currentUser?.id}
      />
    </div>
  );
}

