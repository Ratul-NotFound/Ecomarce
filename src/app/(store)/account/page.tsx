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
  Star,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import type { Address, Order } from '@/types';

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'addresses' | 'rewards'>('orders');

  // Sync tab with URL parameter if present
  useEffect(() => {
    if (tabParam === 'orders' || tabParam === 'profile' || tabParam === 'addresses' || tabParam === 'rewards') {
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

  // Fetch customer orders and saved addresses
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    // 1. Fetch Orders
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

    // 2. Fetch Addresses
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        if (data) setAddresses(data as Address[]);
      });
  }, [user?.id]);

  // Derived order counts
  const activeOrdersCount = useMemo(
    () => orders.filter(o => ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery'].includes(o.status)).length,
    [orders]
  );
  const deliveredOrdersCount = useMemo(() => orders.filter(o => o.status === 'delivered').length, [orders]);
  const cancelledOrdersCount = useMemo(() => orders.filter(o => o.status === 'cancelled').length, [orders]);

  // Filtered orders list
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
        <p style={{ color: 'var(--color-text-muted)' }}>Loading account dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Sign in to your account</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          Access your order history, live package tracking, saved delivery addresses, and loyalty rewards.
        </p>
        <Link href="/auth?redirect=/account" className="btn btn-primary" id="account-signin-btn">
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

      showToast('New delivery address saved', 'success');
      setAddresses([data as Address, ...addresses]);
      setShowAddressModal(false);
      setAddrStreet('');
    } catch (err: any) {
      showToast(err.message || 'Failed to add address', 'error');
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    try {
      const supabase = createClient();
      await supabase.from('addresses').delete().eq('id', addrId).eq('user_id', user.id);
      setAddresses(addresses.filter(a => a.id !== addrId));
      showToast('Address deleted', 'info');
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
    <div className="container" style={{ padding: '24px 16px 80px', maxWidth: '860px' }}>
      {/* Account Overview Header Card */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-2xl)',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              minWidth: '48px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, var(--color-primary), #1d4ed8)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 800,
              boxShadow: '0 4px 10px rgba(37,99,235,0.25)',
              flexShrink: 0,
            }}
          >
            {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || 'Customer Account'}
              </h1>
              {profile?.role === 'admin' && (
                <Link
                  href="/admin"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(37,99,235,0.1)',
                    color: 'var(--color-primary)',
                  }}
                >
                  Admin ↗
                </Link>
              )}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
              {user.email}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="btn btn-secondary btn-sm"
          id="account-signout-btn"
          style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Quick Summary Metric Cards (2x2 on mobile, 4x1 on desktop) */}
      <div className="account-kpi-grid">
        <button
          type="button"
          onClick={() => {
            setActiveTab('orders');
            setOrderFilter('all');
          }}
          className={`account-kpi-card ${activeTab === 'orders' && orderFilter === 'all' ? 'account-kpi-card--active' : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Total Orders</span>
            <Package size={16} color="var(--color-primary)" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            {orders.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('orders');
            setOrderFilter('active');
          }}
          className={`account-kpi-card ${activeTab === 'orders' && orderFilter === 'active' ? 'account-kpi-card--active' : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-muted)' }}>In Transit</span>
            <Truck size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>
            {activeOrdersCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('addresses')}
          className={`account-kpi-card ${activeTab === 'addresses' ? 'account-kpi-card--active' : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Addresses</span>
            <MapPin size={16} color="var(--color-primary)" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            {addresses.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rewards')}
          className={`account-kpi-card ${activeTab === 'rewards' ? 'account-kpi-card--active' : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Points</span>
            <Gift size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
            {profile?.points || 0}
          </div>
        </button>
      </div>

      {/* Tabs Navigation Bar (Touch scrollable) */}
      <div className="account-tabs-nav">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          id="account-tab-orders"
        >
          <Package size={15} />
          <span>My Orders ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          id="account-tab-profile"
        >
          <User size={15} />
          <span>Profile Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('addresses')}
          className={`btn ${activeTab === 'addresses' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          id="account-tab-addresses"
        >
          <MapPin size={15} />
          <span>Saved Addresses ({addresses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rewards')}
          className={`btn ${activeTab === 'rewards' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          id="account-tab-rewards"
        >
          <Gift size={15} />
          <span>Rewards & Referral</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────
          1. MY ORDERS TAB SECTION
      ──────────────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Order Status Filters (Swipeable on mobile) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                maxWidth: '100%',
                paddingBottom: '2px',
              }}
            >
              {[
                { id: 'all', label: `All (${orders.length})` },
                { id: 'active', label: `In Transit (${activeOrdersCount})` },
                { id: 'delivered', label: `Delivered (${deliveredOrdersCount})` },
                { id: 'cancelled', label: `Cancelled (${cancelledOrdersCount})` },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderFilter(f.id as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12px',
                    fontWeight: orderFilter === f.id ? 800 : 600,
                    background: orderFilter === f.id ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: orderFilter === f.id ? '#ffffff' : 'var(--color-text-secondary)',
                    border: '1px solid ' + (orderFilter === f.id ? 'var(--color-primary)' : 'var(--color-border)'),
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Link
              href="/"
              className="btn btn-secondary btn-sm"
              style={{ display: 'none', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <ShoppingBag size={13} />
              <span>Browse Catalog</span>
            </Link>
          </div>

          {/* Orders Stream / Empty State */}
          {ordersLoading ? (
            <div style={{ background: 'var(--color-surface)', padding: '40px 16px', borderRadius: 'var(--radius-xl)', textAlign: 'center', border: '1px solid var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Loading your orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: '40px 20px',
                textAlign: 'center',
              }}
            >
              <Package size={44} color="var(--color-primary)" style={{ margin: '0 auto 12px', opacity: 0.7 }} />
              <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                {orderFilter === 'all' ? 'No orders placed yet' : `No ${orderFilter} orders`}
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px', maxWidth: '340px', margin: '0 auto 18px' }}>
                {orderFilter === 'all'
                  ? 'Explore our wide range of products and place your first order!'
                  : `You do not have any orders categorized under ${orderFilter}.`}
              </p>
              <Link href="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingBag size={16} />
                <span>Start Shopping</span>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredOrders.map(order => {
                const itemCount = (order.items_snapshot || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
                const isDelivered = order.status === 'delivered';

                return (
                  <div key={order.id} className="account-order-card">
                    {/* Order Top Bar: Order ID, Date, and Badges */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '8px',
                        borderBottom: '1px solid var(--color-border)',
                        paddingBottom: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                            #{order.order_number}
                          </span>
                          <span className={`badge badge-${order.status}`} style={{ fontSize: '11px', padding: '2px 7px' }}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                          {formatDate(order.created_at)}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: order.payment_status === 'confirmed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: order.payment_status === 'confirmed' ? '#059669' : '#d97706',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {order.payment_method?.toUpperCase()} • {order.payment_status === 'confirmed' ? 'Paid' : 'Pending'}
                      </span>
                    </div>

                    {/* Purchased Items List Preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(order.items_snapshot || []).map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <div
                              style={{
                                width: '46px',
                                height: '46px',
                                minWidth: '46px',
                                borderRadius: 'var(--radius-md)',
                                background: '#f1f5f9',
                                position: 'relative',
                                overflow: 'hidden',
                                border: '1px solid var(--color-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {item.image_snapshot ? (
                                <Image
                                  src={item.image_snapshot}
                                  alt={item.name_snapshot || 'Product'}
                                  fill
                                  sizes="46px"
                                  style={{ objectFit: 'cover' }}
                                />
                              ) : (
                                <Package size={20} color="var(--color-text-muted)" />
                              )}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <h4
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: 'var(--color-text-primary)',
                                  margin: 0,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  lineHeight: 1.3,
                                }}
                              >
                                {item.name_snapshot}
                              </h4>
                              <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
                                Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                              </span>
                            </div>
                          </div>

                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)', flexShrink: 0 }}>
                            {formatCurrency(item.total_price || item.unit_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Order Financials & Shipping Destination */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                        borderTop: '1px solid var(--color-border)',
                        paddingTop: '10px',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="var(--color-primary)" />
                        <span>
                          To: <strong style={{ color: 'var(--color-text-primary)' }}>{order.shipping_address?.district}</strong>
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>{itemCount} items:</span>
                        <strong style={{ fontSize: '15px', color: 'var(--color-primary)' }}>
                          {formatCurrency(order.total)}
                        </strong>
                      </div>
                    </div>

                    {/* Action Buttons (Full width 2-column grid on mobile) */}
                    <div className="order-card__actions">
                      <a
                        href={`/api/invoices/${order.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <FileText size={14} />
                        <span>View Invoice</span>
                      </a>

                      <Link
                        href={`/orders/${order.id}`}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Truck size={14} />
                        <span>Track Order</span>
                        <ArrowRight size={13} />
                      </Link>

                      {isDelivered && (
                        <Link
                          href={`/orders/${order.id}#reviews`}
                          className="btn btn-secondary btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#eab308',
                            borderColor: '#fde047',
                            gridColumn: 'span 2',
                            justifyContent: 'center',
                          }}
                        >
                          <Star size={14} fill="#eab308" />
                          <span>Rate Purchased Items</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          2. PROFILE DETAILS TAB SECTION
      ──────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '20px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '16px' }}>Personal Information</h2>
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '480px' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
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
              <label className="form-label">Mobile Number</label>
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
              style={{ width: 'fit-content', marginTop: '4px' }}
            >
              {isUpdating ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          3. ADDRESS BOOK TAB SECTION
      ──────────────────────────────────────────────────────────── */}
      {activeTab === 'addresses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800 }}>Delivery Addresses</h2>
            <button
              type="button"
              onClick={() => setShowAddressModal(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              <span>Add New Address</span>
            </button>
          </div>

          {addresses.length === 0 ? (
            <div style={{ background: 'var(--color-surface)', padding: '32px 16px', borderRadius: 'var(--radius-xl)', textAlign: 'center', border: '1px solid var(--color-border)' }}>
              <MapPin size={32} color="var(--color-text-muted)" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px' }}>No saved addresses yet. Add one for faster checkout!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              {addresses.map(addr => (
                <div
                  key={addr.id}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '16px',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge-primary">{addr.label}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '14px' }}>{addr.full_name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0', lineHeight: 1.4 }}>
                    {addr.street_address}, {addr.upazila}, {addr.district}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>📞 {addr.phone}</div>
                </div>
              ))}
            </div>
          )}

          {/* Add Address Modal Form */}
          {showAddressModal && (
            <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-xl)', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px' }}>New Address Details</h3>
              <form onSubmit={handleAddAddress} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="address-form-grid">
                  <div className="form-group">
                    <label className="form-label">Label (e.g. Home, Office)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addrLabel}
                      onChange={e => setAddrLabel(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Recipient Name</label>
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

                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
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
          4. REWARDS & REFERRAL TAB SECTION
      ──────────────────────────────────────────────────────────── */}
      {activeTab === 'rewards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', padding: '20px', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ fontSize: '12px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              My Loyalty Balance
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, margin: '6px 0' }}>
              {profile?.points || 0} Points
            </div>
            <p style={{ fontSize: '12.5px', opacity: 0.9, margin: 0 }}>
              Earn 10 points for every ৳100 spent. Redeem points for discount vouchers at checkout.
            </p>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px' }}>Invite Friends & Earn</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
              Share your referral link with friends. When they make their first purchase, you both get reward points!
            </p>

            <div className="form-group">
              <label className="form-label">Your Referral Link</label>
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
                    showToast('Referral link copied to clipboard!', 'success');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  <Copy size={14} />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
