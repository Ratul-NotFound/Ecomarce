import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TelegramService } from '@/lib/services/TelegramService';
import { checkRateLimit } from '@/lib/utils/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUserId = searchParams.get('userId');
    const rawSessionId = searchParams.get('sessionId');

    // Strict UUID format validation for userId since user_id is a PostgreSQL UUID column
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanUserId = rawUserId && UUID_REGEX.test(rawUserId.trim()) ? rawUserId.trim() : null;
    const cleanSessionId = rawSessionId ? rawSessionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) : null;

    if (!cleanUserId && !cleanSessionId) {
      return NextResponse.json({ messages: [] });
    }

    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    let query = dbClient
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(60);

    if (cleanUserId) {
      // If user is authenticated, find messages for this user_id
      query = query.or(`user_id.eq.${cleanUserId},user_name.ilike.%${cleanSessionId || cleanUserId}%`);
    } else if (cleanSessionId) {
      // If guest, find messages tagged with their session_id in user_name
      const shortId = cleanSessionId.length > 5 ? cleanSessionId.slice(-5) : cleanSessionId;
      query = query.or(`user_name.ilike.%${cleanSessionId}%,user_name.ilike.%${shortId}%`);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    return NextResponse.json({ messages: messages || [] });
  } catch (err: any) {
    console.error('Fetch customer chat messages error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit per IP to prevent spamming live chat & Telegram
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const rate = checkRateLimit(`chat_msg:${clientIp}`, 15, 60 * 1000); // 15 chat messages / min
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { message, user_name, user_id, session_id } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: 'Message cannot exceed 1000 characters' }, { status: 400 });
    }

    const cleanMessage = message.trim();
    const cleanSessionId = session_id ? String(session_id).replace(/[^a-zA-Z0-9_-]/g, '').slice(-5) : 'visitor';
    const cleanUserName = typeof user_name === 'string' ? user_name.slice(0, 100) : 'Visitor';
    const cleanUserId = typeof user_id === 'string' ? user_id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) : null;

    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    // Format display user_name with session identifier for guests
    const finalUserName = cleanUserId
      ? cleanUserName
      : `${cleanUserName} (#${cleanSessionId})`;

    // Insert customer message (direction: 'in')
    const { data: insertedMsg, error: insertErr } = await dbClient
      .from('chat_messages')
      .insert({
        user_id: cleanUserId || null,
        user_name: finalUserName,
        message: cleanMessage,
        direction: 'in',
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Forward to Telegram bot if configured
    try {
      const { data: settingsData } = await dbClient
        .from('store_settings')
        .select('key, value')
        .in('key', ['telegram_bot_token', 'telegram_chat_id', 'telegram_messages_topic_id']);

      const settingsMap: Record<string, any> = {};
      settingsData?.forEach((item: any) => {
        try {
          settingsMap[item.key] = typeof item.value === 'string' && (item.value.startsWith('"') || item.value.startsWith('{'))
            ? JSON.parse(item.value)
            : item.value;
        } catch {
          settingsMap[item.key] = item.value;
        }
      });

      const token = settingsMap.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = settingsMap.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
      const messagesTopicId = settingsMap.telegram_messages_topic_id ? parseInt(settingsMap.telegram_messages_topic_id, 10) : undefined;

      if (token && chatId) {
        const telegram = new TelegramService(token, chatId, undefined, messagesTopicId);
        const teleRes = await telegram.forwardUserMessage(finalUserName, cleanMessage, cleanUserId || undefined, cleanSessionId);
        if (teleRes?.message_id) {
          await dbClient
            .from('chat_messages')
            .update({ telegram_message_id: teleRes.message_id })
            .eq('id', insertedMsg.id);
          insertedMsg.telegram_message_id = teleRes.message_id;
        }
      }
    } catch (telegramErr) {
      console.warn('Telegram forwarding error:', telegramErr);
    }

    // Broadcast in real-time to active admin dashboard and storefront
    try {
      const channel = dbClient.channel('live_store_chat');
      await channel.send({
        type: 'broadcast',
        event: 'new_chat_message',
        payload: { message: insertedMsg },
      });
    } catch (bcErr) {
      console.warn('Realtime broadcast error:', bcErr);
    }

    return NextResponse.json({ success: true, message: insertedMsg });
  } catch (err: any) {
    console.error('Send customer chat message error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send message' }, { status: 500 });
  }
}
