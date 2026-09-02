import { NextRequest, NextResponse } from 'next/server';
import { TelegramService } from '@/lib/services/TelegramService';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { message, user_name, user_id } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    // Save message to chat_messages table
    await dbClient.from('chat_messages').insert({
      user_id: user_id || null,
      user_name: user_name || 'Visitor',
      message: message.trim(),
      direction: 'in',
    });

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
        await telegram.forwardUserMessage(user_name || 'Visitor', message.trim(), user_id);
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
