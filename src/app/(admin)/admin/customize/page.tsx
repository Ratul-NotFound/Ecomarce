'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/shared/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import ImageUploader from '@/components/admin/ImageUploader';
import { Sparkles, Plus, Trash2, ArrowUp, ArrowDown, Layout, Layers } from 'lucide-react';
import type { SpecialOffer, Category } from '@/types';

export default function AdminCustomizePage() {
  const { showToast } = useToast();
  const [banners, setBanners] = useState<SpecialOffer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // New Banner Form
  const [bannerTitleEn, setBannerTitleEn] = useState('');
  const [bannerTitleBn, setBannerTitleBn] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('🔥 SPECIAL OFFER');
  const [bannerLink, setBannerLink] = useState('/search');
  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    const supabase = createClient();
    const [bannersRes, catsRes] = await Promise.all([
      supabase.from('special_offers').select('*').order('display_order', { ascending: true }),
      supabase.from('categories').select('*').order('display_order', { ascending: true }),
    ]);

    if (bannersRes.data) setBanners(bannersRes.data as SpecialOffer[]);
    if (catsRes.data) setCategories(catsRes.data as Category[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitleEn.trim()) {
      showToast('Banner title is required', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const supabase = createClient();
      const newBanner = {
        title_en: bannerTitleEn.trim(),
        title_bn: bannerTitleBn.trim() || null,
        subtitle: bannerSubtitle.trim() || null,
        link_url: bannerLink.trim() || '/search',
        image_url: bannerImages[0] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
        type: 'hero_banner',
        display_order: banners.length + 1,
        is_active: true,
      };

      const { data, error } = await supabase.from('special_offers').insert(newBanner).select().single();
      if (error) throw error;

      showToast('Banner published to homepage!', 'success');
      setBanners([...banners, data as SpecialOffer]);
      setBannerTitleEn('');
      setBannerTitleBn('');
      setBannerImages([]);
    } catch (err: any) {
      showToast(err.message || 'Error creating banner', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    try {
      const supabase = createClient();
      await supabase.from('special_offers').delete().eq('id', bannerId);
      setBanners(banners.filter(b => b.id !== bannerId));
      showToast('Banner removed', 'info');
    } catch {
      showToast('Failed to delete banner', 'error');
    }
  };

  const handleMoveCategory = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;

    const updated = [...categories];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    // Update display orders
    setCategories(updated);

    try {
      const supabase = createClient();
      for (let i = 0; i < updated.length; i++) {
        await supabase.from('categories').update({ display_order: i + 1 }).eq('id', updated[i].id);
      }
      showToast('Category sequence updated!', 'success');
    } catch {
      showToast('Failed to reorder categories', 'error');
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Storefront & Hero Customizer</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Customize homepage hero carousels, sequencing of product categories, and promotional banners.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Hero Banners Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="admin-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Layout size={18} color="var(--color-primary-light)" />
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>Add Hero Carousel Slide</h2>
            </div>

            <form onSubmit={handleCreateBanner} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="admin-label">Headline Title (English) *</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Exclusive Eid Collection 2026"
                  value={bannerTitleEn}
                  onChange={e => setBannerTitleEn(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Headline Title (বাংলা)</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. এক্সক্লুসিভ কালেকশন"
                  value={bannerTitleBn}
                  onChange={e => setBannerTitleBn(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Badge / Subtitle</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. FLAT 30% OFF THIS WEEK"
                  value={bannerSubtitle}
                  onChange={e => setBannerSubtitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Target Link URL</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="/category/fashion or /search"
                  value={bannerLink}
                  onChange={e => setBannerLink(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Banner Background Image</label>
                <ImageUploader images={bannerImages} onChange={setBannerImages} />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary btn-sm"
                style={{ marginTop: '8px' }}
              >
                <Plus size={14} />
                <span>{isSaving ? 'Publishing...' : 'Add Banner to Homepage'}</span>
              </button>
            </form>
          </div>

          {/* Active Banners List */}
          <div className="admin-card">
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
              Current Hero Slides ({banners.length})
            </h2>

            {banners.length === 0 ? (
              <p style={{ color: 'var(--color-admin-muted)', fontSize: '13px' }}>No custom hero slides configured yet. Default hero is active.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {banners.map(b => (
                  <div
                    key={b.id}
                    style={{
                      background: 'var(--color-admin-surface-2)',
                      border: '1px solid var(--color-admin-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: '14px' }}>{b.title_en}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                        {b.subtitle} • Link: {b.link_url}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(b.id)}
                      style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category Sequencing Tool */}
        <div className="admin-card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Layers size={18} color="var(--color-primary-light)" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>Category Display Sequence</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)', marginBottom: '16px' }}>
            Change the order of category pills on the store navigation and homepage grid.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                style={{
                  background: 'var(--color-admin-surface-2)',
                  border: '1px solid var(--color-admin-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-admin-dim)', width: '20px' }}>
                    #{idx + 1}
                  </span>
                  <div>
                    <strong style={{ color: '#ffffff', fontSize: '14px' }}>{cat.name_en}</strong>
                    {cat.name_bn && (
                      <span style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginLeft: '6px' }}>
                        ({cat.name_bn})
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleMoveCategory(idx, 'up')}
                    disabled={idx === 0}
                    className="btn btn-secondary btn-sm"
                    style={{ background: 'var(--color-admin-surface)', color: '#ffffff', borderColor: 'var(--color-admin-border)', padding: '4px 6px' }}
                    title="Move Up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveCategory(idx, 'down')}
                    disabled={idx === categories.length - 1}
                    className="btn btn-secondary btn-sm"
                    style={{ background: 'var(--color-admin-surface)', color: '#ffffff', borderColor: 'var(--color-admin-border)', padding: '4px 6px' }}
                    title="Move Down"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
