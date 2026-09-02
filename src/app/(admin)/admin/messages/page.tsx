'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Search,
  CheckCircle2,
  Clock,
  Shield,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/format';

interface ChatMessage {
  id: string;
  user_id: string | null;
  user_name: string | null;
  message: string;
  direction: 'in' | 'out';
  telegram_message_id: number | null;
  created_at: string;
}

interface Conversation {
  userId: string;
  userName: string;
  lastMessage: ChatMessage;
  messages: ChatMessage[];
  unreadCount: number;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin/messages');
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to Supabase Realtime updates
    const supabase = createClient();
    const channel = supabase
      .channel('admin_chat_sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload: any) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Group messages by customer (user_id or user_name)
  const conversations: Conversation[] = React.useMemo(() => {
    const groups: { [key: string]: ChatMessage[] } = {};

    messages.forEach(msg => {
      const key = msg.user_id || msg.user_name || 'Guest';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(msg);
    });

    return Object.entries(groups).map(([key, msgs]) => {
      const latest = msgs[msgs.length - 1];
      const customerMsg = msgs.find(m => m.direction === 'in');
      const name = customerMsg?.user_name || (key.startsWith('Guest') ? 'Guest Customer' : key);

      return {
        userId: key,
        userName: name,
        lastMessage: latest,
        messages: msgs,
        unreadCount: msgs.filter(m => m.direction === 'in').length,
      };
    }).sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
  }, [messages]);

  // Set default active conversation if none selected
  useEffect(() => {
    if (!activeUserId && conversations.length > 0) {
      setActiveUserId(conversations[0].userId);
    }
  }, [conversations, activeUserId]);

  // Auto-scroll to bottom of active conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeUserId]);

  const activeConversation = conversations.find(c => c.userId === activeUserId);

  const filteredConversations = conversations.filter(c =>
    c.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConversation || isSending) return;

    try {
      setIsSending(true);
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_user_id: activeConversation.userId.startsWith('Guest') ? null : activeConversation.userId,
          customer_name: activeConversation.userName,
          message: replyText.trim(),
        }),
      });

      if (res.ok) {
        setReplyText('');
      }
    } catch (err) {
      console.error('Failed to send admin reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div suppressHydrationWarning style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={24} color="var(--color-primary-light)" />
            Live Customer Support Chat
          </h1>
          <p className="admin-page-desc">
            Reply to customers in real time directly from this dashboard or from Telegram.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMessages}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Main Split Chat Layout */}
      <div
        className="admin-card"
        style={{
          flex: 1,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          overflow: 'hidden',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-admin-border)',
        }}
      >
        {/* Left: Customer Thread List */}
        <div
          style={{
            borderRight: '1px solid var(--color-admin-border)',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(15, 23, 42, 0.4)',
          }}
        >
          {/* Search Box */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--color-admin-border)' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                color="var(--color-admin-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search conversations..."
                className="admin-input"
                style={{ paddingLeft: '36px', fontSize: '13px' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-admin-muted)' }}>
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-admin-muted)' }}>
                No active conversations yet.
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = conv.userId === activeUserId;
                const isCustomerLast = conv.lastMessage.direction === 'in';

                return (
                  <div
                    key={conv.userId}
                    onClick={() => setActiveUserId(conv.userId)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--color-primary-light)' : '3px solid transparent',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '9999px',
                            background: 'var(--color-primary-10)',
                            color: 'var(--color-primary-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {conv.userName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? '#ffffff' : 'var(--color-admin-text)' }}>
                          {conv.userName}
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--color-admin-muted)' }}>
                        {new Date(conv.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '12px',
                        color: isCustomerLast ? '#e2e8f0' : 'var(--color-admin-muted)',
                        fontWeight: isCustomerLast ? 500 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        margin: 0,
                      }}
                    >
                      {conv.lastMessage.direction === 'out' ? '🛡️ You: ' : ''}
                      {conv.lastMessage.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat Conversation */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-admin-surface)' }}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--color-admin-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '9999px',
                      background: 'var(--color-primary-10)',
                      color: 'var(--color-primary-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                    }}
                  >
                    {activeConversation.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-admin-text)' }}>
                      {activeConversation.userName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '9999px', background: '#22c55e' }}></span>
                      Live Customer Session
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                    Telegram Synced ⚡
                  </span>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeConversation.messages.map((msg, index) => {
                  const isAgent = msg.direction === 'out';
                  return (
                    <div
                      key={msg.id || index}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAgent ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                        alignSelf: isAgent ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-admin-muted)',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isAgent ? (
                          <>
                            <Shield size={10} color="var(--color-primary-light)" />
                            <span>{msg.user_name || 'Admin Support'}</span>
                          </>
                        ) : (
                          <>
                            <User size={10} />
                            <span>{msg.user_name || 'Customer'}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: isAgent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isAgent ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--color-admin-text)',
                          fontSize: '13px',
                          lineHeight: 1.5,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          wordBreak: 'break-word',
                        }}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input Bar */}
              <form
                onSubmit={handleSendReply}
                style={{
                  padding: '16px 20px',
                  borderTop: '1px solid var(--color-admin-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(15, 23, 42, 0.3)',
                }}
              >
                <input
                  type="text"
                  placeholder={`Reply to ${activeConversation.userName}...`}
                  className="admin-input"
                  style={{ flex: 1, padding: '12px 16px' }}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 20px' }}
                >
                  <Send size={16} />
                  <span>{isSending ? 'Sending...' : 'Send'}</span>
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-admin-muted)' }}>
              <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p>Select a customer conversation from the list to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
