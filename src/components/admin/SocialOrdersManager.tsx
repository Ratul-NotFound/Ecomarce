'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle,
  Camera,
  Phone,
  Share2,
  Plus,
  Trash2,
  Search,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getStatusLabel } from '@/lib/utils/format';
import type { Order, SocialChannel } from '@/types';
import { DISTRICTS } from '@/lib/utils/bangladesh-districts';

// ── Channel config ────────────────────────────────────────────────────────────
const CHANNELS: {
  id: SocialChannel;
  label: string;
  color: string;
  bg: string;
  Icon: React.ElementType;
}[] = [
  { id: 'facebook',  label: 'Facebook',  color: '#1877f2', bg: 'rgba(24,119,242,0.1)',  Icon: Share2 },
  { id: 'whatsapp',  label: 'WhatsApp',  color: '#25d366', bg: 'rgba(37,211,102,0.1)',  Icon: MessageCircle },
  { id: 'instagram', label: 'Instagram', color: '#e1306c', bg: 'rgba(225,48,108,0.1)',  Icon: Camera },
  { id: 'phone',     label: 'Phone',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  Icon: Phone },
  { id: 'other',     label: 'Other',     color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  Icon: Share2 },
];

function channelConfig(ch?: SocialChannel | null) {
  return CHANNELS.find(c => c.id === ch) ?? CHANNELS[4];
}

// ── Sub-types ─────────────────────────────────────────────────────────────────
interface LineItem {
  productId: string;
  variantId: string | null;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  stock: number;
  hasVariants: boolean;
  variants?: { id: string; name_en: string; price_modifier: number; stock_quantity: number }[];
  selectedVariant?: { id: string; name_en: string; price_modifier: number; stock_quantity: number } | null;
}

