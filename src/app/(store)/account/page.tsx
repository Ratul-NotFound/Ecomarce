'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/shared/ToastProvider';
import { DISTRICTS } from '@/lib/utils/bangladesh-districts';
import { STORE_CONFIG } from '@/lib/store-config';
import { User, MapPin, Gift, LogOut, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { Address } from '@/types';

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'rewards'>('profile');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Address management
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

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        if (data) setAddresses(data as Address[]);
      });
  }, [user?.id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Sign in to your account</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          Access your profile, saved delivery addresses, and loyalty reward points.
        </p>
        <Link href="/auth?redirect=/account" className="btn btn-primary">
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
    <div className="container" style={{ padding: '32px 16px 80px', maxWidth: '840px' }}>
      {/* Account Overview Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-2xl)', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '9999px', background: 'var(--color-primary-10)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800 }}>
            {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800 }}>{profile?.full_name || 'My Account'}</h1>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{user.email}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="btn btn-secondary btn-sm"
          id="account-signout-btn"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <User size={14} />
          <span>Profile Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('addresses')}
          className={`btn ${activeTab === 'addresses' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <MapPin size={14} />
          <span>Address Book ({addresses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rewards')}
          className={`btn ${activeTab === 'rewards' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <Gift size={14} />
          <span>Rewards & Referral</span>
        </button>
      </div>

      {/* 1. Profile Tab */}
      {activeTab === 'profile' && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Personal Information</h2>
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
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
              <label className="form-label">Email Address (Read-only)</label>
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
              style={{ width: 'fit-content' }}
            >
              {isUpdating ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      )}

      {/* 2. Address Book Tab */}
      {activeTab === 'addresses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Saved Delivery Addresses</h2>
            <button
              type="button"
              onClick={() => setShowAddressModal(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} />
              <span>Add New Address</span>
            </button>
          </div>

          {addresses.length === 0 ? (
            <div style={{ background: 'var(--color-surface)', padding: '32px', borderRadius: 'var(--radius-xl)', textAlign: 'center', border: '1px solid var(--color-border)' }}>
              <MapPin size={32} color="var(--color-text-muted)" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>No saved addresses yet. Add one for faster checkout!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
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
                      style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{addr.full_name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0' }}>
                    {addr.street_address}, {addr.upazila}, {addr.district}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>📞 {addr.phone}</div>
                </div>
              ))}
            </div>
          )}

          {/* Add Address Modal Form */}
          {showAddressModal && (
            <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>New Address Details</h3>
              <form onSubmit={handleAddAddress} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addrName}
                      onChange={e => setAddrName(e.target.value)}
                      placeholder={fullName}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                    <label className="form-label">Phone</label>
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

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
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

      {/* 3. Rewards & Referral Tab */}
      {activeTab === 'rewards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', padding: '24px', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ fontSize: '13px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px' }}>
              My Loyalty Balance
            </div>
            <div style={{ fontSize: '36px', fontWeight: 800, margin: '8px 0' }}>
              {profile?.points || 0} Points
            </div>
            <p style={{ fontSize: '13px', opacity: 0.9 }}>
              Earn 10 points for every ৳100 spent. Redeem points for discount vouchers at checkout.
            </p>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Invite Friends & Earn</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
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
                  style={{ background: 'var(--color-surface-2)' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink);
                    showToast('Referral link copied to clipboard!', 'success');
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
