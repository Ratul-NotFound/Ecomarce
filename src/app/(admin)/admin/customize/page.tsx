'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/shared/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import ImageUploader from '@/components/admin/ImageUploader';
import { getOptimizedImageUrl } from '@/lib/utils/images';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layout,
  Layers,
  Zap,
  Compass,
  Save,
  Tag,
  ShieldCheck,
  CheckCircle2,
  Package,
  Eye,
  EyeOff,
  Edit3,
  X,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Megaphone,
  Phone,
  MessageSquare,
} from 'lucide-react';
import type { SpecialOffer, Category, Product } from '@/types';
import {
  DEFAULT_STOREFRONT_SETTINGS,
  DEFAULT_HOMEPAGE_SECTIONS,
  type StorefrontCustomSettings,
} from '@/lib/store-settings-shared';

const SECTION_METADATA: Record<string, { name: string; desc: string; icon: string }> = {
  hero: { name: 'Hero Carousel Banner', desc: 'Promotional slides, headlines, and call-to-actions', icon: '🎠' },
  trust_badges: { name: 'Customer Trust Badges', desc: 'Guarantees: Cash on delivery, fast shipping, returns', icon: '🛡️' },
  categories: { name: 'Explore Categories Grid', desc: 'Department cards for visual category navigation', icon: '🗂️' },
  flash_sale: { name: 'Flash Sale Showcase', desc: 'Time-limited flash deals with urgent countdown timer', icon: '⚡' },
  featured: { name: 'Featured Products Showcase', desc: 'Curated handpicked top products for customers', icon: '✨' },
  new_arrivals: { name: 'New Arrivals Showcase', desc: 'Fresh catalog additions and latest inventory', icon: '🚀' },
};

