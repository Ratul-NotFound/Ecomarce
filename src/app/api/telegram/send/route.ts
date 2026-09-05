import { NextRequest, NextResponse } from 'next/server';
import { TelegramService } from '@/lib/services/TelegramService';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/utils/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting by client IP
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const rate = checkRateLimit(`tele_send:${clientIp}`, 6, 60 * 1000); // 6 messages per minute
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many messages sent. Please wait a minute before sending another message.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { message, user_name, user_id } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: 'Message is too long (maximum 1000 characters)' }, { status: 400 });
    }

    const cleanMessage = message.trim();
    const cleanUserName = typeof user_name === 'string' ? user_name.slice(0, 100) : 'Visitor';
    const cleanUserId = typeof user_id === 'string' ? user_id.slice(0, 100) : null;

    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    // Save message to chat_messages table
    const { data: insertedMsg } = await dbClient
      .from('chat_messages')
      .insert({
        user_id: cleanUserId || null,
        user_name: cleanUserName,
        message: cleanMessage,
        direction: 'in',
      })
      .select()
      .single();

    // Forward to Telegram bot
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
        const teleRes = await telegram.forwardUserMessage(cleanUserName, cleanMessage, cleanUserId || undefined);
        if (teleRes?.message_id && insertedMsg?.id) {
          await dbClient
            .from('chat_messages')
            .update({ telegram_message_id: teleRes.message_id })
            .eq('id', insertedMsg.id);
        }
      }
    } catch (telegramErr) {
      console.warn('Telegram forward notice:', telegramErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error forwarding telegram message:', err);
    return NextResponse.json({ error: err.message || 'Failed to dispatch' }, { status: 500 });
  }
}
