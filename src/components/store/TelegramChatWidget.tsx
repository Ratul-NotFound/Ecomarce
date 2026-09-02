'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/store-config';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import type { ChatMessage } from '@/types';

export default function TelegramChatWidget() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      // Initial welcome message
      if (messages.length === 0) {
        setMessages([
          {
            id: 'welcome-1',
            user_id: null,
            user_name: 'Support Agent',
            message: `Hello! 👋 How can we help you today with your shopping at ${STORE_CONFIG.name}?`,
            direction: 'out',
            telegram_message_id: null,
            created_at: new Date().toISOString(),
          },
        ]);
      }
      scrollToBottom();
    }
  }, [isOpen, messages.length]);

  // Realtime subscription to new chat_messages from Supabase
  useEffect(() => {
    if (!isOpen) return;

    const supabase = createClient();
    const channel = supabase
      .channel('public:chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        payload => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.direction === 'out' && (!newMsg.user_id || newMsg.user_id === user?.id)) {
            setMessages(prev => [...prev, newMsg]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isSending) return;

    const currentText = inputVal.trim();
    const tempMsg: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: user?.id || null,
      user_name: profile?.full_name || 'Visitor',
      message: currentText,
      direction: 'in',
      telegram_message_id: null,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMsg]);
    setInputVal('');
    setIsSending(true);
    scrollToBottom();

    try {
      await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentText,
          user_name: profile?.full_name || 'Visitor',
          user_id: user?.id,
        }),
      });
    } catch (err) {
      console.error('Failed to dispatch message to Telegram:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="telegram-chat-btn"
        aria-label="Live Chat Support"
        id="telegram-chat-btn"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={26} />}
      </button>

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="chat-modal-window fade-in" id="chat-modal-window">
          {/* Header */}
          <div className="chat-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={20} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Customer Care</div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>Telegram Live Assistant</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Body */}
          <div className="chat-messages-body">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`chat-message chat-message--${msg.direction}`}
              >
                <div style={{ fontWeight: 700, fontSize: '11px', marginBottom: '2px', opacity: 0.8 }}>
                  {msg.direction === 'in' ? 'You' : msg.user_name || 'Support'}
                </div>
                <div>{msg.message}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSendMessage} className="chat-input-footer">
            <input
              type="text"
              placeholder="Ask anything or request an item..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              className="form-input"
              style={{ height: '38px', borderRadius: 'var(--radius-full)' }}
              id="chat-input-field"
            />
            <button
              type="submit"
              disabled={isSending || !inputVal.trim()}
              className="btn btn-primary"
              style={{ width: '38px', height: '38px', padding: 0, borderRadius: 'var(--radius-full)' }}
              id="chat-send-btn"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
