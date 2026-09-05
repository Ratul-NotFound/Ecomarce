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
import type { SpecialOffer, Category, Product, Coupon } from '@/types';
import {
  DEFAULT_STOREFRONT_SETTINGS,
  DEFAULT_HOMEPAGE_SECTIONS,
  type StorefrontCustomSettings,
} from '@/lib/store-settings-shared';

interface ExtendedCoupon extends Coupon {
  applicable_product_ids?: string[];
  show_on_deals_page?: boolean;
}

const SECTION_METADATA: Record<string, { name: string; desc: string; icon: string }> = {
  hero: { name: 'Hero Carousel Banner', desc: 'Promotional slides, headlines, and call-to-actions', icon: '🎠' },
  trust_badges: { name: 'Customer Trust Badges', desc: 'Guarantees: 100% Authentic, fast shipping, quality assurance', icon: '🛡️' },
  categories: { name: 'Explore Categories Grid', desc: 'Department cards for visual category navigation', icon: '🗂️' },
  flash_sale: { name: 'Flash Sale Showcase', desc: 'Time-limited flash deals with urgent countdown timer', icon: '⚡' },
  featured: { name: 'Featured Products Showcase', desc: 'Curated handpicked top products for customers', icon: '⭐' },
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
  const [coupons, setCoupons] = useState<ExtendedCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponCount, setCouponCount] = useState(0);

  // New Slide Form State (Homepage Hero)
  const [bannerTitleEn, setBannerTitleEn] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('🔥 SPECIAL OFFER');
  const [bannerLink, setBannerLink] = useState('/search');
  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);

  // Deals Page Hero Promotional Banners State
  const [dealsBannerTitleEn, setDealsBannerTitleEn] = useState('');
  const [dealsBannerSubtitle, setDealsBannerSubtitle] = useState('🔥 EXCLUSIVE FLASH DEAL');
  const [dealsBannerLink, setDealsBannerLink] = useState('/deals');
  const [dealsBannerImages, setDealsBannerImages] = useState<string[]>([]);
  const [isCreatingDealsBanner, setIsCreatingDealsBanner] = useState(false);

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
        fetch('/api/admin/coupons').then(r => r.json()),
        fetch('/api/admin/settings').then(r => r.json()),
      ]);

      if (bannersRes.data) setBanners(bannersRes.data as SpecialOffer[]);
      if (catsRes.data) setCategories(catsRes.data as Category[]);
      if (prodsRes.data) setProducts(prodsRes.data as Product[]);
      if (couponsRes?.coupons) {
        setCoupons(couponsRes.coupons);
        setCouponCount(couponsRes.coupons.filter((c: any) => c.is_active).length);
      }

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

  // Create Deals Banner
  const handleCreateDealsBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealsBannerTitleEn.trim()) {
      showToast('Banner headline is required', 'error');
      return;
    }

    try {
      setIsCreatingDealsBanner(true);
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_en: dealsBannerTitleEn.trim(),
          subtitle: dealsBannerSubtitle.trim() || null,
          link_url: dealsBannerLink.trim() || '/deals',
          image_url: dealsBannerImages[0] || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80',
          type: 'deals_banner',
          display_order: banners.filter(b => b.type === 'deals_banner').length + 1,
          is_active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('Deals banner published!', 'success');
      setBanners(prev => [...prev, data.banner]);
      setDealsBannerTitleEn('');
      setDealsBannerImages([]);
    } catch (err: any) {
      showToast(err.message || 'Error creating deals banner', 'error');
    } finally {
      setIsCreatingDealsBanner(false);
    }
  };

  // Reorder Deals Banners
  const handleMoveDealsBanner = async (bannerId: string, direction: 'up' | 'down') => {
    const dealsList = banners.filter(b => b.type === 'deals_banner');
    const idx = dealsList.findIndex(b => b.id === bannerId);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= dealsList.length) return;

    const reordered = [...dealsList];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    const otherBanners = banners.filter(b => b.type !== 'deals_banner');
    const updatedBanners = [...otherBanners, ...reordered.map((b, i) => ({ ...b, display_order: i + 1 }))];
    setBanners(updatedBanners);

    try {
      const supabase = createClient();
      for (let i = 0; i < reordered.length; i++) {
        await supabase.from('special_offers').update({ display_order: i + 1 }).eq('id', reordered[i].id);
      }
      showToast('Deals banner sequence updated!', 'success');
    } catch {
      showToast('Failed to reorder deals banners', 'error');
    }
  };

  // Toggle Deals Banner Active
  const handleToggleDealsBannerActive = async (banner: SpecialOffer) => {
    try {
      const updatedStatus = !banner.is_active;
      const res = await fetch('/api/admin/banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: banner.id, is_active: updatedStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBanners(prev => prev.map(b => (b.id === banner.id ? { ...b, is_active: updatedStatus } : b)));
      showToast(`Deals banner ${updatedStatus ? 'activated (ON)' : 'deactivated (OFF)'}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to update banner', 'error');
    }
  };

  // Toggle Coupon Deals Shelf Visibility
  const handleToggleCouponDealsVisibility = async (coupon: ExtendedCoupon) => {
    try {
      const nextVis = coupon.show_on_deals_page === false ? true : false;
      const res = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: coupon.id,
          code: coupon.code,
          show_on_deals_page: nextVis,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCoupons(prev => prev.map(c => (c.id === coupon.id ? { ...c, show_on_deals_page: nextVis } : c)));
      showToast(`Coupon "${coupon.code}" ${nextVis ? 'is now visible on Deals page (ON)' : 'is now hidden from Deals page (OFF)'}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to update visibility', 'error');
    }
  };

  // Toggle Coupon Active Status
  const handleToggleCouponActive = async (coupon: ExtendedCoupon) => {
    try {
      const nextStatus = !coupon.is_active;
      const res = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: coupon.id,
          code: coupon.code,
          is_active: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCoupons(prev => prev.map(c => (c.id === coupon.id ? { ...c, is_active: nextStatus } : c)));
      setCouponCount(prev => (nextStatus ? prev + 1 : Math.max(0, prev - 1)));
      showToast(`Coupon "${coupon.code}" ${nextStatus ? 'activated (ON)' : 'deactivated (OFF)'}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to update coupon status', 'error');
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

  const selectSectionAndScroll = (secKey: string) => {
    setExpandedSection(secKey);
    setTimeout(() => {
      const studioEl = document.getElementById('customizer-editor-studio');
      if (studioEl) {
        studioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 40);
  };

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
         MAIN NAVIGATION TABS (TOUCH OPTIMIZED, ZERO CLUNKY SCROLLBAR)
         ──────────────────────────────────────────────────────────── */}
      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '1px solid var(--color-admin-border)',
          paddingBottom: '14px',
          marginBottom: '24px',
          overflowX: 'auto',
          alignItems: 'center',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {[
          { id: 'homepage' as const, label: 'Homepage Builder', icon: Layout, count: `${settings.homepage_sections_order.length} Blocks` },
          { id: 'announcement' as const, label: 'Header & Announcement', icon: Megaphone, count: settings.announcement_bar_enabled ? 'Active' : 'Muted' },
          { id: 'deals' as const, label: 'Deals Hub', icon: Zap, count: `${banners.filter(b => b.type === 'deals_banner').length} Banners` },
          { id: 'explore' as const, label: 'Explore & Search Hub', icon: Compass, count: `${currentTags.length} Tags` },
          { id: 'categories' as const, label: 'Categories Sequence', icon: Layers, count: `${categories.length} Items` },
          { id: 'products' as const, label: 'Products Sequence', icon: Package, count: `${products.length} Items` },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="btn btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: 'var(--radius-full)',
                whiteSpace: 'nowrap',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                background: isActive ? 'var(--color-primary)' : '#ffffff',
                color: isActive ? '#ffffff' : 'var(--color-admin-text)',
                border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-admin-border)'}`,
                boxShadow: isActive ? '0 4px 12px var(--color-primary-20)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                transition: 'all var(--transition-fast)',
                flexShrink: 0,
              }}
            >
              <Icon size={16} color={isActive ? '#ffffff' : 'var(--color-primary)'} />
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-full)',
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--color-admin-surface-2)',
                  color: isActive ? '#ffffff' : 'var(--color-admin-muted)',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────────
         TAB 1: HOMEPAGE MODULAR SECTION BUILDER (SQUARE MATRIX & STUDIO)
         ──────────────────────────────────────────────────────────── */}
      {activeTab === 'homepage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Instruction & Blueprint Bar */}
          <div
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, var(--color-admin-surface-2) 100%)',
              padding: '14px 18px',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-admin-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={18} color="var(--color-primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                  Homepage Modular Blueprint (6 Section Blocks)
                </h3>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                Tap any square block to instantly jump to its settings studio below. Reorder with ↑ / ↓ arrows.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link
                href="/"
                target="_blank"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <ExternalLink size={14} />
                <span>Preview Storefront</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset homepage sections to standard default order?')) {
                    updateSetting({
                      homepage_sections_order: DEFAULT_HOMEPAGE_SECTIONS,
                      homepage_section_visibility: {
                        hero: true,
                        trust_badges: true,
                        categories: true,
                        flash_sale: true,
                        featured: true,
                        new_arrivals: true,
                      },
                    });
                    showToast('Reset to default section layout', 'info');
                  }
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}
              >
                ↺ Reset Default
              </button>
            </div>
          </div>

          {/* Sleek Horizontal Sequence Pipeline */}
          <div className="customizer-pipeline-grid">
            {settings.homepage_sections_order.map((secKey, idx) => {
              const meta = SECTION_METADATA[secKey] || { name: secKey, desc: '', icon: '📦' };
              const isVisible = settings.homepage_section_visibility?.[secKey] !== false;
              const isSelected = expandedSection === secKey;

              return (
                <div
                  key={secKey}
                  className={`customizer-pipeline-pill ${isSelected ? 'customizer-pipeline-pill--selected' : ''} ${!isVisible ? 'customizer-pipeline-pill--inactive' : ''}`}
                  onClick={() => selectSectionAndScroll(secKey)}
                >
                  {/* Top Row: Position & Reorder Arrows */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        color: isSelected ? '#ffffff' : isVisible ? 'var(--color-primary)' : 'var(--color-admin-muted)',
                        background: isSelected ? 'var(--color-primary)' : isVisible ? 'var(--color-primary-10)' : 'var(--color-admin-surface-2)',
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      #{idx + 1}
                    </span>

                    {/* Left / Right Shift Arrows */}
                    <div style={{ display: 'flex', gap: '3px' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSection(idx, 'up')}
                        className="customizer-pipeline-arrow-btn"
                        title="Move Left / Up"
                      >
                        <ArrowUp size={11} style={{ transform: 'rotate(-90deg)' }} />
                      </button>

                      <button
                        type="button"
                        disabled={idx === settings.homepage_sections_order.length - 1}
                        onClick={() => handleMoveSection(idx, 'down')}
                        className="customizer-pipeline-arrow-btn"
                        title="Move Right / Down"
                      >
                        <ArrowDown size={11} style={{ transform: 'rotate(-90deg)' }} />
                      </button>
                    </div>
                  </div>

                  {/* Center Visual: Icon & Clean Title */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '4px 0', gap: '4px' }}>
                    <span style={{ fontSize: '24px', lineHeight: 1 }}>{meta.icon}</span>
                    <strong style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--color-admin-text)', lineHeight: 1.25 }}>
                      {meta.name.replace(' Showcase', '').replace(' Carousel', '').replace(' Grid', '')}
                    </strong>
                  </div>

                  {/* Bottom Row: Quick Visibility Toggle & Edit State */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      paddingTop: '6px',
                      borderTop: '1px solid var(--color-admin-border)',
                      gap: '4px',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSectionVisibility(secKey)}
                      style={{
                        background: isVisible ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: isVisible ? 'var(--color-success)' : 'var(--color-danger)',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        cursor: 'pointer',
                      }}
                      title={isVisible ? 'Click to Hide Section' : 'Click to Show Section'}
                    >
                      {isVisible ? '● Active' : '○ Hidden'}
                    </button>

                    <button
                      type="button"
                      onClick={() => selectSectionAndScroll(secKey)}
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '2px 8px', height: '22px', fontSize: '10px', fontWeight: 800, borderRadius: 'var(--radius-md)' }}
                    >
                      {isSelected ? 'Editing' : 'Edit ➔'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dedicated Focused Section Editor Studio Canvas */}
          {expandedSection && (
            <div
              id="customizer-editor-studio"
              className="admin-card"
              style={{
                padding: '24px',
                background: '#ffffff',
                borderRadius: 'var(--radius-xl)',
                border: '1.5px solid var(--color-primary)',
                boxShadow: '0 8px 30px rgba(37, 99, 235, 0.08)',
                marginTop: '4px',
                scrollMarginTop: '20px',
              }}
            >
              {/* Studio Canvas Header */}
              {(() => {
                const secMeta = SECTION_METADATA[expandedSection] || { name: expandedSection, desc: '', icon: '📦' };
                const secIdx = settings.homepage_sections_order.indexOf(expandedSection);
                const isSecVisible = settings.homepage_section_visibility?.[expandedSection] !== false;

                return (
                  <div
                    style={{
                      marginBottom: '20px',
                      paddingBottom: '16px',
                      borderBottom: '1px solid var(--color-admin-border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '26px' }}>{secMeta.icon}</span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                              {secMeta.name} — Studio Editor
                            </h2>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--color-primary-10)',
                                color: 'var(--color-primary)',
                              }}
                            >
                              Position #{secIdx + 1}
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                            {secMeta.desc}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleSectionVisibility(expandedSection)}
                          className={`btn btn-sm ${isSecVisible ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ fontWeight: 700 }}
                        >
                          {isSecVisible ? 'Section is Visible (Turn OFF)' : 'Section is Hidden (Turn ON)'}
                        </button>
                      </div>
                    </div>

                    {/* Quick Section Switcher Bar (1-Click Switch Without Scrolling) */}
                    <div
                      className="customizer-studio-pills"
                      style={{
                        marginTop: '14px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--color-admin-border)',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-admin-muted)', whiteSpace: 'nowrap', marginRight: '4px' }}>
                        Switch Section:
                      </span>
                      {settings.homepage_sections_order.map((sec, i) => {
                        const m = SECTION_METADATA[sec] || { name: sec, icon: '📦' };
                        const isAct = expandedSection === sec;
                        return (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => selectSectionAndScroll(sec)}
                            className="btn btn-sm"
                            style={{
                              padding: '4px 10px',
                              fontSize: '11.5px',
                              fontWeight: isAct ? 800 : 600,
                              borderRadius: 'var(--radius-full)',
                              background: isAct ? 'var(--color-primary)' : 'var(--color-admin-surface-2)',
                              color: isAct ? '#ffffff' : 'var(--color-admin-text)',
                              border: `1px solid ${isAct ? 'var(--color-primary)' : 'var(--color-admin-border)'}`,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            <span>#{i + 1} {m.icon} {m.name.split(' ')[0]}</span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--radius-full)', flexShrink: 0, marginLeft: 'auto' }}
                      >
                        ↑ Top Grid
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ────────────────────────────────────────────────────────────
                 HERO CAROUSEL BLOCK
                 ──────────────────────────────────────────────────────────── */}
              {expandedSection === 'hero' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                      Active Hero Slides ({banners.filter(b => b.type === 'hero_banner' || !b.type).length})
                    </h3>
                  </div>

                  {/* Existing Slides Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                    {banners.filter(b => b.type === 'hero_banner' || !b.type).map(b => (
                      <div
                        key={b.id}
                        style={{
                          background: 'var(--color-admin-surface-2)',
                          border: '1px solid var(--color-admin-border)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '12px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          {b.image_url && (
                            <div style={{ position: 'relative', width: '64px', height: '42px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: '#f1f5f9' }}>
                              <Image src={b.image_url} alt={b.title_en} fill style={{ objectFit: 'cover' }} />
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ fontSize: '13px', color: 'var(--color-admin-text)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {b.title_en}
                            </strong>
                            <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                              {b.subtitle || 'No subtitle'} • {b.link_url}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleToggleSlideActive(b)}
                            className={`btn btn-sm ${b.is_active ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ fontSize: '11px', padding: '2px 8px', height: '26px' }}
                          >
                            {b.is_active ? 'Active' : 'Off'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditSlideModal(b)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', padding: '4px', cursor: 'pointer' }}
                            title="Edit Slide"
                          >
                            <Edit3 size={14} />
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

                  {/* Add New Slide Form */}
                  <div style={{ background: 'var(--color-admin-surface-2)', padding: '18px', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-admin-border)', marginTop: '8px' }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '12px' }}>
                      + Add New Slide to Hero Carousel
                    </h4>
                    <form onSubmit={handleCreateBanner} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                        <div>
                          <label className="admin-label">Slide Headline Title *</label>
                          <input
                            type="text"
                            className="admin-input"
                            placeholder="e.g. Eid Mega Offer 2026"
                            value={bannerTitleEn}
                            onChange={e => setBannerTitleEn(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="admin-label">Subtitle / Discount Pill</label>
                          <input
                            type="text"
                            className="admin-input"
                            placeholder="e.g. FLAT 30% OFF ALL ITEMS"
                            value={bannerSubtitle}
                            onChange={e => setBannerSubtitle(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="admin-label">Call-to-Action Target Link</label>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="e.g. /deals or /search?category=electronics"
                          value={bannerLink}
                          onChange={e => setBannerLink(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="admin-label">Slide Banner Image</label>
                        <ImageUploader images={bannerImages} onChange={setBannerImages} />
                      </div>

                      <button
                        type="submit"
                        disabled={isCreatingBanner}
                        className="btn btn-primary btn-sm"
                        style={{ alignSelf: 'flex-start', marginTop: '4px', fontWeight: 700 }}
                      >
                        <Plus size={14} />
                        <span>{isCreatingBanner ? 'Publishing Slide...' : 'Add Slide to Hero'}</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────────
                 TRUST BADGES BLOCK
                 ──────────────────────────────────────────────────────────── */}
              {expandedSection === 'trust_badges' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-admin-muted)' }}>
                    Customize the 4 customer guarantees displayed directly below the hero banner.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    <div style={{ background: 'var(--color-admin-surface-2)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                      <label className="admin-label">Badge 1 (Authenticity Guarantee)</label>
                      <input
                        type="text"
                        className="admin-input"
                        value={settings.trust_badge_1_title}
                        onChange={e => updateSetting({ trust_badge_1_title: e.target.value })}
                        placeholder="Title"
                        style={{ marginBottom: '8px' }}
                      />
                      <input
                        type="text"
                        className="admin-input"
                        value={settings.trust_badge_1_desc}
                        onChange={e => updateSetting({ trust_badge_1_desc: e.target.value })}
                        placeholder="Subtitle"
                      />
                    </div>

                    <div style={{ background: 'var(--color-admin-surface-2)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                      <label className="admin-label">Badge 2 (Delivery Speed Guarantee)</label>
                      <input
                        type="text"
                        className="admin-input"
                        value={settings.trust_badge_2_title}
                        onChange={e => updateSetting({ trust_badge_2_title: e.target.value })}
                        placeholder="Title"
                        style={{ marginBottom: '8px' }}
                      />
                      <input
                        type="text"
                        className="admin-input"
                        value={settings.trust_badge_2_desc}
                        onChange={e => updateSetting({ trust_badge_2_desc: e.target.value })}
                        placeholder="Subtitle"
                      />
                    </div>

                    <div style={{ background: 'var(--color-admin-surface-2)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                      <label className="admin-label">Badge 3 (Quality & Defect Replacement)</label>
                      <input
                        type="text"
                        className="admin-input"
                        value={settings.trust_badge_3_title}
                        onChange={e => updateSetting({ trust_badge_3_title: e.target.value })}
                        placeholder="Title"
                        style={{ marginBottom: '8px' }}
                      />
                      <input
                        type="text"
                        className="admin-input"
                        value={settings.trust_badge_3_desc}
                        onChange={e => updateSetting({ trust_badge_3_desc: e.target.value })}
                        placeholder="Subtitle"
                      />
                    </div>

                    <div style={{ background: 'var(--color-admin-surface-2)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                      <label className="admin-label">Badge 4 (Customer Support Assistance)</label>
                      <input
                        type="text"
                        className="admin-input"
                        value={settings.trust_badge_4_title}
                        onChange={e => updateSetting({ trust_badge_4_title: e.target.value })}
                        placeholder="Title"
                        style={{ marginBottom: '8px' }}
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

              {/* ────────────────────────────────────────────────────────────
                 CATEGORIES BLOCK
                 ──────────────────────────────────────────────────────────── */}
              {expandedSection === 'categories' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)' }}>
                    This section showcases top department cards on your homepage. You have <strong>{categories.length} categories</strong> in your store.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('categories')}
                    className="btn btn-primary btn-sm"
                    style={{ alignSelf: 'flex-start', fontWeight: 700 }}
                  >
                    <span>Open Categories Sequence Studio ➔</span>
                  </button>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────────
                 FLASH SALE BLOCK
                 ──────────────────────────────────────────────────────────── */}
              {expandedSection === 'flash_sale' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
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
                        {settings.homepage_flash_sale_end ? '● Manual Target Active' : '● Auto Daily Midnight'}
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
                        const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                        updateSetting({ homepage_flash_sale_end: val });
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const midnight = new Date();
                          midnight.setHours(23, 59, 59, 999);
                          updateSetting({ homepage_flash_sale_end: midnight.toISOString() });
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px' }}
                      >
                        Set to Today Midnight
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSetting({ homepage_flash_sale_end: null })}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}
                      >
                        Clear (Use Default Daily Loop)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────────
                 FEATURED PRODUCTS BLOCK
                 ──────────────────────────────────────────────────────────── */}
              {expandedSection === 'featured' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                  <div className="form-group">
                    <label className="admin-label">Featured Showcase Title</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={settings.homepage_featured_title}
                      onChange={e => updateSetting({ homepage_featured_title: e.target.value })}
                      placeholder="e.g. ⭐ Featured Handpicked Products"
                    />
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)' }}>
                    Products marked as <code>is_featured = true</code> or top items in your inventory catalog will be displayed here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className="btn btn-primary btn-sm"
                    style={{ alignSelf: 'flex-start', fontWeight: 700 }}
                  >
                    <span>Manage Products Sequence ➔</span>
                  </button>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────────
                 NEW ARRIVALS BLOCK
                 ──────────────────────────────────────────────────────────── */}
              {expandedSection === 'new_arrivals' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                  <div className="form-group">
                    <label className="admin-label">New Arrivals Showcase Title</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={settings.homepage_new_arrivals_title}
                      onChange={e => updateSetting({ homepage_new_arrivals_title: e.target.value })}
                      placeholder="e.g. 🚀 Brand New Arrivals"
                    />
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)' }}>
                    Displays the newest products added to your catalog sorted dynamically by creation date.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className="btn btn-primary btn-sm"
                    style={{ alignSelf: 'flex-start', fontWeight: 700 }}
                  >
                    <span>View Product Catalog ➔</span>
                  </button>
                </div>
              )}
            </div>
          )}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px' }}>
          {/* Top Notice Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 158, 11, 0.08) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-xl)',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} color="#ef4444" />
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                  Deals Hub Customizer & Live Controls
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                Customize promotional banner slides, countdown duration, and live coupon vouchers displayed on the /deals page.
              </p>
            </div>

            <Link
              href="/deals"
              target="_blank"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <ExternalLink size={14} />
              <span>Preview /deals Page</span>
            </Link>
          </div>

          {/* 1. DEALS HERO PROMOTIONAL BANNERS CAROUSEL CRUD */}
          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ImageIcon size={18} color="var(--color-primary)" />
                  <span>Deals Hero Banner Slides ({banners.filter(b => b.type === 'deals_banner').length})</span>
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '3px' }}>
                  Promotional banners showcased at the top of /deals. If none are added, the default hero card is rendered.
                </p>
              </div>
            </div>

            {/* List Existing Deals Banners */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {banners.filter(b => b.type === 'deals_banner').length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    background: 'var(--color-admin-surface-2)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px dashed var(--color-admin-border)',
                  }}
                >
                  <ImageIcon size={32} style={{ margin: '0 auto 8px', color: 'var(--color-admin-muted)', opacity: 0.6 }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-text)' }}>
                    No custom deals banners published yet
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                    The /deals page is currently rendering the default title card. Add a banner below to activate the promotional carousel!
                  </div>
                </div>
              ) : (
                banners
                  .filter(b => b.type === 'deals_banner')
                  .map((b, idx, arr) => (
                    <div
                      key={b.id}
                      style={{
                        background: 'var(--color-admin-surface-2)',
                        border: '1px solid var(--color-admin-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary-light)', minWidth: '24px' }}>
                          #{idx + 1}
                        </span>

                        {b.image_url && (
                          <div
                            style={{
                              position: 'relative',
                              width: '72px',
                              height: '46px',
                              borderRadius: 'var(--radius-md)',
                              overflow: 'hidden',
                              flexShrink: 0,
                              background: '#0f172a',
                            }}
                          >
                            <Image src={b.image_url} alt={b.title_en} fill style={{ objectFit: 'cover' }} />
                          </div>
                        )}

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '14px', color: 'var(--color-admin-text)' }}>{b.title_en}</strong>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: 'var(--radius-full)',
                                background: b.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: b.is_active ? 'var(--color-success)' : 'var(--color-danger)',
                              }}
                            >
                              {b.is_active ? 'ACTIVE' : 'OFF'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                            {b.subtitle || 'No Subtitle'} • Link: <span style={{ color: 'var(--color-primary-light)' }}>{b.link_url || '/deals'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* ON / OFF Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleDealsBannerActive(b)}
                          className={`btn btn-sm ${b.is_active ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '4px 10px', height: '30px', fontSize: '11px', fontWeight: 700 }}
                        >
                          {b.is_active ? 'Turn OFF' : 'Turn ON'}
                        </button>

                        {/* Move Up */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveDealsBanner(b.id, 'up')}
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

                        {/* Move Down */}
                        <button
                          type="button"
                          disabled={idx === arr.length - 1}
                          onClick={() => handleMoveDealsBanner(b.id, 'down')}
                          style={{
                            background: idx === arr.length - 1 ? 'var(--color-admin-surface-2)' : '#ffffff',
                            border: '1px solid var(--color-admin-border)',
                            color: idx === arr.length - 1 ? '#cbd5e1' : 'var(--color-admin-text)',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-md)',
                            cursor: idx === arr.length - 1 ? 'not-allowed' : 'pointer',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Move Down"
                        >
                          <ArrowDown size={14} />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => openEditSlideModal(b)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid var(--color-admin-border)',
                            color: 'var(--color-admin-text)',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Edit Banner"
                        >
                          <Edit3 size={13} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteBanner(b.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: 'var(--color-danger)',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Delete Banner"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* + Add New Deals Banner Form */}
            <div style={{ background: 'var(--color-admin-surface-2)', padding: '18px', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--color-admin-border)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} color="var(--color-primary)" />
                <span>+ Add New Promotional Slide to Deals Hub</span>
              </h3>

              <form onSubmit={handleCreateDealsBanner} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label className="admin-label">Headline *</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. Flash Mega Deals 2026"
                      value={dealsBannerTitleEn}
                      onChange={e => setDealsBannerTitleEn(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="admin-label">Subtitle Badge</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. UP TO 50% OFF FLASH SALE"
                      value={dealsBannerSubtitle}
                      onChange={e => setDealsBannerSubtitle(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="admin-label">Target Link URL</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="/deals?tier=big_discount"
                    value={dealsBannerLink}
                    onChange={e => setDealsBannerLink(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="admin-label">Banner Cover Image</label>
                  <ImageUploader images={dealsBannerImages} onChange={setDealsBannerImages} />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingDealsBanner}
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Plus size={16} />
                  <span>{isCreatingDealsBanner ? 'Publishing Deals Banner...' : 'Publish Deals Banner'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* 2. DEALS PAGE HEADLINE & COUNTDOWN TIMER CONFIG */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
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

            {/* 3. CLAIMABLE VOUCHERS & COUPONS ON DEALS PAGE */}
            <div className="admin-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={18} color="var(--color-primary-light)" />
                    <span>Deals Shelf Vouchers ({coupons.length})</span>
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                    1-Click control over which coupons appear on the public /deals shelf vs private checkout codes.
                  </p>
                </div>

                <Link
                  href="/admin/coupons"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700 }}
                >
                  <span>Full Coupon Manager ➔</span>
                </Link>
              </div>

              {/* Coupons Shelf List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {coupons.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-admin-muted)', fontSize: '13px' }}>
                    No discount promo codes found.
                  </div>
                ) : (
                  coupons.map(coupon => {
                    const isDealsVisible = coupon.show_on_deals_page !== false;
                    const isPercent = coupon.type === 'percent' || coupon.type === ('percentage' as any);
                    const hasProductRules = coupon.applicable_product_ids && coupon.applicable_product_ids.length > 0;

                    return (
                      <div
                        key={coupon.id}
                        style={{
                          background: 'var(--color-admin-surface-2)',
                          border: `1px solid ${isDealsVisible ? 'var(--color-primary-20, rgba(37,99,235,0.25))' : 'var(--color-admin-border)'}`,
                          borderRadius: 'var(--radius-lg)',
                          padding: '12px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '13px',
                                background: '#ffffff',
                                border: '1px solid var(--color-admin-border)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-admin-text)',
                              }}
                            >
                              {coupon.code}
                            </span>

                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                color: 'var(--color-primary-light)',
                                background: 'var(--color-primary-10)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                              }}
                            >
                              {isPercent ? `${coupon.value}% OFF` : `৳${coupon.value} FLAT`}
                            </span>

                            {hasProductRules ? (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#8b5cf6',
                                  background: 'rgba(139, 92, 246, 0.12)',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-full)',
                                }}
                              >
                                {coupon.applicable_product_ids!.length} Products Scope
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#059669',
                                  background: 'rgba(5, 150, 105, 0.12)',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-full)',
                                }}
                              >
                                Storewide
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                            Min order: ৳{coupon.min_order_amount || 0} • Status: {coupon.is_active ? 'Active' : 'Disabled'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {/* 1-Click Deals Shelf Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleCouponDealsVisibility(coupon)}
                            className={`btn btn-sm ${isDealsVisible ? 'btn-primary' : 'btn-secondary'}`}
                            style={{
                              fontSize: '11px',
                              padding: '4px 10px',
                              height: '28px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title={isDealsVisible ? 'Click to hide from /deals shelf' : 'Click to show on /deals shelf'}
                          >
                            {isDealsVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                            <span>{isDealsVisible ? 'On /deals' : 'Hidden'}</span>
                          </button>

                          {/* Active Status Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleCouponActive(coupon)}
                            className={`btn btn-sm ${coupon.is_active ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ fontSize: '11px', padding: '4px 8px', height: '28px', fontWeight: 700 }}
                            title="Toggle active coupon state"
                          >
                            {coupon.is_active ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
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

      {/* ────────────────────────────────────────────────────────────
         FLOATING QUICK SAVE BAR (TRIGGERED WHEN CHANGES PENDING)
         ──────────────────────────────────────────────────────────── */}
      {hasUnsavedChanges && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 90,
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#38bdf8',
                boxShadow: '0 0 8px #38bdf8',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>
              You have unsaved storefront customizations
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              disabled={isSavingSettings}
              className="btn btn-primary btn-sm"
              style={{
                background: 'var(--color-primary)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '12px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Save size={14} />
              <span>{isSavingSettings ? 'Publishing...' : 'Save & Publish Now'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
