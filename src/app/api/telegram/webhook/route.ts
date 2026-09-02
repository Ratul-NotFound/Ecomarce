import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    // Validate secret token if configured
    const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret && secretHeader && secretHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized secret token' }, { status: 401 });
    }

    const update = await request.json();

    // Handle Telegram message reply
    if (update?.message?.text) {
      const msgText = update.message.text;
      const telegramMsgId = update.message.message_id;

      // Extract user ID if this is a reply to an existing forwarded message
      let targetUserId: string | null = null;
      const replyToText = update.message.reply_to_message?.text;
      if (replyToText && replyToText.includes('User ID:')) {
        const match = replyToText.match(/User ID:\s*([a-f0-9\-]+)/i);
        if (match) targetUserId = match[1];
      }

      const supabase = await createClient();
      let dbClient = supabase;
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        dbClient = createAdminClient();
      }

      await dbClient.from('chat_messages').insert({
        user_id: targetUserId,
        user_name: 'Support Agent',
        message: msgText,
        direction: 'out',
        telegram_message_id: telegramMsgId,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook processing error:', err);
    return NextResponse.json({ ok: true }); // Always respond 200 to Telegram
  }
}
