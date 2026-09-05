'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, X, Bot, ShieldCheck, User } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/store-config';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import type { ChatMessage } from '@/types';

const QUICK_PROMPTS = [
  '📦 Track my order',
  '🚚 Delivery charge & time',
  '💳 Payment assistance',
  '🔥 Current discounts & offers',
];

export default function TelegramChatWidget() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [storeName, setStoreName] = useState(STORE_CONFIG.name);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(res => {
        if (res.settings?.store_name) setStoreName(res.settings.store_name);
      })
      .catch(() => {});
  }, []);

  // Initialize or retrieve guest session ID from localStorage
  useEffect(() => {
    let sid = localStorage.getItem('shop_chat_session_id');
    if (!sid) {
      sid = 'guest_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('shop_chat_session_id', sid);
    }
    setSessionId(sid);
  }, []);

  // Fetch real conversation history on mount or when session/user is ready
  const loadChatHistory = useCallback(async () => {
    if (!sessionId && !user?.id) return;

    try {
      const params = new URLSearchParams();
      if (user?.id) params.set('userId', user.id);
      if (sessionId) params.set('sessionId', sessionId);

      const res = await fetch(`/api/chat/messages?${params.toString()}`);
      const data = await res.json();

      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      } else {
        // Welcoming initial assistant greeting
        setMessages([
          {
            id: 'welcome-1',
            user_id: null,
            user_name: 'Customer Support',
            message: `Hello! 👋 Welcome to ${storeName}. How can we assist you with your shopping today?`,
            direction: 'out',
            telegram_message_id: null,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }, [sessionId, user?.id]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // Realtime subscription to incoming support replies via Broadcast and Postgres changes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('live_store_chat', { config: { broadcast: { self: false } } });

    const handleIncoming = (newMsg: ChatMessage) => {
      if (!newMsg) return;
      const isTargetedToMe =
        newMsg.direction === 'out' &&
        ((user?.id && newMsg.user_id === user.id) ||
          (sessionId && (
            newMsg.user_name?.includes(sessionId) ||
            newMsg.user_name?.includes(sessionId.slice(-5))
          )));

      if (isTargetedToMe) {
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        if (!isOpen) {
          setUnreadCount(prev => prev + 1);
        } else {
          scrollToBottom();
        }
      }
    };

    channel
      .on('broadcast', { event: 'new_chat_message' }, payload => {
        if (payload?.payload?.message) {
          handleIncoming(payload.payload.message);
        }
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        payload => {
          handleIncoming(payload.new as ChatMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user?.id, sessionId]);

  // Silent adaptive background sync when chat widget is open (no manual refresh needed)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      loadChatHistory();
    }, 3500);
    return () => clearInterval(interval);
  }, [isOpen, loadChatHistory]);

  // Scroll to bottom when opening or messages change
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;

    const currentText = text.trim();
    const displayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Visitor');

    const tempMsg: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: user?.id || null,
      user_name: displayName,
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
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentText,
          user_name: displayName,
          user_id: user?.id || null,
          session_id: sessionId,
        }),
      });

      const data = await res.json();
      if (data.message && data.message.id) {
        // Update temp message with real DB message
        setMessages(prev =>
          prev.map(m => (m.id === tempMsg.id ? (data.message as ChatMessage) : m))
        );
      }
    } catch (err) {
      console.error('Failed to dispatch message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputVal);
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
        {!isOpen && unreadCount > 0 && (
          <span className="chat-unread-badge">{unreadCount}</span>
        )}
      </button>

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="chat-modal-window fade-in" id="chat-modal-window">
          {/* Header */}
          <div className="chat-modal-header" style={{ background: 'var(--color-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={18} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', lineHeight: 1.2 }}>Customer Care</div>
                <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.95 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  <span>Support Team • Online</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="Close Chat"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Body */}
          <div className="chat-messages-body">
            {messages.map(msg => {
              const isCustomer = msg.direction === 'in';
              const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={msg.id}
                  className={`chat-message chat-message--${msg.direction}`}
                >
                  <div className="chat-message__bubble">
                    {msg.message}
                  </div>
                  <div className="chat-message__meta">
                    {isCustomer ? 'You' : msg.user_name || 'Support'} • {time}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="chat-quick-chips">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="chat-quick-chip"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form onSubmit={handleFormSubmit} className="chat-input-footer">
            <input
              type="text"
              placeholder="Ask anything or request an item..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              className="form-input"
              style={{ height: '38px', borderRadius: 'var(--radius-full)', fontSize: '13px' }}
              id="chat-input-field"
            />
            <button
              type="submit"
              disabled={isSending || !inputVal.trim()}
              className="btn btn-primary"
              style={{ width: '38px', height: '38px', padding: 0, borderRadius: 'var(--radius-full)', flexShrink: 0 }}
              id="chat-send-btn"
              title="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
