import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TelegramService } from '@/lib/services/TelegramService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

    if (!userId && !sessionId) {
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

    if (userId) {
      // If user is authenticated, find messages for this user_id
      query = query.or(`user_id.eq.${userId},user_name.ilike.%${sessionId || userId}%`);
    } else if (sessionId) {
      // If guest, find messages tagged with their session_id in user_name (both incoming and replies)
      const shortId = sessionId.length > 5 ? sessionId.slice(-5) : sessionId;
      query = query.or(`user_name.ilike.%${sessionId}%,user_name.ilike.%${shortId}%`);
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
    const { message, user_name, user_id, session_id } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    // Format display user_name with session identifier for guests
    const cleanSessionId = session_id ? String(session_id).slice(-5) : 'visitor';
    const finalUserName = user_id
      ? (user_name || 'Customer')
      : `${user_name || 'Visitor'} (#${cleanSessionId})`;

    // Insert customer message (direction: 'in')
    const { data: insertedMsg, error: insertErr } = await dbClient
      .from('chat_messages')
      .insert({
        user_id: user_id || null,
        user_name: finalUserName,
        message: message.trim(),
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
        const teleRes = await telegram.forwardUserMessage(finalUserName, message.trim(), user_id || undefined, cleanSessionId);
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
