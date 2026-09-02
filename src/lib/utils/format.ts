// src/lib/utils/format.ts
// Formatting helpers — all use STORE_CONFIG to stay consistent
import { STORE_CONFIG } from '@/lib/store-config';

/**
 * Format a number as BDT currency: ৳1,200
 */
export function formatCurrency(amount: number): string {
  return `${STORE_CONFIG.currencySymbol}${amount.toLocaleString(STORE_CONFIG.currencyLocale)}`;
}

/**
 * Format a date string to readable format: Jan 15, 2024
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format as relative time: "2h ago", "3d ago", "Just now"
 */
export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60)  return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)  return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)    return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7)      return `${days}d ago`;
  return formatDate(dateStr);
}

/**
 * Convert text to URL-safe slug: "Hello World!" → "hello-world"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncate text to maxLength, append "..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Calculate discount percentage between original and sale price
 */
export function calcDiscountPercent(original: number, sale: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - sale) / original) * 100);
}

/**
 * Get the effective price (sale_price if set, otherwise base_price)
 */
export function getEffectivePrice(base: number, sale: number | null): number {
  return sale ?? base;
}

/**
 * Format file size in human readable form
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Generate order status label
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending:          'Pending',
    confirmed:        'Confirmed',
    processing:       'Processing',
    shipped:          'Shipped',
    out_for_delivery: 'Out for Delivery',
    delivered:        'Delivered',
    cancelled:        'Cancelled',
    returned:         'Returned',
  };
  return labels[status] ?? status;
}

/**
 * Format phone number for display: 01700000000 → +880 1700-000000
 */
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('880') && clean.length === 13) {
    return `+880 ${clean.slice(3, 7)}-${clean.slice(7)}`;
  }
  if (clean.startsWith('0') && clean.length === 11) {
    return `+880 ${clean.slice(1, 5)}-${clean.slice(5)}`;
  }
  return phone;
}
