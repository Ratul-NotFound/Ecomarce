'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils/format';
import {
  Bell,
  Truck,
  Zap,
  Gift,
  CheckCheck,
  Package,
  X,
  ArrowRight,
  ShieldAlert,
  MessageCircle,
  BellRing,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'order' | 'deal' | 'reward' | 'system' | 'chat';
  title: string;
  message: string;
  time: string;
  link: string;
  read: boolean;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { permission, isSubscribed, isLoading: isPushLoading, subscribe: subscribePush } = usePushNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load read notifications from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('shopbd_read_notifications');
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load read notifications:', e);
    }
  }, []);

  // Fetch or generate customer notifications & subscribe to live updates
  useEffect(() => {
    const defaultDeals: NotificationItem[] = [
      {
        id: 'deal-welcome-2026',
        type: 'reward',
        title: 'Welcome to ShopBD!',
        message: 'Earn 10 points for every ৳100 spent on all orders.',
        time: 'Active now',
        link: '/account?tab=rewards',
        read: false,
      },
      {
        id: 'deal-flash-sale',
        type: 'deal',
        title: 'Flash Sale Live 🔥',
        message: 'Up to 40% discount on trending tech & smart accessories.',
        time: 'Limited time',
        link: '/deals',
        read: false,
      },
    ];

    if (!user) {
      setNotifications(defaultDeals);
      return;
    }

    const supabase = createClient();

    // Fetch user's recent orders to generate real order updates
    supabase
      .from('orders')
      .select('id, order_number, status, created_at, total')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        const orderNotifs: NotificationItem[] = (data || []).map(order => {
          let statusDesc = 'Your order has been placed and is being reviewed.';
          if (order.status === 'processing') statusDesc = 'Your order is being packed at the fulfillment center.';
          if (order.status === 'shipped' || order.status === 'out_for_delivery') statusDesc = 'Your package is in transit and on the way!';
          if (order.status === 'delivered') statusDesc = 'Your package has been safely delivered.';

          return {
            id: `order-${order.id}-${order.status}`,
            type: 'order',
            title: `Order #${order.order_number}`,
            message: statusDesc,
            time: formatRelativeTime(order.created_at),
            link: `/orders/${order.id}`,
            read: false,
          };
        });

        setNotifications([...orderNotifs, ...defaultDeals]);
      });

    // Realtime channel for live customer alerts (support replies & order status updates)
    const channel = supabase.channel(`user_notifs_${user.id}`);

    channel
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        payload => {
          const updated = payload.new as any;
          if (!updated) return;
          let statusDesc = `Your order status changed to ${updated.status}.`;
          if (updated.status === 'processing') statusDesc = 'Your order is being packed at the fulfillment center.';
          if (updated.status === 'shipped' || updated.status === 'out_for_delivery') statusDesc = 'Your package is in transit and on the way!';
          if (updated.status === 'delivered') statusDesc = 'Your package has been safely delivered.';

          const newNotif: NotificationItem = {
            id: `order-${updated.id}-${updated.status}-${Date.now()}`,
            type: 'order',
            title: `Order #${updated.order_number} Update`,
            message: statusDesc,
            time: 'Just now',
            link: `/orders/${updated.id}`,
            read: false,
          };

          setNotifications(prev => [newNotif, ...prev.filter(n => !n.id.startsWith(`order-${updated.id}`))]);
        }
      )
      .on('broadcast', { event: 'order_status_updated' }, payload => {
        const p = payload?.payload;
        if (p?.orderId) {
          const newNotif: NotificationItem = {
            id: `order-${p.orderId}-${p.status}-${Date.now()}`,
            type: 'order',
            title: p.title || 'Order Update',
            message: p.message || `Order status updated to ${p.status}`,
            time: 'Just now',
            link: `/orders/${p.orderId}`,
            read: false,
          };
          setNotifications(prev => [newNotif, ...prev.filter(n => !n.id.startsWith(`order-${p.orderId}`))]);
        }
      })
      .on('broadcast', { event: 'new_chat_message' }, payload => {
        const msg = payload?.payload?.message;
        if (msg && msg.direction === 'out' && msg.user_id === user.id) {
          const chatNotif: NotificationItem = {
            id: `chat-${msg.id || Date.now()}`,
            type: 'chat',
            title: '💬 Support Reply',
            message: msg.message?.length > 70 ? msg.message.slice(0, 67) + '…' : msg.message,
            time: 'Just now',
            link: '/?chat=open',
            read: false,
          };
          setNotifications(prev => [chatNotif, ...prev.filter(n => n.id !== chatNotif.id)]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Mark all notifications as read
  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem('shopbd_read_notifications', JSON.stringify(allIds));
    } catch (e) {
      console.warn('Failed to save read state:', e);
    }
  };

  // Mark single item as read
  const markItemAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      try {
        localStorage.setItem('shopbd_read_notifications', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save read state:', e);
      }
    }
    setIsOpen(false);
  };

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Truck size={15} color="var(--color-primary)" />;
      case 'deal':
        return <Zap size={15} color="#f59e0b" />;
      case 'reward':
        return <Gift size={15} color="#10b981" />;
      case 'chat':
        return <MessageCircle size={15} color="var(--color-primary)" />;
      default:
        return <Bell size={15} color="var(--color-text-secondary)" />;
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="header-action-btn"
        title="Notifications"
        aria-label="Notifications"
        id="header-notification-btn"
        style={{
          position: 'relative',
          cursor: 'pointer',
          background: isOpen ? 'var(--color-surface-2)' : 'transparent',
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ef4444',
              boxShadow: '0 0 0 2px var(--color-surface)',
            }}
          />
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '320px',
            maxWidth: 'calc(100vw - 24px)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'dropdownFadeIn 0.2s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: '#ef4444',
                    color: '#ffffff',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <CheckCheck size={13} />
                <span>Mark read</span>
              </button>
            )}
          </div>

          {/* Quick Push Notification Enable Banner */}
          {user && !isSubscribed && permission !== 'denied' && permission !== 'unsupported' && (
            <div
              style={{
                padding: '8px 14px',
                background: 'rgba(99, 102, 241, 0.08)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BellRing size={14} color="var(--color-primary)" />
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Device Push Alerts
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  subscribePush();
                }}
                disabled={isPushLoading}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {isPushLoading ? 'Enabling…' : 'Enable'}
              </button>
            </div>
          )}

          {/* List */}
          <div
            style={{
              maxHeight: '340px',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {notifications.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                No notifications right now
              </div>
            ) : (
              notifications.map(item => {
                const isRead = readIds.includes(item.id);
                return (
                  <Link
                    key={item.id}
                    href={item.link}
                    onClick={() => markItemAsRead(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--color-border)',
                      background: isRead ? 'transparent' : 'rgba(37,99,235,0.03)',
                      textDecoration: 'none',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        minWidth: '32px',
                        borderRadius: '50%',
                        background: 'var(--color-surface-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {getIcon(item.type)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <h4
                          style={{
                            fontSize: '13px',
                            fontWeight: isRead ? 600 : 800,
                            color: 'var(--color-text-primary)',
                            margin: 0,
                          }}
                        >
                          {item.title}
                        </h4>
                        {!isRead && (
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'var(--color-primary)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>

                      <p
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          margin: '2px 0 4px',
                          lineHeight: 1.35,
                        }}
                      >
                        {item.message}
                      </p>

                      <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                        {item.time}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              textAlign: 'center',
            }}
          >
            <Link
              href={user ? '/account?tab=orders' : '/deals'}
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-primary)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{user ? 'View All Orders' : 'Explore Current Deals'}</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
