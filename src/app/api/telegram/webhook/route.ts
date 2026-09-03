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
      const msgText = update.message.text.trim();
      const telegramMsgId = update.message.message_id;

      const supabase = await createClient();
      let dbClient = supabase;
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        dbClient = createAdminClient();
      }

      let targetUserId: string | null = null;
      let targetCustomerName: string | null = null;
      let cleanMessage = msgText;

      // ────────────────────────────────────────────────────────────
      // 1. Direct Telegram reply lookup via telegram_message_id
      // ────────────────────────────────────────────────────────────
      const replyToMsg = update.message.reply_to_message;
      if (replyToMsg?.message_id) {
        const { data: directMatch } = await dbClient
          .from('chat_messages')
          .select('user_id, user_name, direction')
          .eq('telegram_message_id', replyToMsg.message_id)
          .maybeSingle();

        if (directMatch) {
          if (directMatch.user_id) {
            targetUserId = directMatch.user_id;
          } else {
            // Guest customer
            const tagMatch = directMatch.user_name?.match(/#([a-zA-Z0-9_\-]+)/);
            if (tagMatch) {
              targetCustomerName = `Visitor (#${tagMatch[1]})`;
            } else {
              targetCustomerName = directMatch.user_name || 'Guest';
            }
          }
        }
      }

      // ────────────────────────────────────────────────────────────
      // 2. Structured Metadata Tag Extraction from Replied Text
      // ────────────────────────────────────────────────────────────
      const replyToText = replyToMsg?.text;
      if (!targetUserId && !targetCustomerName && replyToText) {
        // Match [USER:uuid]
        const userTagMatch = replyToText.match(/\[USER:([a-f0-9\-]+)\]/i);
        if (userTagMatch) targetUserId = userTagMatch[1];

        // Match [GUEST:sessionId]
        const guestTagMatch = replyToText.match(/\[GUEST:([^\]]+)\]/i);
        if (guestTagMatch) targetCustomerName = `Visitor (#${guestTagMatch[1].slice(-5)})`;

        // Legacy fallbacks: User ID & From
        if (!targetUserId && replyToText.includes('User ID:')) {
          const match = replyToText.match(/User ID:\s*([a-f0-9\-]+)/i);
          if (match) targetUserId = match[1];
        }
        if (!targetCustomerName && replyToText.includes('Customer:')) {
          const cMatch = replyToText.match(/Customer:\s*([^\n\r]+)/i);
          if (cMatch) targetCustomerName = cMatch[1].trim();
        }
        if (!targetCustomerName && replyToText.includes('From:')) {
          const fromMatch = replyToText.match(/From:\s*([^\n\r]+)/i);
          if (fromMatch) targetCustomerName = fromMatch[1].trim();
        }
      }

      // ────────────────────────────────────────────────────────────
      // 3. Command Syntax Support (e.g. /reply #2c3d Hello, or /to #2c3d)
      // ────────────────────────────────────────────────────────────
      const cmdMatch = msgText.match(/^\/(?:reply|to)\s+([#a-zA-Z0-9_\-]+)\s+([\s\S]+)$/i);
      if (cmdMatch) {
        const ref = cmdMatch[1].trim();
        cleanMessage = cmdMatch[2].trim();
        if (ref.length > 30 && ref.includes('-')) {
          targetUserId = ref;
        } else {
          const cleanRef = ref.startsWith('#') ? ref : `#${ref}`;
          targetCustomerName = `Visitor (${cleanRef})`;
        }
      }

      // If a valid recipient customer was resolved
      if (targetUserId || targetCustomerName) {
        const agentName = targetUserId
          ? 'Support Agent'
          : `Support Agent [to:${targetCustomerName || 'Guest'}]`;

        const { data: insertedReply } = await dbClient
          .from('chat_messages')
          .insert({
            user_id: targetUserId,
            user_name: agentName,
            message: cleanMessage,
            direction: 'out',
            telegram_message_id: telegramMsgId,
          })
          .select()
          .single();

        // Broadcast real-time event to Admin Panel and Storefront Live Chat
        if (insertedReply) {
          try {
            const channel = dbClient.channel('live_store_chat');
            await channel.send({
              type: 'broadcast',
              event: 'new_chat_message',
              payload: { message: insertedReply },
            });
          } catch (bcErr) {
            console.warn('Realtime broadcast error from telegram webhook:', bcErr);
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook processing error:', err);
    return NextResponse.json({ ok: true }); // Always respond 200 to Telegram
  }
}
