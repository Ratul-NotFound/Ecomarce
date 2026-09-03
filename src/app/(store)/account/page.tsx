'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/shared/ToastProvider';
import { DISTRICTS } from '@/lib/utils/bangladesh-districts';
import { formatCurrency, formatDate, getStatusLabel } from '@/lib/utils/format';
import {
  User,
  MapPin,
  Gift,
  LogOut,
  Plus,
  Trash2,
  Package,
  Truck,
  ArrowRight,
  FileText,
  Copy,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import type { Address, Order } from '@/types';

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile' | 'rewards'>('orders');

  useEffect(() => {
    if (tabParam === 'orders' || tabParam === 'addresses' || tabParam === 'profile' || tabParam === 'rewards') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Address State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrDistrict, setAddrDistrict] = useState('Dhaka');
  const [addrUpazila, setAddrUpazila] = useState('');
  const [addrStreet, setAddrStreet] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  // Fetch orders and addresses
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    // 1. Orders
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setOrders(data as Order[]);
        }
        setOrdersLoading(false);
      });

    // 2. Addresses
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        if (data) setAddresses(data as Address[]);
      });
  }, [user?.id]);

  // Counts
  const activeOrdersCount = useMemo(
    () => orders.filter(o => ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery'].includes(o.status)).length,
    [orders]
  );
  const deliveredOrdersCount = useMemo(() => orders.filter(o => o.status === 'delivered').length, [orders]);
  const cancelledOrdersCount = useMemo(() => orders.filter(o => o.status === 'cancelled').length, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'active') {
      return orders.filter(o => ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery'].includes(o.status));
    }
    if (orderFilter === 'delivered') {
      return orders.filter(o => o.status === 'delivered');
    }
    if (orderFilter === 'cancelled') {
      return orders.filter(o => o.status === 'cancelled');
    }
    return orders;
  }, [orders, orderFilter]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 16px', textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--color-primary-10)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <User size={28} />
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Sign in to ShopBD</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px', fontSize: '13.5px' }}>
          Track your orders, manage delivery addresses, and view your loyalty rewards.
        </p>
        <Link href="/auth?redirect=/account" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Sign In / Register
        </Link>
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;
      showToast('Profile updated successfully!', 'success');
      refreshProfile();
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supabase = createClient();
      const newAddr = {
        user_id: user.id,
        label: addrLabel,
        full_name: addrName || fullName,
        phone: addrPhone || phone,
        district: addrDistrict,
        upazila: addrUpazila || addrDistrict,
        street_address: addrStreet,
        is_default: addresses.length === 0,
      };

      const { data, error } = await supabase
        .from('addresses')
        .insert(newAddr)
        .select()
        .single();

      if (error) throw error;

      showToast('Address saved', 'success');
      setAddresses([data as Address, ...addresses]);
      setShowAddressModal(false);
      setAddrStreet('');
    } catch (err: any) {
      showToast(err.message || 'Failed to save address', 'error');
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    try {
      const supabase = createClient();
      await supabase.from('addresses').delete().eq('id', addrId).eq('user_id', user.id);
      setAddresses(addresses.filter(a => a.id !== addrId));
      showToast('Address removed', 'info');
    } catch {
      showToast('Failed to delete address', 'error');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth?ref=${profile?.referral_code || ''}`;

  return (
    <div className="container" style={{ padding: '24px 16px 140px', maxWidth: '1120px' }}>
      {/* ────────────────────────────────────────────────────────────
          MOBILE / TABLET HEADER (Hidden on Desktop)
      ──────────────────────────────────────────────────────────── */}
      <div
        className="account-header-mobile"
        style={{
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '14px',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {profile?.full_name || 'My Account'}
              </span>
              {profile?.role === 'admin' && (
                <Link
                  href="/admin"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(37,99,235,0.1)',
                    color: 'var(--color-primary)',
                  }}
                >
                  Admin ↗
                </Link>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          title="Sign Out"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '6px 10px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────
          MOBILE / TABLET TABS RAIL (Hidden on Desktop)
      ──────────────────────────────────────────────────────────── */}
      <div
        className="account-tabs-mobile"
        style={{
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '16px',
          gap: '20px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {[
          { id: 'orders', label: 'My Orders', badge: orders.length },
          { id: 'addresses', label: 'Addresses', badge: addresses.length },
          { id: 'profile', label: 'Profile' },
          { id: 'rewards', label: 'Rewards' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 0 10px',
                fontSize: '13px',
                fontWeight: isActive ? 800 : 500,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                border: 'none',
                borderBottom: isActive ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
                background: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isActive ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────────
          RESPONSIVE 2-COLUMN DASHBOARD GRID (Desktop Sidebar + Main Content)
      ──────────────────────────────────────────────────────────── */}
      <div className="account-dashboard-layout">
        {/* DESKTOP SIDEBAR */}
        <aside className="account-sidebar-desktop">
          {/* User Profile Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '18px', borderBottom: '1px solid var(--color-border)', marginBottom: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                minWidth: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
              }}
            >
              {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || 'My Account'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
              {profile?.role === 'admin' && (
                <Link
                  href="/admin"
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    display: 'inline-block',
                    marginTop: '2px',
                  }}
                >
                  Admin Panel ↗
                </Link>
              )}
            </div>
          </div>

          {/* Nav Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`account-nav-item ${activeTab === 'orders' ? 'account-nav-item--active' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={16} />
                <span>My Orders</span>
              </div>
              <span className="badge" style={{ fontSize: '11px', background: activeTab === 'orders' ? 'var(--color-primary)' : 'var(--color-surface-2)', color: activeTab === 'orders' ? '#fff' : 'var(--color-text-muted)' }}>
                {orders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('addresses')}
              className={`account-nav-item ${activeTab === 'addresses' ? 'account-nav-item--active' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={16} />
                <span>Delivery Addresses</span>
              </div>
              <span className="badge" style={{ fontSize: '11px', background: activeTab === 'addresses' ? 'var(--color-primary)' : 'var(--color-surface-2)', color: activeTab === 'addresses' ? '#fff' : 'var(--color-text-muted)' }}>
                {addresses.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`account-nav-item ${activeTab === 'profile' ? 'account-nav-item--active' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={16} />
                <span>Profile Settings</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rewards')}
              className={`account-nav-item ${activeTab === 'rewards' ? 'account-nav-item--active' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Gift size={16} />
                <span>Rewards & Points</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>
                {profile?.points || 0} pts
              </span>
            </button>

            <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '12px', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={handleSignOut}
                className="account-nav-item"
                style={{ color: 'var(--color-danger)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </div>
              </button>
            </div>
          </nav>
        </aside>

        {/* MAIN DASHBOARD CONTENT */}
        <main style={{ minWidth: 0, width: '100%' }}>
          {/* ────────────────────────────────────────────────────────────
              TAB 1: MY ORDERS VIEW
          ──────────────────────────────────────────────────────────── */}
          {activeTab === 'orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Filter Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                }}
              >
                {[
                  { id: 'all', label: `All (${orders.length})` },
                  { id: 'active', label: `In Transit (${activeOrdersCount})` },
                  { id: 'delivered', label: `Delivered (${deliveredOrdersCount})` },
                  { id: 'cancelled', label: `Cancelled (${cancelledOrdersCount})` },
                ].map(f => {
                  const isSelected = orderFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setOrderFilter(f.id as any)}
                      style={{
                        fontSize: '12px',
                        fontWeight: isSelected ? 700 : 500,
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid ' + (isSelected ? 'var(--color-primary)' : 'var(--color-border)'),
                        background: isSelected ? 'var(--color-primary-10)' : 'var(--color-surface)',
                        color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* Orders List / Empty State */}
              {ordersLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  Loading orders...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    padding: '48px 24px',
                    textAlign: 'center',
                  }}
                >
                  <Package size={44} color="var(--color-text-muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                    {orderFilter === 'all' ? 'No orders placed yet' : `No ${orderFilter} orders`}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '18px' }}>
                    Explore our catalog to find exciting products and place your first order.
                  </p>
                  <Link href="/" className="btn btn-primary btn-sm">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                filteredOrders.map(order => {
                  const firstItem = (order.items_snapshot || [])[0];
                  const totalItemsCount = (order.items_snapshot || []).reduce((sum, it) => sum + (it.quantity || 1), 0);

                  let statusDotColor = '#f59e0b';
                  let statusBg = 'rgba(245, 158, 11, 0.1)';
                  let statusTextColor = '#b45309';

                  if (order.status === 'delivered') {
                    statusDotColor = '#10b981';
                    statusBg = 'rgba(16, 185, 129, 0.1)';
                    statusTextColor = '#059669';
                  } else if (order.status === 'shipped' || order.status === 'out_for_delivery') {
                    statusDotColor = '#2563eb';
                    statusBg = 'rgba(37, 99, 235, 0.1)';
                    statusTextColor = '#2563eb';
                  } else if (order.status === 'cancelled') {
                    statusDotColor = '#ef4444';
                    statusBg = 'rgba(239, 68, 68, 0.1)';
                    statusTextColor = '#dc2626';
                  }

                  return (
                    <div
                      key={order.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: '16px',
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                      }}
                    >
                      {/* Top Bar: Order ID + Status with Dot */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                            #{order.order_number}
                          </span>
                          <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                            • {formatDate(order.created_at)}
                          </span>
                        </div>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: statusBg,
                            color: statusTextColor,
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusDotColor }} />
                          {getStatusLabel(order.status)}
                        </span>
                      </div>

                      {/* Product Preview */}
                      {firstItem && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '2px 0' }}>
                          <div
                            style={{
                              width: '54px',
                              height: '54px',
                              minWidth: '54px',
                              borderRadius: '12px',
                              background: '#f8fafc',
                              border: '1px solid rgba(0,0,0,0.06)',
                              position: 'relative',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {firstItem.image_snapshot ? (
                              <Image
                                src={firstItem.image_snapshot}
                                alt={firstItem.name_snapshot || 'Product'}
                                fill
                                sizes="54px"
                                style={{ objectFit: 'cover' }}
                              />
                            ) : (
                              <Package size={20} color="var(--color-text-muted)" />
                            )}
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: '13.5px',
                                fontWeight: 600,
                                color: 'var(--color-text-primary)',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.3,
                              }}
                            >
                              {firstItem.name_snapshot}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                              Qty: {firstItem.quantity} • {order.payment_method?.toUpperCase()}
                              {totalItemsCount > 1 && ` (+${totalItemsCount - 1} more)`}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-primary)' }}>
                              {formatCurrency(order.total)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bottom Actions Row */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1.3fr',
                          gap: '8px',
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: '12px',
                        }}
                      >
                        <a
                          href={`/api/invoices/${order.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            fontSize: '12.5px',
                            height: '38px',
                            borderRadius: '10px',
                          }}
                        >
                          <FileText size={14} />
                          <span>Invoice</span>
                        </a>

                        <Link
                          href={`/orders/${order.id}`}
                          className="btn btn-primary btn-sm"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            fontSize: '12.5px',
                            height: '38px',
                            borderRadius: '10px',
                          }}
                        >
                          <Truck size={14} />
                          <span>Track Order</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────
              TAB 2: DELIVERY ADDRESSES VIEW
          ──────────────────────────────────────────────────────────── */}
          {activeTab === 'addresses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Delivery Addresses</h2>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} />
                  <span>Add Address</span>
                </button>
              </div>

              {addresses.length === 0 ? (
                <div style={{ background: 'var(--color-surface)', padding: '40px 16px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                  <MapPin size={36} color="var(--color-text-muted)" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px' }}>No saved delivery addresses yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {addresses.map(addr => (
                    <div
                      key={addr.id}
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: '16px',
                        padding: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span className="badge badge-primary" style={{ fontSize: '10.5px' }}>{addr.label}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '14px' }}>{addr.full_name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0', lineHeight: 1.4 }}>
                        {addr.street_address}, {addr.upazila}, {addr.district}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>📞 {addr.phone}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Address Modal Form */}
              {showAddressModal && (
                <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-primary)', borderRadius: '16px', padding: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px' }}>New Address Details</h3>
                  <form onSubmit={handleAddAddress} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="address-form-grid">
                      <div className="form-group">
                        <label className="form-label">Label (Home, Office)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={addrLabel}
                          onChange={e => setAddrLabel(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Recipient Full Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={addrName}
                          onChange={e => setAddrName(e.target.value)}
                          placeholder={fullName}
                        />
                      </div>
                    </div>

                    <div className="address-form-grid">
                      <div className="form-group">
                        <label className="form-label">District / জেলা</label>
                        <select
                          className="form-input"
                          value={addrDistrict}
                          onChange={e => setAddrDistrict(e.target.value)}
                        >
                          {DISTRICTS.map(d => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="tel"
                          className="form-input"
                          value={addrPhone}
                          onChange={e => setAddrPhone(e.target.value)}
                          placeholder={phone}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Street Address</label>
                      <textarea
                        className="form-input"
                        rows={2}
                        placeholder="House, Road, Area"
                        value={addrStreet}
                        onChange={e => setAddrStreet(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button type="submit" className="btn btn-primary btn-sm">
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddressModal(false)}
                        className="btn btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────
              TAB 3: PROFILE SETTINGS VIEW
          ──────────────────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '24px', maxWidth: '560px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Personal Profile</h2>
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address (Verified)</label>
                  <input
                    type="email"
                    className="form-input"
                    value={user.email || ''}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn btn-primary btn-sm"
                  style={{ width: 'fit-content', height: '38px', marginTop: '4px' }}
                >
                  {isUpdating ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────
              TAB 4: REWARDS & REFERRAL VIEW
          ──────────────────────────────────────────────────────────── */}
          {activeTab === 'rewards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '560px' }}>
              <div style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', padding: '24px', borderRadius: '16px' }}>
                <div style={{ fontSize: '11px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                  Loyalty Balance
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, margin: '6px 0' }}>
                  {profile?.points || 0} Points
                </div>
                <p style={{ fontSize: '12.5px', opacity: 0.9, margin: 0 }}>
                  Earn 10 points for every ৳100 spent. Redeem points for discounts at checkout.
                </p>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px' }}>Invite Friends & Earn</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                  Share your referral link with friends. When they make their first purchase, you both earn points!
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={referralLink}
                    readOnly
                    style={{ background: 'var(--color-surface-2)', fontSize: '13px' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(referralLink);
                      showToast('Referral link copied!', 'success');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    <Copy size={14} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="container" style={{ padding: '80px 16px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading account dashboard...</p>
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
