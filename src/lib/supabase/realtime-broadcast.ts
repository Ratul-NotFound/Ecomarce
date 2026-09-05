// src/lib/supabase/realtime-broadcast.ts
// Reliable server-side broadcast helper for Supabase Realtime
// Uses Supabase REST Broadcast endpoint to bypass serverless WebSocket handshake lifecycle limitations.

export async function broadcastRealtimeEvent(
  topic: string,
  event: string,
  payload: Record<string, any>
): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.warn('[realtime-broadcast] Missing Supabase URL or key, skipping broadcast');
      return false;
    }

    const formattedTopic = topic.startsWith('realtime:') ? topic : `realtime:${topic}`;

    const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: formattedTopic,
            event,
            payload,
          },
        ],
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn('[realtime-broadcast] Broadcast failed (non-fatal):', err);
    return false;
  }
}
