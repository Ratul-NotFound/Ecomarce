import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin-guard';
import { TelegramService } from '@/lib/services/TelegramService';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    // Fetch all chat messages ordered by created_at ascending
    const { data: messages, error } = await dbClient
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ messages: messages || [] });
  } catch (err: any) {
    console.error('Fetch admin messages error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const { user, dbClient } = auth;

    // Fetch admin profile name for reply attribution
    const { data: profile } = await dbClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const { target_user_id, message, customer_name } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: 'Message cannot exceed 1000 characters' }, { status: 400 });
    }

    // Insert response as direction 'out'
    const senderName = target_user_id
      ? (profile?.full_name || 'Admin Support')
      : `${profile?.full_name || 'Admin Support'} [to:${customer_name || 'Guest'}]`;

    const { data: newMessage, error } = await dbClient
      .from('chat_messages')
      .insert({
        user_id: target_user_id || null,
        user_name: senderName,
        message: message.trim(),
        direction: 'out',
      })
      .select()
      .single();

    if (error) throw error;

    // Send Web Push notification to customer device if registered
    if (target_user_id) {
      try {
        const { sendPushToUser } = await import('@/lib/push-notifications');
        const preview = message.trim().length > 80 ? message.trim().slice(0, 77) + '…' : message.trim();
        await sendPushToUser(target_user_id, {
          title:   '💬 New Reply from Support',
          body:    preview,
          url:     '/?chat=open',
          tag:     'chat-reply',
          vibrate: [150, 75, 150],
          actions: [{ action: 'reply', title: '💬 View Message' }],
        });
      } catch (pushErr) {
        console.warn('[push] Admin chat reply push failed (non-fatal):', pushErr);
      }
    }

    // Also notify Telegram so other moderators see the reply
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
        await telegram.sendMessage(
          `🛡️ <b>ADMIN REPLIED TO ${customer_name || 'Customer'}:</b>\n<i>${message.trim()}</i>`
        );
      }
    } catch {}

    // Broadcast in real-time to active admin dashboard and storefront
    try {
      const channel = dbClient.channel('live_store_chat');
      await channel.send({
        type: 'broadcast',
        event: 'new_chat_message',
        payload: { message: newMessage },
      });
    } catch (bcErr) {
      console.warn('Realtime broadcast error:', bcErr);
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (err: any) {
    console.error('Send admin reply error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send reply' }, { status: 500 });
  }
}
