'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
  isGuest: boolean;
  userName: string;
  lastMessage: ChatMessage;
  messages: ChatMessage[];
  unreadCount: number;
}

const CANNED_REPLIES = [
  'Hello! 👋 How can I assist you with your order today?',
  'Your order has been confirmed and dispatched with the courier! 🚚',
  'We have verified your payment. Thank you! ✅',
  'Could you please provide your order ID or phone number?',
  'Thank you for reaching out! Have a great day ahead. ✨',
];

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
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
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as ChatMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Group messages into distinct customer conversations
  const conversations: Conversation[] = useMemo(() => {
    const groups: { [key: string]: ChatMessage[] } = {};

    // Helper to determine which conversation a message belongs to
    const getConvKey = (msg: ChatMessage): string => {
      if (msg.user_id) return msg.user_id;

      // If guest customer message: e.g. "Visitor (#abc12)"
      const tagMatch = msg.user_name?.match(/#([a-zA-Z0-9_\-]+)/);
      if (tagMatch) return 'guest_' + tagMatch[1];

      // If outgoing reply to guest: e.g. "Admin Support [to:Visitor (#abc12)]"
      const toMatch = msg.user_name?.match(/\[to:([^\]]+)\]/);
      if (toMatch) {
        const toTag = toMatch[1].match(/#([a-zA-Z0-9_\-]+)/);
        if (toTag) return 'guest_' + toTag[1];
        return 'guest_' + toMatch[1].trim();
      }

      if (msg.direction === 'in') {
        return 'guest_' + (msg.user_name || 'unknown');
      }

      // Ignore untargeted broadcasts that don't belong to any customer thread
      return 'unassigned';
    };

    messages.forEach(msg => {
      const key = getConvKey(msg);
      if (key === 'unassigned') return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
    });

    return Object.entries(groups)
      .map(([key, msgs]) => {
        const latest = msgs[msgs.length - 1];
        const customerMsgs = msgs.filter(m => m.direction === 'in');

        // Look for real customer name if available
        const namedMsg = [...customerMsgs].reverse().find(
          m =>
            m.user_name &&
            !m.user_name.toLowerCase().startsWith('visitor') &&
            !m.user_name.toLowerCase().startsWith('guest')
        );
        const latestCustomer = customerMsgs[customerMsgs.length - 1];

        let displayName =
          namedMsg?.user_name ||
          latestCustomer?.user_name ||
          (key.startsWith('guest_') ? `Guest (${key.replace('guest_', '#')})` : 'Customer');

        // Clean up any (#tag) from primary title
        displayName = displayName.replace(/\s*\(#[^\)]+\)/g, '').trim() || 'Visitor';

        return {
          userId: key,
          isGuest: key.startsWith('guest_'),
          userName: displayName,
          lastMessage: latest,
          messages: msgs,
          unreadCount: msgs.filter(m => m.direction === 'in').length,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
      );
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

  const filteredConversations = conversations.filter(
    c =>
      c.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendReply = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || replyText).trim();

    if (!textToSend || !activeConversation || isSending) return;

    try {
      setIsSending(true);
      const isGuest = activeConversation.isGuest;

      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_user_id: isGuest ? null : activeConversation.userId,
          customer_name: activeConversation.userName,
          message: textToSend,
        }),
      });

      if (res.ok) {
        setReplyText('');
        fetchMessages();
      }
    } catch (err) {
      console.error('Failed to send admin reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      suppressHydrationWarning
      style={{
        height: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        width: '100%',
      }}
    >
      {/* Page Header */}
      <div className="admin-page-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={24} color="var(--color-primary)" />
            Live Customer Support Chat
          </h1>
          <p className="admin-page-desc">
            Reply to customer inquiries in real-time. Automatically synchronized with Telegram.
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
          display: 'flex',
          overflow: 'hidden',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-admin-border)',
          background: '#ffffff',
          minWidth: 0,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Left Column: Customer Thread List */}
        <div
          style={{
            width: '340px',
            minWidth: '280px',
            maxWidth: '380px',
            borderRight: '1px solid var(--color-admin-border)',
            display: showMobileChat ? 'none' : 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            flexShrink: 0,
          }}
          className="admin-chat-sidebar"
        >
          {/* Search Box */}
          <div style={{ padding: '14px', borderBottom: '1px solid var(--color-admin-border)' }}>
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
                style={{ paddingLeft: '36px', fontSize: '13px', background: '#f8fafc' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-admin-muted)', fontSize: '13px' }}>
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-admin-muted)', fontSize: '13px' }}>
                No active conversations yet.
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = conv.userId === activeUserId;
                const isCustomerLast = conv.lastMessage.direction === 'in';

                return (
                  <div
                    key={conv.userId}
                    onClick={() => {
                      setActiveUserId(conv.userId);
                      setShowMobileChat(true);
                    }}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--color-admin-border)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--color-primary-10)' : '#ffffff',
                      borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            background: isSelected ? 'var(--color-primary)' : 'var(--color-primary-10)',
                            color: isSelected ? '#ffffff' : 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {conv.userName.charAt(0).toUpperCase()}
                        </div>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '13px',
                            color: 'var(--color-admin-text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {conv.userName}
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--color-admin-muted)', flexShrink: 0, marginLeft: '6px' }}>
                        {new Date(conv.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '12px',
                        color: isCustomerLast ? 'var(--color-admin-text)' : 'var(--color-admin-muted)',
                        fontWeight: isCustomerLast ? 600 : 400,
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

        {/* Right Column: Active Chat Stream */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: '#f8fafc',
            minWidth: 0,
            width: '100%',
          }}
        >
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div
                style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--color-admin-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => setShowMobileChat(false)}
                    style={{
                      display: 'none',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: 'var(--color-admin-text)',
                    }}
                    className="admin-chat-back-btn"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'var(--color-primary-10)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {activeConversation.userName.charAt(0).toUpperCase()}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '14px',
                        color: 'var(--color-admin-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {activeConversation.userName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
                      <span>
                        {activeConversation.isGuest ? 'Guest Visitor' : 'Verified Customer'} • {activeConversation.messages.length} messages
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span className="badge badge-primary" style={{ fontSize: '11px', fontWeight: 700 }}>
                    Telegram Synced ⚡
                  </span>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  minWidth: 0,
                }}
              >
                {activeConversation.messages.map((msg, index) => {
                  const isAgent = msg.direction === 'out';
                  return (
                    <div
                      key={msg.id || index}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAgent ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        alignSelf: isAgent ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {/* Sender Meta Header */}
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
                            <Shield size={12} color="var(--color-primary)" />
                            <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Admin Support (You)</span>
                          </>
                        ) : (
                          <>
                            <User size={12} />
                            <span style={{ fontWeight: 700, color: 'var(--color-admin-text)' }}>
                              {msg.user_name || activeConversation.userName}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Message Bubble */}
                      <div
                        style={{
                          padding: '11px 16px',
                          borderRadius: isAgent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          background: isAgent ? 'var(--color-primary)' : '#ffffff',
                          color: isAgent ? '#ffffff' : 'var(--color-admin-text)',
                          border: isAgent ? 'none' : '1px solid var(--color-admin-border)',
                          fontSize: '13px',
                          lineHeight: 1.5,
                          boxShadow: isAgent
                            ? '0 4px 12px rgba(59, 130, 246, 0.25)'
                            : '0 1px 3px rgba(15, 23, 42, 0.05)',
                          wordBreak: 'break-word',
                        }}
                      >
                        {msg.message}
                      </div>

                      {/* Sent Indicator for Admin */}
                      {isAgent && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontSize: '10px', color: 'var(--color-admin-muted)' }}>
                          <Check size={11} color="var(--color-primary)" />
                          <span>Sent</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Canned Replies Bar */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  padding: '10px 16px',
                  background: '#f8fafc',
                  borderTop: '1px solid var(--color-admin-border)',
                  maxWidth: '100%',
                  minWidth: 0,
                  scrollbarWidth: 'none',
                }}
              >
                {CANNED_REPLIES.map((canned, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendReply(undefined, canned)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '11px',
                      whiteSpace: 'nowrap',
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      flexShrink: 0,
                      background: '#ffffff',
                      borderColor: 'var(--color-admin-border)',
                      color: 'var(--color-admin-text)',
                    }}
                    title="Click to instantly send this reply"
                  >
                    {canned}
                  </button>
                ))}
              </div>

              {/* Reply Input Bar */}
              <form
                onSubmit={handleSendReply}
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid var(--color-admin-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#ffffff',
                  width: '100%',
                  minWidth: 0,
                }}
              >
                <input
                  type="text"
                  placeholder={`Reply to ${activeConversation.userName}...`}
                  className="admin-input"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '11px 16px',
                    fontSize: '13px',
                    borderRadius: 'var(--radius-lg)',
                  }}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    fontWeight: 700,
                    flexShrink: 0,
                    minWidth: '96px',
                    height: '42px',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <Send size={15} />
                  <span>{isSending ? 'Sending...' : 'Send'}</span>
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-admin-muted)' }}>
              <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ fontSize: '14px' }}>Select a customer conversation from the list to start messaging.</p>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 860px) {
          .admin-chat-sidebar {
            width: 100% !important;
            max-width: 100% !important;
            border-right: none !important;
          }
          .admin-chat-back-btn {
            display: inline-flex !important;
          }
        }
      `}</style>
    </div>
  );
}
