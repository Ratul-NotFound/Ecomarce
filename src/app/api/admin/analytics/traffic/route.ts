import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    // Role check
    if (user) {
      const { data: profile } = await dbClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const granularity = searchParams.get('granularity') || 'daily'; // 'hourly' | 'daily' | 'weekly' | 'monthly'

    const now = new Date();
    let startDate: Date;

    if (granularity === 'hourly') {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    } else if (granularity === 'weekly') {
      startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // 12 weeks ago
    } else if (granularity === 'monthly') {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 12 months ago
    } else {
      // Daily (last 30 days)
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch analytics events from Supabase
    const { data: events, error } = await dbClient
      .from('analytics_events')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    const eventList = events || [];

    // ────────────────────────────────────────────────────────────
    // 1. Time-Series Bucketing (Hourly, Daily, Weekly, Monthly)
    // ────────────────────────────────────────────────────────────
    const bucketsMap: Record<string, { label: string; visits: number; uniqueIps: Set<string> }> = {};

    if (granularity === 'hourly') {
      // Create 24 hourly buckets: current hour - 23 to current hour
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
        const hourNumber = d.getHours();
        const ampm = hourNumber >= 12 ? 'PM' : 'AM';
        const displayHour = hourNumber % 12 === 0 ? 12 : hourNumber % 12;
        const label = `${displayHour} ${ampm}`;

        bucketsMap[hourKey] = { label, visits: 0, uniqueIps: new Set() };
      }

      eventList.forEach(e => {
        const d = new Date(e.created_at);
        const hourKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
        if (bucketsMap[hourKey]) {
          bucketsMap[hourKey].visits++;
          const ip = e.session_id ? e.session_id.split('::')[0] : '127.0.0.1';
          bucketsMap[hourKey].uniqueIps.add(ip);
        }
      });
    } else if (granularity === 'daily') {
      // 30 days buckets
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        bucketsMap[dayKey] = { label, visits: 0, uniqueIps: new Set() };
      }

      eventList.forEach(e => {
        const d = new Date(e.created_at);
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (bucketsMap[dayKey]) {
          bucketsMap[dayKey].visits++;
          const ip = e.session_id ? e.session_id.split('::')[0] : '127.0.0.1';
          bucketsMap[dayKey].uniqueIps.add(ip);
        }
      });
    } else if (granularity === 'weekly') {
      // 12 weeks buckets
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        // Start of week date
        const weekKey = `W-${d.getFullYear()}-${Math.floor(d.getDate() / 7) + 1}-${d.getMonth() + 1}`;
        const label = `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        bucketsMap[weekKey] = { label, visits: 0, uniqueIps: new Set() };
      }

      eventList.forEach(e => {
        const d = new Date(e.created_at);
        const weekKey = `W-${d.getFullYear()}-${Math.floor(d.getDate() / 7) + 1}-${d.getMonth() + 1}`;
        if (bucketsMap[weekKey]) {
          bucketsMap[weekKey].visits++;
          const ip = e.session_id ? e.session_id.split('::')[0] : '127.0.0.1';
          bucketsMap[weekKey].uniqueIps.add(ip);
        }
      });
    } else {
      // Monthly (12 months)
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        bucketsMap[monthKey] = { label, visits: 0, uniqueIps: new Set() };
      }

      eventList.forEach(e => {
        const d = new Date(e.created_at);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (bucketsMap[monthKey]) {
          bucketsMap[monthKey].visits++;
          const ip = e.session_id ? e.session_id.split('::')[0] : '127.0.0.1';
          bucketsMap[monthKey].uniqueIps.add(ip);
        }
      });
    }

    const chartData = Object.values(bucketsMap).map(b => ({
      label: b.label,
      visits: b.visits,
      uniqueVisitors: b.uniqueIps.size,
    }));

    // ────────────────────────────────────────────────────────────
    // 2. High-Level Summary KPIs
    // ────────────────────────────────────────────────────────────
    const totalVisits = eventList.length;
    const allUniqueIps = new Set(
      eventList.map(e => (e.session_id ? e.session_id.split('::')[0] : '127.0.0.1'))
    );
    const totalUniqueVisitors = allUniqueIps.size;
    const avgViewsPerVisitor =
      totalUniqueVisitors > 0 ? (totalVisits / totalUniqueVisitors).toFixed(1) : '0.0';

    // Find peak traffic period
    let peakPeriod = { label: 'None', visits: 0 };
    chartData.forEach(d => {
      if (d.visits > peakPeriod.visits) {
        peakPeriod = { label: d.label, visits: d.visits };
      }
    });

    // ────────────────────────────────────────────────────────────
    // 3. Device & Platform Distribution
    // ────────────────────────────────────────────────────────────
    const deviceCounts: Record<string, number> = { Mobile: 0, Desktop: 0, Tablet: 0 };
    const browserCounts: Record<string, number> = {};

    eventList.forEach(e => {
      const raw = e.device_type || 'Desktop (Chrome)';
      if (raw.toLowerCase().includes('mobile')) deviceCounts.Mobile++;
      else if (raw.toLowerCase().includes('tablet')) deviceCounts.Tablet++;
      else deviceCounts.Desktop++;

      const bMatch = raw.match(/\(([^)]+)\)/);
      const bName = bMatch ? bMatch[1] : 'Chrome';
      browserCounts[bName] = (browserCounts[bName] || 0) + 1;
    });

    const totalDevices = Math.max(totalVisits, 1);
    const deviceBreakdown = [
      { name: 'Mobile Devices', count: deviceCounts.Mobile, percent: Math.round((deviceCounts.Mobile / totalDevices) * 100) },
      { name: 'Desktop / PC', count: deviceCounts.Desktop, percent: Math.round((deviceCounts.Desktop / totalDevices) * 100) },
      { name: 'Tablets', count: deviceCounts.Tablet, percent: Math.round((deviceCounts.Tablet / totalDevices) * 100) },
    ];

    const browserBreakdown = Object.entries(browserCounts)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / totalDevices) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ────────────────────────────────────────────────────────────
    // 4. Top Visited Pages
    // ────────────────────────────────────────────────────────────
    const pageCounts: Record<string, number> = {};
    eventList.forEach(e => {
      const path = (e.page_url || '/').split('?')[0];
      pageCounts[path] = (pageCounts[path] || 0) + 1;
    });

    const topPages = Object.entries(pageCounts)
      .map(([path, count]) => ({
        path,
        count,
        percent: Math.round((count / Math.max(totalVisits, 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ────────────────────────────────────────────────────────────
    // 5. Recent Live Visitors Stream (Last 20 records)
    // ────────────────────────────────────────────────────────────
    const recentVisitors = [...eventList]
      .reverse()
      .slice(0, 20)
      .map(e => {
        const rawIp = e.session_id ? e.session_id.split('::')[0] : '127.0.0.1';
        // Mask last octet for privacy: e.g. 103.205.71.***
        const ipParts = rawIp.split('.');
        const maskedIp =
          ipParts.length === 4
            ? `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.***`
            : rawIp.slice(0, 8) + '***';

        return {
          id: e.id,
          ip: maskedIp,
          country: e.country || 'Bangladesh',
          device: e.device_type || 'Desktop',
          pageUrl: e.page_url || '/',
          createdAt: e.created_at,
        };
      });

    return NextResponse.json({
      granularity,
      summary: {
        totalVisits,
        totalUniqueVisitors,
        avgViewsPerVisitor,
        peakPeriod,
      },
      chartData,
      deviceBreakdown,
      browserBreakdown,
      topPages,
      recentVisitors,
    });
  } catch (err: any) {
    console.error('Fetch traffic analytics error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch traffic metrics' }, { status: 500 });
  }
}