export default function AdminCustomizePage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'homepage' | 'announcement' | 'deals' | 'explore' | 'categories' | 'products'>('homepage');

  // Expanded section state for accordion
  const [expandedSection, setExpandedSection] = useState<string | null>('hero');

  // Core Data
  const [banners, setBanners] = useState<SpecialOffer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponCount, setCouponCount] = useState(0);

  // New Slide Form State
  const [bannerTitleEn, setBannerTitleEn] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('🔥 SPECIAL OFFER');
  const [bannerLink, setBannerLink] = useState('/search');
  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);

  // Edit Slide Modal State
  const [editingBanner, setEditingBanner] = useState<SpecialOffer | null>(null);
  const [editSlideTitle, setEditSlideTitle] = useState('');
  const [editSlideSubtitle, setEditSlideSubtitle] = useState('');
  const [editSlideLink, setEditSlideLink] = useState('');
  const [editSlideImages, setEditSlideImages] = useState<string[]>([]);
  const [isUpdatingSlide, setIsUpdatingSlide] = useState(false);

  // Storefront Settings State
  const [settings, setSettings] = useState<StorefrontCustomSettings>(DEFAULT_STOREFRONT_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Tag Chips Input State
  const [newTagInput, setNewTagInput] = useState('');

  // Category Form State
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [newCatNameBn, setNewCatNameBn] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  // Product Search for Sequencing
  const [productSearch, setProductSearch] = useState('');

  const loadData = async () => {
    try {
      const supabase = createClient();
      const [bannersRes, catsRes, prodsRes, couponsRes, settingsRes] = await Promise.all([
        supabase.from('special_offers').select('*').order('display_order', { ascending: true }),
        supabase.from('categories').select('*').order('display_order', { ascending: true }),
        supabase.from('products').select('*').order('display_order', { ascending: true }).limit(50),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('is_active', true),
        fetch('/api/admin/settings').then(r => r.json()),
      ]);

      if (bannersRes.data) setBanners(bannersRes.data as SpecialOffer[]);
      if (catsRes.data) setCategories(catsRes.data as Category[]);
      if (prodsRes.data) setProducts(prodsRes.data as Product[]);
      if (couponsRes.count !== null) setCouponCount(couponsRes.count);

      if (settingsRes?.settings) {
        const s = settingsRes.settings;

        let parsedSections = DEFAULT_HOMEPAGE_SECTIONS;
        if (s.homepage_sections_order) {
          try {
            const val = typeof s.homepage_sections_order === 'string'
              ? JSON.parse(s.homepage_sections_order)
              : s.homepage_sections_order;
            if (Array.isArray(val) && val.length > 0) parsedSections = val;
          } catch {}
        }

        let parsedVisibility = DEFAULT_STOREFRONT_SETTINGS.homepage_section_visibility;
        if (s.homepage_section_visibility) {
          try {
            const val = typeof s.homepage_section_visibility === 'string'
              ? JSON.parse(s.homepage_section_visibility)
              : s.homepage_section_visibility;
            if (val && typeof val === 'object') parsedVisibility = { ...parsedVisibility, ...val };
          } catch {}
        }

        setSettings(prev => ({
          ...prev,
          announcement_bar_enabled: s.announcement_bar_enabled !== undefined
            ? String(s.announcement_bar_enabled) === 'true' || s.announcement_bar_enabled === true
            : prev.announcement_bar_enabled,
          announcement_bar_text: s.announcement_bar_text || prev.announcement_bar_text,
          announcement_bar_link: s.announcement_bar_link || prev.announcement_bar_link,

          store_phone: s.store_phone || prev.store_phone,
          store_whatsapp: s.store_whatsapp || prev.store_whatsapp,

          homepage_flash_sale_enabled: s.homepage_flash_sale_enabled !== undefined
            ? String(s.homepage_flash_sale_enabled) === 'true' || s.homepage_flash_sale_enabled === true
            : prev.homepage_flash_sale_enabled,
          homepage_flash_sale_title: s.homepage_flash_sale_title || prev.homepage_flash_sale_title,
          homepage_flash_sale_end: s.homepage_flash_sale_end || prev.homepage_flash_sale_end || null,
          homepage_featured_title: s.homepage_featured_title || prev.homepage_featured_title,
          homepage_new_arrivals_title: s.homepage_new_arrivals_title || prev.homepage_new_arrivals_title,
          homepage_sections_order: parsedSections,
          homepage_section_visibility: parsedVisibility,

          trust_badge_1_title: s.trust_badge_1_title || prev.trust_badge_1_title,
          trust_badge_1_desc: s.trust_badge_1_desc || prev.trust_badge_1_desc,
          trust_badge_2_title: s.trust_badge_2_title || prev.trust_badge_2_title,
          trust_badge_2_desc: s.trust_badge_2_desc || prev.trust_badge_2_desc,
          trust_badge_3_title: s.trust_badge_3_title || prev.trust_badge_3_title,
          trust_badge_3_desc: s.trust_badge_3_desc || prev.trust_badge_3_desc,
          trust_badge_4_title: s.trust_badge_4_title || prev.trust_badge_4_title,
          trust_badge_4_desc: s.trust_badge_4_desc || prev.trust_badge_4_desc,

          deals_hero_title: s.deals_hero_title || prev.deals_hero_title,
          deals_hero_subtitle: s.deals_hero_subtitle || prev.deals_hero_subtitle,
          deals_badge_text: s.deals_badge_text || prev.deals_badge_text,
          deals_timer_hours: Number(s.deals_timer_hours) || prev.deals_timer_hours,

          explore_title: s.explore_title || prev.explore_title,
          explore_departments_title: s.explore_departments_title || prev.explore_departments_title,
          explore_trending_tags: s.explore_trending_tags || prev.explore_trending_tags,
        }));
      }
    } catch (err) {
      console.error('Failed to load customize data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateSetting = (partial: Partial<StorefrontCustomSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
    setHasUnsavedChanges(true);
  };

  // Save Settings
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSavingSettings(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHasUnsavedChanges(false);
      showToast('All customizations saved live to storefront!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save customizations', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Move Section Up/Down
  const handleMoveSection = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= settings.homepage_sections_order.length) return;

    const updated = [...settings.homepage_sections_order];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    updateSetting({ homepage_sections_order: updated });
  };

  // Toggle Section Visibility
  const handleToggleSectionVisibility = (secKey: string) => {
    const isCurrentlyVisible = settings.homepage_section_visibility?.[secKey] !== false;
    const nextVisibility = !isCurrentlyVisible;

    updateSetting({
      homepage_section_visibility: {
        ...(settings.homepage_section_visibility || {}),
        [secKey]: nextVisibility,
      },
      ...(secKey === 'flash_sale' ? { homepage_flash_sale_enabled: nextVisibility } : {}),
    });

    showToast(`${SECTION_METADATA[secKey]?.name || secKey} ${nextVisibility ? 'enabled (ON)' : 'disabled (OFF)'}`, 'info');
  };

  // Create Slide
  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitleEn.trim()) {
      showToast('Slide headline is required', 'error');
      return;
    }

    try {
      setIsCreatingBanner(true);
      const supabase = createClient();
      const newBanner = {
        title_en: bannerTitleEn.trim(),
        title_bn: null,
        subtitle: bannerSubtitle.trim() || null,
        link_url: bannerLink.trim() || '/search',
        image_url: bannerImages[0] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
        type: 'hero_banner',
        display_order: banners.length + 1,
        is_active: true,
      };

      const { data, error } = await supabase.from('special_offers').insert(newBanner).select().single();
      if (error) throw error;

      showToast('Slide published to hero carousel!', 'success');
      setBanners([...banners, data as SpecialOffer]);
      setBannerTitleEn('');
      setBannerImages([]);
    } catch (err: any) {
      showToast(err.message || 'Error creating slide', 'error');
    } finally {
      setIsCreatingBanner(false);
    }
  };

  // Toggle Slide Active
  const handleToggleSlideActive = async (banner: SpecialOffer) => {
    try {
      const updatedStatus = !banner.is_active;
      const res = await fetch('/api/admin/banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: banner.id, is_active: updatedStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBanners(banners.map(b => (b.id === banner.id ? { ...b, is_active: updatedStatus } : b)));
      showToast(`Slide ${updatedStatus ? 'activated' : 'deactivated'}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to update slide', 'error');
    }
  };

  // Open Edit Slide Modal
  const openEditSlideModal = (banner: SpecialOffer) => {
    setEditingBanner(banner);
    setEditSlideTitle(banner.title_en);
    setEditSlideSubtitle(banner.subtitle || '');
    setEditSlideLink(banner.link_url || '/search');
    setEditSlideImages(banner.image_url ? [banner.image_url] : []);
  };

  // Save Edit Slide
  const handleUpdateSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;

    try {
      setIsUpdatingSlide(true);
      const res = await fetch('/api/admin/banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBanner.id,
          title_en: editSlideTitle.trim(),
          subtitle: editSlideSubtitle.trim() || null,
          link_url: editSlideLink.trim() || '/search',
          image_url: editSlideImages[0] || editingBanner.image_url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBanners(banners.map(b => (b.id === editingBanner.id ? { ...b, ...data.banner } : b)));
      showToast('Slide updated successfully!', 'success');
      setEditingBanner(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update slide', 'error');
    } finally {
      setIsUpdatingSlide(false);
    }
  };

  // Delete Slide
  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('Are you sure you want to delete this slide?')) return;
    try {
      const supabase = createClient();
      await supabase.from('special_offers').delete().eq('id', bannerId);
      setBanners(banners.filter(b => b.id !== bannerId));
      showToast('Slide deleted', 'info');
    } catch {
      showToast('Failed to delete slide', 'error');
    }
  };

  // Move Category
  const handleMoveCategory = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;

    const updated = [...categories];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

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

  // Toggle Category Active (Hide / Show)
  const handleToggleCategoryActive = async (cat: Category) => {
    const nextStatus = !cat.is_active;
    setCategories(prev => prev.map(c => (c.id === cat.id ? { ...c, is_active: nextStatus } : c)));

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cat.id, is_active: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to update category visibility');

      showToast(
        nextStatus ? `Category "${cat.name_en}" is now VISIBLE in store.` : `Category "${cat.name_en}" is now HIDDEN from store.`,
        'success'
      );
    } catch (err: any) {
      setCategories(prev => prev.map(c => (c.id === cat.id ? { ...c, is_active: cat.is_active } : c)));
      showToast(err.message || 'Failed to update category', 'error');
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete category "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete category');

      setCategories(prev => prev.filter(c => c.id !== id));
      showToast(`Category "${name}" deleted.`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category', 'error');
    }
  };

  // Create New Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNameEn.trim()) {
      showToast('Category name in English is required', 'error');
      return;
    }

    try {
      setIsCreatingCategory(true);
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_en: newCatNameEn.trim(),
          name_bn: newCatNameBn.trim() || null,
          slug: newCatSlug.trim() || undefined,
          image_url: newCatImage.trim() || null,
          display_order: categories.length + 1,
          is_active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCategories(prev => [...prev, data.category]);
      showToast(`Category "${data.category.name_en}" created successfully!`, 'success');
      setShowAddCategoryModal(false);
      setNewCatNameEn('');
      setNewCatNameBn('');
      setNewCatSlug('');
      setNewCatImage('');
    } catch (err: any) {
      showToast(err.message || 'Failed to create category', 'error');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Move Product
  const handleMoveProduct = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= products.length) return;

    const updated = [...products];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    setProducts(updated);

    try {
      const supabase = createClient();
      for (let i = 0; i < updated.length; i++) {
        await supabase.from('products').update({ display_order: i + 1 }).eq('id', updated[i].id);
      }
      showToast('Product sequence updated!', 'success');
    } catch {
      showToast('Failed to update product sequence', 'error');
    }
  };

  // Toggle Product Active (Hide / Show)
  const handleToggleProductActive = async (p: Product) => {
    const nextStatus = !p.is_active;
    setProducts(prev => prev.map(item => (item.id === p.id ? { ...item, is_active: nextStatus } : item)));

    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, is_active: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to update product visibility');

      showToast(
        nextStatus ? `"${p.name_en}" is now VISIBLE in store.` : `"${p.name_en}" is now HIDDEN from store.`,
        'success'
      );
    } catch (err: any) {
      setProducts(prev => prev.map(item => (item.id === p.id ? { ...item, is_active: p.is_active } : item)));
      showToast(err.message || 'Failed to update product', 'error');
    }
  };

  // Tag Chips Helpers
  const currentTags = settings.explore_trending_tags
    ? settings.explore_trending_tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim();
    if (!currentTags.includes(tag)) {
      const updated = [...currentTags, tag].join(', ');
      updateSetting({ explore_trending_tags: updated });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = currentTags.filter(t => t !== tagToRemove).join(', ');
    updateSetting({ explore_trending_tags: updated });
  };

  const filteredProducts = products.filter(p =>
    p.name_en.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div>
      {/* ────────────────────────────────────────────────────────────
         TOP ACTION BAR
         ──────────────────────────────────────────────────────────── */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Storefront & Website Customizer</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Modular section-by-section control of your storefront pages, promotional banners, and visual sequence.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/"
            target="_blank"
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px' }}
          >
            <ExternalLink size={15} />
            <span>View Storefront</span>
          </Link>

          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={isSavingSettings}
            className="btn btn-primary"
            id="customizer-save-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontWeight: 800,
              boxShadow: hasUnsavedChanges ? '0 0 15px rgba(37, 99, 235, 0.6)' : 'none',
            }}
          >
            <Save size={16} />
            <span>{isSavingSettings ? 'Publishing...' : hasUnsavedChanges ? 'Save Changes ●' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
         MAIN NAVIGATION TABS
         ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--color-admin-border)',
          paddingBottom: '12px',
          marginBottom: '24px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('homepage')}
          className={`btn btn-sm ${activeTab === 'homepage' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}
        >
          <Layout size={15} />
          <span>🏠 Homepage Builder</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcement')}
          className={`btn btn-sm ${activeTab === 'announcement' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}
        >
          <Megaphone size={15} />
          <span>📢 Header & Announcement</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deals')}
          className={`btn btn-sm ${activeTab === 'deals' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}
        >
          <Zap size={15} />
          <span>⚡ Deals Hub</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('explore')}
          className={`btn btn-sm ${activeTab === 'explore' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}
        >
          <Compass size={15} />
          <span>🧭 Explore Page</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`btn btn-sm ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}
        >
          <Layers size={15} />
          <span>🗂️ Categories Sequence</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`btn btn-sm ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}
        >
          <Package size={15} />
          <span>⭐ Products Sequence</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────
         TAB 1: HOMEPAGE MODULAR SECTION BUILDER
         ──────────────────────────────────────────────────────────── */}
      {activeTab === 'homepage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '820px' }}>
          <div style={{ background: 'var(--color-admin-surface-2)', padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-admin-muted)' }}>
              Click on any section to configure its titles, slides, or contents. Use arrows to reorder.
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-light)' }}>
              {settings.homepage_sections_order.length} Sections Configured
            </span>
          </div>

          {settings.homepage_sections_order.map((secKey, idx) => {
            const meta = SECTION_METADATA[secKey] || { name: secKey, desc: '', icon: '📦' };
            const isVisible = settings.homepage_section_visibility?.[secKey] !== false;
            const isExpanded = expandedSection === secKey;

            return (
              <div
                key={secKey}
                style={{
                  background: isVisible ? 'var(--color-admin-surface)' : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${isExpanded ? 'var(--color-primary)' : isVisible ? 'var(--color-admin-border)' : 'rgba(239,68,68,0.2)'}`,
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Section Block Header */}
                <div
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isExpanded ? 'var(--color-admin-surface-2)' : 'transparent',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => setExpandedSection(isExpanded ? null : secKey)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary-light)', minWidth: '22px' }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontSize: '18px' }}>{meta.icon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-admin-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{meta.name}</span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-full)',
                            background: isVisible ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isVisible ? 'var(--color-success)' : 'var(--color-danger)',
                          }}
                        >
                          {isVisible ? 'ACTIVE' : 'OFF'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                        {meta.desc}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                    {/* ON / OFF Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleSectionVisibility(secKey)}
                      className={`btn btn-sm ${isVisible ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ padding: '4px 10px', height: '30px', fontSize: '11px', fontWeight: 700 }}
                    >
                      {isVisible ? 'Turn OFF' : 'Turn ON'}
                    </button>

                    {/* Up Arrow */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, 'up')}
                      style={{
                        background: idx === 0 ? 'var(--color-admin-surface-2)' : '#ffffff',
                        border: '1px solid var(--color-admin-border)',
                        color: idx === 0 ? '#cbd5e1' : 'var(--color-admin-text)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-md)',
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>

                    {/* Down Arrow */}
                    <button
                      type="button"
                      disabled={idx === settings.homepage_sections_order.length - 1}
                      onClick={() => handleMoveSection(idx, 'down')}
                      style={{
                        background: idx === settings.homepage_sections_order.length - 1 ? 'var(--color-admin-surface-2)' : '#ffffff',
                        border: '1px solid var(--color-admin-border)',
                        color: idx === settings.homepage_sections_order.length - 1 ? '#cbd5e1' : 'var(--color-admin-text)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-md)',
                        cursor: idx === settings.homepage_sections_order.length - 1 ? 'not-allowed' : 'pointer',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>

                    {/* Expand/Collapse Icon */}
                    <button
                      type="button"
                      onClick={() => setExpandedSection(isExpanded ? null : secKey)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-admin-muted)', padding: '4px' }}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* ────────────────────────────────────────────────────────────
                   EXPANDED CONTENT BLOCK
                   ──────────────────────────────────────────────────────────── */}
                {isExpanded && (
                  <div style={{ padding: '20px 24px', borderTop: '1px solid var(--color-admin-border)', background: 'var(--color-admin-surface)' }}>
                    {/* HERO CAROUSEL BLOCK */}
                    {secKey === 'hero' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                            Carousel Slides ({banners.length})
                          </h3>
                        </div>

                        {/* Existing Slides */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {banners.map(b => (
                            <div
                              key={b.id}
                              style={{
                                background: 'var(--color-admin-surface-2)',
                                border: '1px solid var(--color-admin-border)',
                                borderRadius: 'var(--radius-lg)',
                                padding: '10px 14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {b.image_url && (
                                  <div style={{ position: 'relative', width: '54px', height: '36px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: '#f1f5f9' }}>
                                    <Image src={b.image_url} alt={b.title_en} fill style={{ objectFit: 'cover' }} />
                                  </div>
                                )}
                                <div>
                                  <strong style={{ fontSize: '13px', color: 'var(--color-admin-text)' }}>{b.title_en}</strong>
                                  <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                                    {b.subtitle} • {b.link_url}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleSlideActive(b)}
                                  className={`btn btn-sm ${b.is_active ? 'btn-secondary' : 'btn-primary'}`}
                                  style={{ padding: '2px 8px', height: '26px', fontSize: '11px' }}
                                >
                                  {b.is_active ? 'ON' : 'OFF'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditSlideModal(b)}
                                  style={{ background: '#ffffff', border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                  title="Edit Slide"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBanner(b.id)}
                                  style={{ background: 'none', border: 'none', color: 'var(--color-danger)', padding: '4px', cursor: 'pointer' }}
                                  title="Delete Slide"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Quick Add Slide */}
                        <div style={{ background: 'var(--color-admin-surface-2)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-admin-border)' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '12px' }}>
                            + Add New Slide to Hero Carousel
                          </h4>
                          <form onSubmit={handleCreateBanner} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <input
                                type="text"
                                className="admin-input"
                                placeholder="Headline (e.g. Eid Mega Offer 2026)"
                                value={bannerTitleEn}
                                onChange={e => setBannerTitleEn(e.target.value)}
                                required
                              />
                              <input
                                type="text"
                                className="admin-input"
                                placeholder="Subtitle (e.g. FLAT 30% OFF)"
                                value={bannerSubtitle}
                                onChange={e => setBannerSubtitle(e.target.value)}
                              />
                            </div>
                            <input
                              type="text"
                              className="admin-input"
                              placeholder="Link URL (e.g. /deals)"
                              value={bannerLink}
                              onChange={e => setBannerLink(e.target.value)}
                            />
                            <ImageUploader images={bannerImages} onChange={setBannerImages} />
                            <button
                              type="submit"
                              disabled={isCreatingBanner}
                              className="btn btn-primary btn-sm"
                              style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                            >
                              <Plus size={14} />
                              <span>{isCreatingBanner ? 'Publishing...' : 'Add Slide'}</span>
                            </button>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* TRUST BADGES BLOCK */}
                    {secKey === 'trust_badges' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                          Customize the 4 customer guarantees displayed directly below the hero banner.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                          <div style={{ background: 'var(--color-admin-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                            <label className="admin-label">Badge 1 (Shipping/Payment)</label>
                            <input
                              type="text"
                              className="admin-input"
                              value={settings.trust_badge_1_title}
                              onChange={e => updateSetting({ trust_badge_1_title: e.target.value })}
                              placeholder="Title"
                              style={{ marginBottom: '6px' }}
                            />
                            <input
                              type="text"
                              className="admin-input"
                              value={settings.trust_badge_1_desc}
                              onChange={e => updateSetting({ trust_badge_1_desc: e.target.value })}
                              placeholder="Subtitle"
                            />
                          </div>

                          <div style={{ background: 'var(--color-admin-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                            <label className="admin-label">Badge 2 (Delivery Speed)</label>
                            <input
                              type="text"
                              className="admin-input"
                              value={settings.trust_badge_2_title}
                              onChange={e => updateSetting({ trust_badge_2_title: e.target.value })}
                              placeholder="Title"
                              style={{ marginBottom: '6px' }}
                            />
                            <input
                              type="text"
                              className="admin-input"
                              value={settings.trust_badge_2_desc}
                              onChange={e => updateSetting({ trust_badge_2_desc: e.target.value })}
                              placeholder="Subtitle"
                            />
                          </div>

                          <div style={{ background: 'var(--color-admin-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                            <label className="admin-label">Badge 3 (Returns Guarantee)</label>
                            <input
                              type="text"
                              className="admin-input"
                              value={settings.trust_badge_3_title}
                              onChange={e => updateSetting({ trust_badge_3_title: e.target.value })}
                              placeholder="Title"
                              style={{ marginBottom: '6px' }}
                            />
                            <input
                              type="text"
                              className="admin-input"
                              value={settings.trust_badge_3_desc}
                              onChange={e => updateSetting({ trust_badge_3_desc: e.target.value })}
                              placeholder="Subtitle"
                            />
                          </div>

                          <div style={{ background: 'var(--color-admin-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                            <label className="admin-label">Badge 4 (Support Assistance)</label>
                            <input
                              type="text"
                              className="admin-input"
                              value={settings.trust_badge_4_title}
                              onChange={e => updateSetting({ trust_badge_4_title: e.target.value })}
                              placeholder="Title"
                              style={{ marginBottom: '6px' }}
                            />
                            <input
                              type="text"
                              className="admin-input"
                              value={settings.trust_badge_4_desc}
                              onChange={e => updateSetting({ trust_badge_4_desc: e.target.value })}
                              placeholder="Subtitle"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CATEGORIES BLOCK */}
                    {secKey === 'categories' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)' }}>
                          This section showcases top category department cards. To reorder which categories appear first, click the tab &quot;🗂️ Categories Sequence&quot; above or click below:
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('categories')}
                          className="btn btn-secondary btn-sm"
                          style={{ alignSelf: 'flex-start' }}
                        >
                          <span>Manage Category Sequence ➔</span>
                        </button>
                      </div>
                    )}

                    {/* FLASH SALE BLOCK */}
                    {secKey === 'flash_sale' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '540px' }}>
                        <div className="form-group">
                          <label className="admin-label">Flash Sale Section Heading</label>
                          <input
                            type="text"
                            className="admin-input"
                            value={settings.homepage_flash_sale_title}
                            onChange={e => updateSetting({ homepage_flash_sale_title: e.target.value })}
                            placeholder="e.g. ⚡ Flash Deals & Steals"
                          />
                        </div>

                        <div className="form-group">
                          <label className="admin-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Flash Sale Campaign End Time (Global Sync)</span>
                            <span style={{ fontSize: '11px', color: settings.homepage_flash_sale_end ? 'var(--color-primary-light)' : 'var(--color-success)' }}>
                              {settings.homepage_flash_sale_end ? '● Manual Fixed Target' : '● Auto Daily Midnight'}
                            </span>
                          </label>

                          <input
                            type="datetime-local"
                            className="admin-input"
                            value={
                              settings.homepage_flash_sale_end
                                ? (() => {
                                    try {
                                      const d = new Date(settings.homepage_flash_sale_end);
                                      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                    } catch {
                                      return '';
                                    }
                                  })()
                                : ''
                            }
                            onChange={e => {
                              const val = e.target.value;
                              if (!val) {
                                updateSetting({ homepage_flash_sale_end: null });
                              } else {
                                updateSetting({ homepage_flash_sale_end: new Date(val).toISOString() });
                              }
                            }}
                          />

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                              onClick={() => {
                                updateSetting({ homepage_flash_sale_end: null });
                                showToast('Set to Auto Daily Midnight (Zero Drift)', 'info');
                              }}
                            >
                              ⚡ Auto Daily Midnight
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                              onClick={() => {
                                const t = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
                                updateSetting({ homepage_flash_sale_end: t });
                                showToast('Set to +6 Hours from now', 'info');
                              }}
                            >
                              +6 Hours
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                              onClick={() => {
                                const t = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
                                updateSetting({ homepage_flash_sale_end: t });
                                showToast('Set to +12 Hours from now', 'info');
                              }}
                            >
                              +12 Hours
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                              onClick={() => {
                                const t = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
                                updateSetting({ homepage_flash_sale_end: t });
                                showToast('Set to +24 Hours from now', 'info');
                              }}
                            >
                              +24 Hours
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                              onClick={() => {
                                const t = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
                                updateSetting({ homepage_flash_sale_end: t });
                                showToast('Set to +48 Hours from now', 'info');
                              }}
                            >
                              +48 Hours
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                              onClick={() => {
                                const t = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
                                updateSetting({ homepage_flash_sale_end: t });
                                showToast('Set to +7 Days from now', 'info');
                              }}
                            >
                              +7 Days
                            </button>
                          </div>
                        </div>

                        <div style={{ background: 'var(--color-admin-surface-2)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--color-admin-muted)', lineHeight: '1.5' }}>
                          💡 <strong>Zero-Drift Synchronization:</strong> Both the Homepage and Deals page (<code style={{ color: 'var(--color-primary-light)' }}>/deals</code>) will synchronize to this exact timestamp. If set to Auto Daily Midnight, every visitor sees the same synchronized countdown ending at 23:59:59 Bangladesh Standard Time.
                        </div>
                      </div>
                    )}

                    {/* FEATURED PRODUCTS BLOCK */}
                    {secKey === 'featured' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '500px' }}>
                        <div className="form-group">
                          <label className="admin-label">Featured Products Section Heading</label>
                          <input
                            type="text"
                            className="admin-input"
                            value={settings.homepage_featured_title}
                            onChange={e => updateSetting({ homepage_featured_title: e.target.value })}
                            placeholder="e.g. ✨ Handpicked For You"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('products')}
                          className="btn btn-secondary btn-sm"
                          style={{ alignSelf: 'flex-start' }}
                        >
                          <span>Manage Featured Products Sequence ➔</span>
                        </button>
                      </div>
                    )}

                    {/* NEW ARRIVALS BLOCK */}
                    {secKey === 'new_arrivals' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '500px' }}>
                        <div className="form-group">
                          <label className="admin-label">New Arrivals Section Heading</label>
                          <input
                            type="text"
                            className="admin-input"
                            value={settings.homepage_new_arrivals_title}
                            onChange={e => updateSetting({ homepage_new_arrivals_title: e.target.value })}
                            placeholder="e.g. 🚀 New Arrivals / নতুন কালেকশন"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
         TAB 2: GLOBAL HEADER & ANNOUNCEMENT BAR
         ──────────────────────────────────────────────────────────── */}
      {activeTab === 'announcement' && (
        <div style={{ maxWidth: '640px' }}>
          <div className="admin-card">
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={18} color="var(--color-primary-light)" />
              <span>Global Announcement Bar (Top of Website)</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* ON/OFF Switch */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--color-admin-surface-2)', borderRadius: 'var(--radius-lg)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-admin-text)' }}>Show Top Announcement Bar</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>Displays on all customer pages at the top</div>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting({ announcement_bar_enabled: !settings.announcement_bar_enabled })}
                  className={`btn btn-sm ${settings.announcement_bar_enabled ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ height: '30px', padding: '4px 12px' }}
                >
                  {settings.announcement_bar_enabled ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
                </button>
              </div>

              <div className="form-group">
                <label className="admin-label">Announcement Message</label>
                <input
                  type="text"
                  className="admin-input"
                  value={settings.announcement_bar_text}
                  onChange={e => updateSetting({ announcement_bar_text: e.target.value })}
                  placeholder="e.g. ⚡ Mega Eid Offer: Cash on Delivery Nationwide & Free Shipping over ৳1,500!"
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Target Link URL (Optional)</label>
                <input
                  type="text"
                  className="admin-input"
                  value={settings.announcement_bar_link}
                  onChange={e => updateSetting({ announcement_bar_link: e.target.value })}
                  placeholder="/deals"
                />
              </div>

              {/* Support Contacts */}
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-admin-text)', marginTop: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={15} color="var(--color-success)" />
                <span>Store Helpline & WhatsApp</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="admin-label">Support Phone</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={settings.store_phone}
                    onChange={e => updateSetting({ store_phone: e.target.value })}
                    placeholder="+880 1700-000000"
                  />
                </div>
                <div className="form-group">
                  <label className="admin-label">WhatsApp Number</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={settings.store_whatsapp}
                    onChange={e => updateSetting({ store_whatsapp: e.target.value })}
                    placeholder="+880 1700-000000"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
         TAB 3: DEALS HUB (/deals)
         ──────────────────────────────────────────────────────────── */}
      {activeTab === 'deals' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          <div className="admin-card">
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#ef4444" />
              <span>Deals Hub Page Configuration</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="admin-label">Hero Badge Text</label>
                <input
                  type="text"
                  className="admin-input"
                  value={settings.deals_badge_text}
                  onChange={e => updateSetting({ deals_badge_text: e.target.value })}
                  placeholder="e.g. EXCLUSIVE FLASH PROMOTIONS"
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Hero Headline</label>
                <input
                  type="text"
                  className="admin-input"
                  value={settings.deals_hero_title}
                  onChange={e => updateSetting({ deals_hero_title: e.target.value })}
                  placeholder="e.g. 🔥 Super Flash Deals & Discounts"
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Hero Subtitle</label>
                <textarea
                  className="admin-input"
                  rows={2}
                  value={settings.deals_hero_subtitle}
                  onChange={e => updateSetting({ deals_hero_subtitle: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Live Daily Countdown Duration (Hours)</label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  className="admin-input"
                  value={settings.deals_timer_hours}
                  onChange={e => updateSetting({ deals_timer_hours: Number(e.target.value) || 6 })}
                />
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={18} color="var(--color-primary-light)" />
              <span>Claimable Vouchers & Coupons ({couponCount} Active)</span>
            </h2>

            <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
              Active discount promo codes in your database appear automatically as claimable 1-tap voucher cards on the Deals page.
            </p>

            <Link
              href="/admin/coupons"
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
            >
              <Tag size={16} />
              <span>Open Coupon Manager (Product Scope, ON/OFF) ➔</span>
            </Link>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
         TAB 4: EXPLORE PAGE
         ──────────────────────────────────────────────────────────── */}
      {activeTab === 'explore' && (
        <div style={{ maxWidth: '640px' }}>
          <div className="admin-card">
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color="var(--color-primary-light)" />
              <span>Explore Catalog & Trending Search Tags</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="admin-label">Page Title</label>
                <input
                  type="text"
                  className="admin-input"
                  value={settings.explore_title}
                  onChange={e => updateSetting({ explore_title: e.target.value })}
                  placeholder="e.g. Explore Catalog"
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Departments Showcase Heading</label>
                <input
                  type="text"
                  className="admin-input"
                  value={settings.explore_departments_title}
                  onChange={e => updateSetting({ explore_departments_title: e.target.value })}
                  placeholder="e.g. Explore Departments"
                />
              </div>

              {/* Tag Chips Manager */}
              <div className="form-group">
                <label className="admin-label">Trending Search Keywords</label>
                <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginBottom: '8px' }}>
                  Shoppers tap these quick-filter chips on the Explore page.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px', minHeight: '38px', padding: '10px', background: 'var(--color-admin-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-admin-border)' }}>
                  {currentTags.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>No tags added yet.</span>
                  ) : (
                    currentTags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'var(--color-primary-10)',
                          color: 'var(--color-primary-light)',
                          border: '1px solid var(--color-primary)',
                          borderRadius: 'var(--radius-full)',
                          padding: '3px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Type tag and press Add (e.g. Smartwatch)..."
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0, padding: '0 16px' }}
                  >
                    + Add Tag
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
         TAB 5: CATEGORIES DISPLAY SEQUENCE & VISIBILITY
         ──────────────────────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div style={{ maxWidth: '780px' }}>
          <div className="admin-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={20} color="var(--color-primary)" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                    Categories Manager & Visibility
                  </h2>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                  Add new store categories, toggle visibility (Hide / Show) on storefront navigation, and reorder sequence.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddCategoryModal(true)}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <Plus size={16} />
                <span>+ Add New Category</span>
              </button>
            </div>

            {/* Category Search & Counter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="admin-input"
                placeholder="Filter categories..."
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                style={{ height: '36px', fontSize: '13px', maxWidth: '300px' }}
              />
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>
                {categories.length} Categories ({categories.filter(c => c.is_active).length} Visible, {categories.filter(c => !c.is_active).length} Hidden)
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {categories
                .filter(c => !categorySearch.trim() || c.name_en.toLowerCase().includes(categorySearch.toLowerCase()) || (c.name_bn && c.name_bn.toLowerCase().includes(categorySearch.toLowerCase())))
                .map((cat, idx) => (
                <div
                  key={cat.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--color-admin-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    opacity: cat.is_active ? 1 : 0.65,
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', minWidth: '24px' }}>
                      #{idx + 1}
                    </span>
                    {cat.image_url ? (
                      <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-admin-border)' }}>
                        <Image src={cat.image_url} alt={cat.name_en} fill style={{ objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--color-admin-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-admin-muted)' }}>
                        <Layers size={18} />
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: 'var(--color-admin-text)', fontSize: '14px' }}>{cat.name_en}</strong>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-full)',
                            background: cat.is_active ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: cat.is_active ? 'var(--color-success)' : 'var(--color-danger)',
                            border: `1px solid ${cat.is_active ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          }}
                        >
                          {cat.is_active ? 'VISIBLE' : 'HIDDEN'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                        Slug: /{cat.slug} {cat.name_bn ? `• ${cat.name_bn}` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Hide / Show 1-Click Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleCategoryActive(cat)}
                      className="btn btn-sm"
                      style={{
                        padding: '4px 10px',
                        height: '30px',
                        fontSize: '11px',
                        fontWeight: 800,
                        borderRadius: 'var(--radius-md)',
                        background: cat.is_active ? '#ffffff' : 'var(--color-primary)',
                        color: cat.is_active ? 'var(--color-danger)' : '#ffffff',
                        border: `1px solid ${cat.is_active ? 'rgba(239, 68, 68, 0.4)' : 'var(--color-primary)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                      }}
                      title={cat.is_active ? 'Click to HIDE this category from storefront' : 'Click to SHOW this category in storefront'}
                    >
                      {cat.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{cat.is_active ? 'Hide' : 'Show'}</span>
                    </button>

                    {/* Reorder Arrows */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveCategory(idx, 'up')}
                      style={{
                        background: idx === 0 ? 'var(--color-admin-surface-2)' : '#ffffff',
                        border: '1px solid var(--color-admin-border)',
                        color: idx === 0 ? '#cbd5e1' : 'var(--color-admin-text)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-md)',
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '30px',
                      }}
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === categories.length - 1}
                      onClick={() => handleMoveCategory(idx, 'down')}
                      style={{
                        background: idx === categories.length - 1 ? 'var(--color-admin-surface-2)' : '#ffffff',
                        border: '1px solid var(--color-admin-border)',
                        color: idx === categories.length - 1 ? '#cbd5e1' : 'var(--color-admin-text)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-md)',
                        cursor: idx === categories.length - 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '30px',
                      }}
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>

                    {/* Delete Category */}
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id, cat.name_en)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--color-admin-border)',
                        color: 'var(--color-danger)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '30px',
                      }}
                      title="Delete Category"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
         TAB 6: PRODUCTS DISPLAY SEQUENCE & VISIBILITY
         ──────────────────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <div style={{ maxWidth: '780px' }}>
          <div className="admin-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={20} color="var(--color-primary)" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                    Products Manager & Sequence
                  </h2>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                  Toggle product visibility (Hide / Show) and reorder which products appear first on storefront.
                </p>
              </div>

              <Link
                href="/admin/products/new"
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <Plus size={16} />
                <span>+ Add New Product</span>
              </Link>
            </div>

            {/* Product Search & Counters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="admin-input"
                placeholder="Search products..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                style={{ height: '36px', fontSize: '13px', maxWidth: '300px' }}
              />
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>
                {filteredProducts.length} Products ({filteredProducts.filter(p => p.is_active).length} Visible, {filteredProducts.filter(p => !p.is_active).length} Hidden)
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '560px', overflowY: 'auto' }}>
              {filteredProducts.map((p, idx) => (
                <div
                  key={p.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--color-admin-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    opacity: p.is_active ? 1 : 0.65,
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', minWidth: '24px' }}>
                      #{idx + 1}
                    </span>
                    {p.images?.[0] && (
                      <div style={{ position: 'relative', width: '38px', height: '38px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-admin-border)' }}>
                        <Image src={getOptimizedImageUrl(p.images[0], 'thumb')} alt={p.name_en} fill style={{ objectFit: 'cover' }} />
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: 'var(--color-admin-text)', fontSize: '13px' }}>{p.name_en}</strong>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-full)',
                            background: p.is_active ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: p.is_active ? 'var(--color-success)' : 'var(--color-danger)',
                            border: `1px solid ${p.is_active ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          }}
                        >
                          {p.is_active ? 'VISIBLE' : 'HIDDEN'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                        ৳{p.sale_price ?? p.base_price} {p.is_flash_sale ? '• ⚡ Flash' : ''} {p.is_featured ? '• ⭐ Featured' : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Hide / Show 1-Click Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleProductActive(p)}
                      className="btn btn-sm"
                      style={{
                        padding: '4px 10px',
                        height: '30px',
                        fontSize: '11px',
                        fontWeight: 800,
                        borderRadius: 'var(--radius-md)',
                        background: p.is_active ? '#ffffff' : 'var(--color-primary)',
                        color: p.is_active ? 'var(--color-danger)' : '#ffffff',
                        border: `1px solid ${p.is_active ? 'rgba(239, 68, 68, 0.4)' : 'var(--color-primary)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                      }}
                      title={p.is_active ? 'Click to HIDE product from storefront' : 'Click to SHOW product on storefront'}
                    >
                      {p.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{p.is_active ? 'Hide' : 'Show'}</span>
                    </button>

                    {/* Reorder Arrows */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveProduct(idx, 'up')}
                      style={{
                        background: idx === 0 ? 'var(--color-admin-surface-2)' : '#ffffff',
                        border: '1px solid var(--color-admin-border)',
                        color: idx === 0 ? '#cbd5e1' : 'var(--color-admin-text)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-md)',
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '30px',
                      }}
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === filteredProducts.length - 1}
                      onClick={() => handleMoveProduct(idx, 'down')}
                      style={{
                        background: idx === filteredProducts.length - 1 ? 'var(--color-admin-surface-2)' : '#ffffff',
                        border: '1px solid var(--color-admin-border)',
                        color: idx === filteredProducts.length - 1 ? '#cbd5e1' : 'var(--color-admin-text)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-md)',
                        cursor: idx === filteredProducts.length - 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '30px',
                      }}
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
      )}

      {/* ────────────────────────────────────────────────────────────
         EDIT SLIDE MODAL
         ──────────────────────────────────────────────────────────── */}
      {editingBanner && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '16px',
          }}
        >
          <div
            className="admin-card"
            style={{
              maxWidth: '480px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid var(--color-admin-border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                Edit Hero Slide
              </h2>
              <button
                type="button"
                onClick={() => setEditingBanner(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-admin-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSlide} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="admin-label">Headline Title</label>
                <input
                  type="text"
                  className="admin-input"
                  value={editSlideTitle}
                  onChange={e => setEditSlideTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Badge / Subtitle</label>
                <input
                  type="text"
                  className="admin-input"
                  value={editSlideSubtitle}
                  onChange={e => setEditSlideSubtitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Button Target Link</label>
                <input
                  type="text"
                  className="admin-input"
                  value={editSlideLink}
                  onChange={e => setEditSlideLink(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Slide Image</label>
                <ImageUploader images={editSlideImages} onChange={setEditSlideImages} />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingBanner(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSlide}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {isUpdatingSlide ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
         ADD CATEGORY MODAL
         ──────────────────────────────────────────────────────────── */}
      {showAddCategoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setShowAddCategoryModal(false)}
        >
          <div
            className="admin-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="var(--color-primary)" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                  Create New Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-admin-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="admin-label">Category Name (English) *</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Smart Watches & Wearables"
                  value={newCatNameEn}
                  onChange={e => setNewCatNameEn(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Category Name (Bangla / Optional)</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. স্মার্ট ওয়াচ"
                  value={newCatNameBn}
                  onChange={e => setNewCatNameBn(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Custom Slug (Optional)</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Leave empty for auto-generated slug"
                  value={newCatSlug}
                  onChange={e => setNewCatSlug(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Category Thumbnail Image URL (Optional)</label>
                <input
                  type="url"
                  className="admin-input"
                  placeholder="https://images.unsplash.com/..."
                  value={newCatImage}
                  onChange={e => setNewCatImage(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCategory}
                  className="btn btn-primary"
                  style={{ flex: 1, fontWeight: 700 }}
                >
                  {isCreatingCategory ? 'Creating Category...' : 'Save & Publish Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
