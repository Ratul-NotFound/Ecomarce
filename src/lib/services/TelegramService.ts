export class TelegramService {
  private botToken: string;
  private chatId: string;
  private ordersTopicId?: number;
  private messagesTopicId?: number;

  constructor(
    botToken?: string,
    chatId?: string,
    ordersTopicId?: number,
    messagesTopicId?: number
  ) {
    const sanitize = (val?: any) => {
      if (!val) return '';
      let str = String(val).trim();
      if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
        str = str.slice(1, -1).trim();
      }
      return str;
    };

    const parseTopic = (val?: any) => {
      const sanitized = sanitize(val);
      const parsed = parseInt(sanitized, 10);
      return isNaN(parsed) ? undefined : parsed;
    };

    this.botToken = sanitize(botToken || process.env.TELEGRAM_BOT_TOKEN);
    this.chatId = sanitize(chatId || process.env.TELEGRAM_CHAT_ID);
    this.ordersTopicId = parseTopic(ordersTopicId ?? process.env.TELEGRAM_ORDERS_TOPIC_ID);
    this.messagesTopicId = parseTopic(messagesTopicId ?? process.env.TELEGRAM_MESSAGES_TOPIC_ID);
  }

  async sendMessage(text: string, customChatId?: string, threadId?: number): Promise<boolean> {
    let targetChatId = (customChatId || this.chatId).trim();
    let targetThreadId = threadId;

    // Support chatId/threadId format like -1003795016891/4 or -3795016891/2
    if (targetChatId && targetChatId.includes('/')) {
      const parts = targetChatId.split('/');
      targetChatId = parts[0].trim();
      targetThreadId = parseInt(parts[1], 10) || undefined;
    }

    // Auto-normalize supergroup IDs: if starts with '-' but not '-100', add '-100'
    if (targetChatId.startsWith('-') && !targetChatId.startsWith('-100') && targetChatId.length > 5) {
      targetChatId = `-100${targetChatId.substring(1)}`;
    }

    if (!this.botToken || !targetChatId) {
      console.warn('Telegram bot token or chat ID is missing. Skipping notification.');
      return false;
    }

    try {
      const payload: any = {
        chat_id: targetChatId,
        text,
        parse_mode: 'HTML',
      };
      if (targetThreadId) {
        payload.message_thread_id = targetThreadId;
      }

      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      return resData.ok;
    } catch (error) {
      console.error('Failed to send telegram message:', error);
      return false;
    }
  }

  async notifyNewOrder(order: {
    order_number: string;
    total: number;
    payment_method: string;
    customer_name: string;
    district: string;
  }): Promise<void> {
    const message = `🛍️ <b>NEW ORDER RECEIVED!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>Order ID:</b> <code>${order.order_number}</code>\n` +
      `👤 <b>Customer:</b> ${order.customer_name}\n` +
      `📍 <b>Location:</b> ${order.district}\n` +
      `💳 <b>Payment:</b> ${order.payment_method.toUpperCase()}\n` +
      `💰 <b>Total Amount:</b> ৳${order.total}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ <i>Check Admin Dashboard for fulfillment</i>`;

    await this.sendMessage(message, undefined, this.ordersTopicId);
  }

  async notifyPaymentSubmitted(order: {
    order_number: string;
    total: number;
    transaction_id: string;
    method: string;
  }): Promise<void> {
    const message = `💳 <b>PAYMENT SUBMITTED!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>Order ID:</b> <code>${order.order_number}</code>\n` +
      `💰 <b>Amount:</b> ৳${order.total}\n` +
      `📱 <b>Method:</b> ${order.method.toUpperCase()}\n` +
      `🔢 <b>TrxID:</b> <code>${order.transaction_id}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ <i>Please verify transaction in Admin panel</i>`;

    await this.sendMessage(message, undefined, this.ordersTopicId);
  }

  async forwardUserMessage(userName: string, userMessage: string, userId?: string): Promise<void> {
    const message = `💬 <b>CUSTOMER CHAT MESSAGE</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>From:</b> ${userName || 'Guest'}\n` +
      (userId ? `🆔 <b>User ID:</b> <code>${userId}</code>\n` : '') +
      `✉️ <b>Message:</b>\n${userMessage}`;

    await this.sendMessage(message, undefined, this.messagesTopicId);
  }
}
