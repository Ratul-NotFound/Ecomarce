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
  Copy,
  ExternalLink,
} from 'lucide-react';
import type { Address, Order } from '@/types';

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile' | 'rewards'>('orders');

  // Sync tab with URL parameter if present
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
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Loading your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>Sign in to your account</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
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
    <div className="container" style={{ padding: '16px 16px 120px', maxWidth: '720px' }}>
      {/* ────────────────────────────────────────────────────────────
          1. CLEAN PROFILE HEADER (Simple, uncluttered, professional)
      ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0 16px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '16px',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>

          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
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
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            background: 'none',
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
          2. CLEAN PRIMARY TAB NAVIGATION (Orders, Addresses, Profile, Rewards)
      ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          marginBottom: '16px',
        }}
      >
        {[
          { id: 'orders', label: `My Orders (${orders.length})`, icon: Package },
          { id: 'addresses', label: `Addresses (${addresses.length})`, icon: MapPin },
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'rewards', label: `Rewards (${profile?.points || 0} pts)`, icon: Gift },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          const IconComp = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                borderRadius: 'var(--radius-full)',
                border: '1px solid ' + (isActive ? 'var(--color-primary)' : 'var(--color-border)'),
                background: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
                color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <IconComp size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────────
          3. MY ORDERS TAB (Clean, uncluttered, focused)
      ──────────────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Sub-Filters: All, In Transit, Delivered */}
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
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: isSelected ? 'var(--color-primary-10)' : 'transparent',
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
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
              Loading orders...
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
              <Package size={40} color="var(--color-text-muted)" style={{ margin: '0 auto 10px', opacity: 0.6 }} />
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                {orderFilter === 'all' ? 'No orders yet' : `No ${orderFilter} orders`}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                Discover our curated products and place your first order.
              </p>
              <Link href="/" className="btn btn-primary btn-sm">
                Start Shopping
              </Link>
            </div>
          ) : (
            filteredOrders.map(order => {
              const firstItem = (order.items_snapshot || [])[0];
              const totalItemsCount = (order.items_snapshot || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
              const isDelivered = order.status === 'delivered';

              return (
                <div
                  key={order.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  {/* Order Top Bar: Order ID + Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        #{order.order_number}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        • {formatDate(order.created_at)}
                      </span>
                    </div>

                    <span className={`badge badge-${order.status}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  {/* Primary Product Snapshot */}
                  {firstItem && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          minWidth: '56px',
                          borderRadius: '10px',
                          background: '#f8fafc',
                          border: '1px solid var(--color-border)',
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
                            sizes="56px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <Package size={22} color="var(--color-text-muted)" />
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
                          {totalItemsCount > 1 ? `${totalItemsCount} items • ` : `Qty: ${firstItem.quantity} • `}
                          {order.payment_method?.toUpperCase()}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-primary)' }}>
                          {formatCurrency(order.total)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Buttons: Clean 2-column touch row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1.2fr',
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
          4. ADDRESSES TAB
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
            <div style={{ background: 'var(--color-surface)', padding: '32px 16px', borderRadius: 'var(--radius-xl)', textAlign: 'center', border: '1px solid var(--color-border)' }}>
              <MapPin size={32} color="var(--color-text-muted)" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px' }}>No saved addresses yet.</p>
            </div>
          ) : (
            addresses.map(addr => (
              <div
                key={addr.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '16px',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
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
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0' }}>
                  {addr.street_address}, {addr.upazila}, {addr.district}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>📞 {addr.phone}</div>
              </div>
            ))
          )}

          {/* Add Address Form */}
          {showAddressModal && (
            <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-primary)', borderRadius: '16px', padding: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>New Address</h3>
              <form onSubmit={handleAddAddress} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
          5. PROFILE TAB
      ──────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}>
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
              style={{ width: 'fit-content' }}
            >
              {isUpdating ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          6. REWARDS TAB
      ──────────────────────────────────────────────────────────── */}
      {activeTab === 'rewards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', padding: '20px', borderRadius: '16px' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              Loyalty Balance
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, margin: '4px 0' }}>
              {profile?.points || 0} Points
            </div>
            <p style={{ fontSize: '12px', opacity: 0.9, margin: 0 }}>
              Earn 10 points for every ৳100 spent. Redeem points at checkout.
            </p>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px' }}>Invite Friends & Earn</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
              Share your referral link with friends to earn bonus reward points.
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                value={referralLink}
                readOnly
                style={{ background: 'var(--color-surface-2)', fontSize: '12px' }}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  showToast('Referral link copied!', 'success');
                }}
                className="btn btn-secondary btn-sm"
              >
                <Copy size={13} />
                <span>Copy</span>
              </button>
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