// ── Channel Badge (exported for AdminOrdersManager) ───────────────────────────
export function SocialChannelBadge({ channel }: { channel?: SocialChannel | null }) {
  if (!channel) return null;
  const cfg = channelConfig(channel);
  const { Icon } = cfg;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}33`,
        borderRadius: '999px',
        padding: '2px 7px',
        fontSize: '11px',
        fontWeight: 700,
        verticalAlign: 'middle',
        marginLeft: '6px',
      }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface SocialOrdersManagerProps {
  initialOrders: Order[];
}

export default function SocialOrdersManager({ initialOrders }: SocialOrdersManagerProps) {
  const [tab, setTab] = useState<'create' | 'history'>('create');
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  // ── Create Form State ───────────────────────────────────────────────────────
  const [channel, setChannel] = useState<SocialChannel>('facebook');
  const [socialHandle, setSocialHandle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad'>('cod');
  const [paymentTransactionId, setPaymentTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [customShipping, setCustomShipping] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; orderNumber?: string } | null>(null);

  // ── Product Search State ────────────────────────────────────────────────────
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── History tab ─────────────────────────────────────────────────────────────
  const [historyFilter, setHistoryFilter] = useState<SocialChannel | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel('social-orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        const newOrder = payload.new as Order;
        if (newOrder.source_channel) {
          setOrders(prev => [newOrder, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        setOrders(prev =>
          prev.map(o => (o.id === (payload.new as Order).id ? (payload.new as Order) : o))
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // ── Product search ──────────────────────────────────────────────────────────
  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setProductResults([]); return; }
    setSearching(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('products')
      .select('id, name_en, base_price, sale_price, stock_quantity, images, has_variants, product_variants(id, name_en, price_modifier, stock_quantity, is_active)')
      .ilike('name_en', `%${q}%`)
      .eq('is_active', true)
      .limit(8);
    setProductResults(data || []);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchProducts(productQuery), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [productQuery, searchProducts]);

  // ── Add product to line items ────────────────────────────────────────────────
  const addProduct = (prod: any) => {
    const price = Number(prod.sale_price ?? prod.base_price);
    const variants = (prod.product_variants || []).filter((v: any) => v.is_active !== false);
    const firstVariant = variants.length > 0 ? variants[0] : null;
    const existing = lineItems.findIndex(i => i.productId === prod.id && i.variantId === (firstVariant?.id ?? null));
    if (existing >= 0) {
      setLineItems(prev => prev.map((li, idx) => idx === existing ? { ...li, quantity: Math.min(li.quantity + 1, li.stock) } : li));
    } else {
      setLineItems(prev => [
        ...prev,
        {
          productId: prod.id,
          variantId: firstVariant?.id ?? null,
          name: prod.name_en,
          image: prod.images?.[0] ?? '',
          unitPrice: price + (firstVariant?.price_modifier ?? 0),
          quantity: 1,
          stock: firstVariant ? firstVariant.stock_quantity : prod.stock_quantity,
          hasVariants: prod.has_variants && variants.length > 0,
          variants,
          selectedVariant: firstVariant,
        },
      ]);
    }
    setProductQuery('');
    setProductResults([]);
  };

  const updateLineItem = (idx: number, updates: Partial<LineItem>) => {
    setLineItems(prev => prev.map((li, i) => i === idx ? { ...li, ...updates } : li));
  };

  const removeLineItem = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx));

  const subtotal = lineItems.reduce((s, li) => s + li.unitPrice * li.quantity, 0);
  const shippingFee = customShipping !== '' ? Number(customShipping) : null;
  const estimatedTotal = subtotal + (shippingFee ?? 0);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/admin/orders/create-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          socialHandle: socialHandle || undefined,
          customerName,
          customerPhone,
          district,
          upazila,
          streetAddress,
          items: lineItems.map(li => ({
            productId: li.productId,
            variantId: li.variantId,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
          })),
          paymentMethod,
          paymentTransactionId: paymentTransactionId || undefined,
          notes: notes || undefined,
          customShippingFee: shippingFee ?? undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSubmitResult({ success: true, message: `Order #${json.order_number} created successfully!`, orderNumber: json.order_number });
        // Reset form
        setCustomerName(''); setCustomerPhone(''); setDistrict(''); setUpazila('');
        setStreetAddress(''); setSocialHandle(''); setNotes(''); setPaymentTransactionId('');
        setCustomShipping(''); setLineItems([]);
      } else {
        setSubmitResult({ success: false, message: json.error || 'Failed to create order' });
      }
    } catch {
      setSubmitResult({ success: false, message: 'Network error — please try again' });
    }
    setSubmitting(false);
  };

  // ── Refresh history ─────────────────────────────────────────────────────────
  const refreshHistory = async () => {
    setRefreshing(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('orders')
      .select('*')
      .not('source_channel', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setOrders(data as Order[]);
    setRefreshing(false);
  };

  // ── History filtered orders ─────────────────────────────────────────────────
  const filteredHistory = orders.filter(o =>
    historyFilter === 'all' ? true : o.source_channel === historyFilter
  );

  // ── Stats ───────────────────────────────────────────────────────────────────
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => new Date(o.created_at) >= todayStart);
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const channelCounts = CHANNELS.map(c => ({
    ...c,
    count: orders.filter(o => o.source_channel === c.id).length,
  }));

  return (
    <div className="social-orders-root">
      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="social-orders-tabs">
        <button
          type="button"
          className={`social-orders-tab ${tab === 'create' ? 'social-orders-tab--active' : ''}`}
          onClick={() => setTab('create')}
          id="social-tab-create"
        >
          <Plus size={16} />
          Create Social Order
        </button>
        <button
          type="button"
          className={`social-orders-tab ${tab === 'history' ? 'social-orders-tab--active' : ''}`}
          onClick={() => { setTab('history'); refreshHistory(); }}
          id="social-tab-history"
        >
          <BarChart3 size={16} />
          Social Orders History
          {orders.length > 0 && (
            <span className="social-orders-tab-badge">{orders.length}</span>
          )}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════
          TAB 1 — CREATE ORDER
      ════════════════════════════════════════════════════════════ */}
      {tab === 'create' && (
        <form onSubmit={handleSubmit} className="social-create-form" id="social-create-order-form">

          {/* ── Submit result banner ── */}
          {submitResult && (
            <div className={`social-alert ${submitResult.success ? 'social-alert--success' : 'social-alert--error'}`}>
              {submitResult.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{submitResult.message}</span>
              {submitResult.success && (
                <button type="button" className="social-alert-link" onClick={() => setTab('history')}>
                  View in History →
                </button>
              )}
            </div>
          )}

          <div className="social-form-grid">
            {/* ── Left column ── */}
            <div className="social-form-col">

              {/* Channel selector */}
              <section className="social-form-section">
                <h3 className="social-section-title">📲 Source Channel</h3>
                <div className="social-channel-grid">
                  {CHANNELS.map(cfg => {
                    const { Icon } = cfg;
                    const active = channel === cfg.id;
                    return (
                      <button
                        key={cfg.id}
                        type="button"
                        className={`social-channel-btn ${active ? 'social-channel-btn--active' : ''}`}
                        style={active ? { borderColor: cfg.color, background: cfg.bg, color: cfg.color } : {}}
                        onClick={() => setChannel(cfg.id)}
                      >
                        <Icon size={18} />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="social-field">
                  <label className="social-label">Customer Handle / Profile URL (optional)</label>
                  <input
                    type="text"
                    className="social-input"
                    placeholder={
                      channel === 'facebook' ? 'e.g. facebook.com/customer' :
                      channel === 'whatsapp' ? 'e.g. 01700123456' :
                      channel === 'instagram' ? 'e.g. @customer_handle' :
                      channel === 'phone' ? 'Phone number' : 'Handle or note'
                    }
                    value={socialHandle}
                    onChange={e => setSocialHandle(e.target.value)}
                    id="social-handle-input"
                  />
                </div>
              </section>

              {/* Customer info */}
              <section className="social-form-section">
                <h3 className="social-section-title">👤 Customer Information</h3>
                <div className="social-field-row">
                  <div className="social-field">
                    <label className="social-label">Full Name *</label>
                    <input
                      type="text"
                      className="social-input"
                      placeholder="Customer's full name"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      required
                      id="social-customer-name"
                    />
                  </div>
                  <div className="social-field">
                    <label className="social-label">Mobile Number * (01XXXXXXXXX)</label>
                    <input
                      type="tel"
                      className="social-input"
                      placeholder="01700000000"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      required
                      id="social-customer-phone"
                    />
                  </div>
                </div>
                <div className="social-field-row">
                  <div className="social-field">
                    <label className="social-label">District *</label>
                    <select
                      className="social-input"
                      value={district}
                      onChange={e => setDistrict(e.target.value)}
                      required
                      id="social-district"
                    >
                      <option value="">Select district…</option>
                      {DISTRICTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="social-field">
                    <label className="social-label">Upazila / Thana (optional)</label>
                    <input
                      type="text"
                      className="social-input"
                      placeholder="Upazila / Thana"
                      value={upazila}
                      onChange={e => setUpazila(e.target.value)}
                      id="social-upazila"
                    />
                  </div>
                </div>
                <div className="social-field">
                  <label className="social-label">Street Address *</label>
                  <input
                    type="text"
                    className="social-input"
                    placeholder="House, road, area…"
                    value={streetAddress}
                    onChange={e => setStreetAddress(e.target.value)}
                    required
                    id="social-street-address"
                  />
                </div>
              </section>

              {/* Payment */}
              <section className="social-form-section">
                <h3 className="social-section-title">💳 Payment</h3>
                <div className="social-field-row">
                  <div className="social-field">
                    <label className="social-label">Payment Method *</label>
                    <select
                      className="social-input"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as any)}
                      id="social-payment-method"
                    >
                      <option value="cod">Cash on Delivery (COD)</option>
                      <option value="bkash">bKash</option>
                      <option value="nagad">Nagad</option>
                    </select>
                  </div>
                  <div className="social-field">
                    <label className="social-label">Custom Shipping (৳) — leave blank for auto</label>
                    <input
                      type="number"
                      min="0"
                      className="social-input"
                      placeholder="Auto-calculated"
                      value={customShipping}
                      onChange={e => setCustomShipping(e.target.value)}
                      id="social-custom-shipping"
                    />
                  </div>
                </div>
                {paymentMethod !== 'cod' && (
                  <div className="social-field">
                    <label className="social-label">Transaction ID (TrxID)</label>
                    <input
                      type="text"
                      className="social-input"
                      placeholder={`${paymentMethod === 'bkash' ? 'bKash' : 'Nagad'} TrxID`}
                      value={paymentTransactionId}
                      onChange={e => setPaymentTransactionId(e.target.value)}
                      id="social-trxid"
                    />
                  </div>
                )}
                <div className="social-field">
                  <label className="social-label">Internal Notes (optional)</label>
                  <textarea
                    className="social-input social-textarea"
                    placeholder="e.g. Customer messaged on FB page at 3pm, agreed on ৳500 shipping"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    id="social-notes"
                  />
                </div>
              </section>
            </div>

            {/* ── Right column — Products ── */}
            <div className="social-form-col">
              <section className="social-form-section">
                <h3 className="social-section-title">🛍️ Products</h3>

                {/* Product search */}
                <div className="social-product-search-wrap">
                  <Search size={16} className="social-search-icon" />
                  <input
                    type="text"
                    className="social-input social-product-search"
                    placeholder="Search products by name…"
                    value={productQuery}
                    onChange={e => setProductQuery(e.target.value)}
                    id="social-product-search"
                  />
                  {searching && <Loader2 size={16} className="social-search-spinner" />}
                </div>

                {productResults.length > 0 && (
                  <div className="social-product-results">
                    {productResults.map(prod => (
                      <button
                        key={prod.id}
                        type="button"
                        className="social-product-result"
                        onClick={() => addProduct(prod)}
                      >
                        {prod.images?.[0] && (
                          <img src={prod.images[0]} alt={prod.name_en} className="social-product-thumb" />
                        )}
                        <div className="social-product-result-info">
                          <span className="social-product-result-name">{prod.name_en}</span>
                          <span className="social-product-result-price">
                            {formatCurrency(prod.sale_price ?? prod.base_price)}
                            {prod.has_variants && ' · has variants'}
                          </span>
                        </div>
                        <Plus size={16} className="social-product-add-icon" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Line items */}
                {lineItems.length === 0 ? (
                  <div className="social-empty-items">
                    <ShoppingBag size={28} opacity={0.3} />
                    <span>Search and add products above</span>
                  </div>
                ) : (
                  <div className="social-line-items">
                    {lineItems.map((li, idx) => (
                      <div key={idx} className="social-line-item">
                        {li.image && (
                          <img src={li.image} alt={li.name} className="social-line-thumb" />
                        )}
                        <div className="social-line-info">
                          <span className="social-line-name">{li.name}</span>

                          {/* Variant picker */}
                          {li.hasVariants && li.variants && li.variants.length > 0 && (
                            <select
                              className="social-input social-line-variant"
                              value={li.variantId ?? ''}
                              onChange={e => {
                                const v = li.variants!.find(vv => vv.id === e.target.value);
                                const base = Number((li as any)._basePrice ?? 0) || li.unitPrice;
                                updateLineItem(idx, {
                                  variantId: v?.id ?? null,
                                  selectedVariant: v ?? null,
                                  unitPrice: base + (v?.price_modifier ?? 0),
                                  stock: v?.stock_quantity ?? 0,
                                });
                              }}
                            >
                              {li.variants.map(v => (
                                <option key={v.id} value={v.id}>
                                  {v.name_en} {v.price_modifier !== 0 ? `(+৳${v.price_modifier})` : ''}
                                </option>
                              ))}
                            </select>
                          )}

                          <div className="social-line-controls">
                            <label className="social-label" style={{ fontSize: '11px' }}>Price ৳</label>
                            <input
                              type="number"
                              min="0"
                              className="social-input social-line-price"
                              value={li.unitPrice}
                              onChange={e => updateLineItem(idx, { unitPrice: Math.max(0, Number(e.target.value)) })}
                            />
                            <label className="social-label" style={{ fontSize: '11px' }}>Qty</label>
                            <input
                              type="number"
                              min="1"
                              max={li.stock}
                              className="social-input social-line-qty"
                              value={li.quantity}
                              onChange={e => updateLineItem(idx, { quantity: Math.max(1, Math.min(li.stock, Number(e.target.value))) })}
                            />
                            <span className="social-line-subtotal">{formatCurrency(li.unitPrice * li.quantity)}</span>
                          </div>
                          {li.stock < 5 && (
                            <span className="social-low-stock">⚠ Only {li.stock} left in stock</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="social-line-remove"
                          onClick={() => removeLineItem(idx)}
                          aria-label="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Order summary */}
                {lineItems.length > 0 && (
                  <div className="social-order-summary">
                    <div className="social-summary-row">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="social-summary-row">
                      <span>Shipping</span>
                      <span>{shippingFee !== null ? formatCurrency(shippingFee) : <em style={{ opacity: 0.6 }}>auto</em>}</span>
                    </div>
                    <div className="social-summary-row social-summary-total">
                      <span>Estimated Total</span>
                      <span>{shippingFee !== null ? formatCurrency(estimatedTotal) : '—'}</span>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className="social-submit-btn"
                  disabled={submitting || lineItems.length === 0}
                  id="social-submit-order-btn"
                >
                  {submitting ? (
                    <><Loader2 size={16} className="social-spin" /> Creating Order…</>
                  ) : (
                    <><CheckCircle2 size={16} /> Create Order</>
                  )}
                </button>
              </section>
            </div>
          </div>
        </form>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 2 — HISTORY
      ════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div className="social-history">

          {/* Stats row */}
          <div className="social-stats-row">
            <div className="social-stat-card">
              <Users size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <div className="social-stat-val">{orders.length}</div>
                <div className="social-stat-label">Total Social Orders</div>
              </div>
            </div>
            <div className="social-stat-card">
              <DollarSign size={20} style={{ color: '#10b981' }} />
              <div>
                <div className="social-stat-val">{formatCurrency(totalRevenue)}</div>
                <div className="social-stat-label">Total Revenue</div>
              </div>
            </div>
            <div className="social-stat-card">
              <TrendingUp size={20} style={{ color: '#f59e0b' }} />
              <div>
                <div className="social-stat-val">{todayOrders.length}</div>
                <div className="social-stat-label">Orders Today</div>
              </div>
            </div>
            {channelCounts.filter(c => c.count > 0).map(cfg => {
              const { Icon } = cfg;
              return (
                <div className="social-stat-card" key={cfg.id}>
                  <Icon size={20} style={{ color: cfg.color }} />
                  <div>
                    <div className="social-stat-val" style={{ color: cfg.color }}>{cfg.count}</div>
                    <div className="social-stat-label">{cfg.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter + Refresh */}
          <div className="social-history-toolbar">
            <div className="social-channel-filter">
              <button
                type="button"
                className={`social-filter-btn ${historyFilter === 'all' ? 'social-filter-btn--active' : ''}`}
                onClick={() => setHistoryFilter('all')}
              >
                All Channels
              </button>
              {CHANNELS.map(cfg => {
                const { Icon } = cfg;
                return (
                  <button
                    key={cfg.id}
                    type="button"
                    className={`social-filter-btn ${historyFilter === cfg.id ? 'social-filter-btn--active' : ''}`}
                    style={historyFilter === cfg.id ? { borderColor: cfg.color, color: cfg.color, background: cfg.bg } : {}}
                    onClick={() => setHistoryFilter(cfg.id)}
                  >
                    <Icon size={13} /> {cfg.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="social-refresh-btn"
              onClick={refreshHistory}
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? 'social-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Orders table */}
          {filteredHistory.length === 0 ? (
            <div className="social-empty-history">
              <Share2 size={32} opacity={0.25} />
              <p>No social orders yet{historyFilter !== 'all' ? ` for ${historyFilter}` : ''}.</p>
              <button type="button" className="social-submit-btn" style={{ width: 'fit-content' }} onClick={() => setTab('create')}>
                <Plus size={15} /> Create First Social Order
              </button>
            </div>
          ) : (
            <div className="social-table-wrap">
              <table className="social-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Channel</th>
                    <th>Handle</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(order => {
                    const cfg = channelConfig(order.source_channel);
                    const { Icon } = cfg;
                    const addr = order.shipping_address as any;
                    return (
                      <tr key={order.id} className="social-table-row">
                        <td>
                          <a
                            href={`/admin/orders/${order.id}`}
                            className="social-order-link"
                          >
                            #{order.order_number}
                          </a>
                        </td>
                        <td>
                          <span
                            className="social-channel-pill"
                            style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}33` }}
                          >
                            <Icon size={12} /> {cfg.label}
                          </span>
                        </td>
                        <td className="social-handle-cell">{order.social_handle || '—'}</td>
                        <td>
                          <div className="social-customer-cell">
                            <span>{addr?.full_name || '—'}</span>
                            <span className="social-customer-phone">{addr?.phone || ''}</span>
                          </div>
                        </td>
                        <td>{(order.items_snapshot || []).length} item{(order.items_snapshot || []).length !== 1 ? 's' : ''}</td>
                        <td><strong>{formatCurrency(order.total)}</strong></td>
                        <td>
                          <span className={`order-status-badge status-${order.status}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="social-date-cell">{formatDate(order.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
