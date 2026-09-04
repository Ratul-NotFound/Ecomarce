import { STORE_CONFIG } from '@/lib/store-config';

export interface PaymentMethodConfig {
  id: 'cod' | 'bkash' | 'nagad';
  enabled: boolean;
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  number?: string;
  account_type?: 'Personal' | 'Merchant';
  instructions?: string;
  badge?: string;
  color?: string;
}

export interface PaymentSettings {
  cod: PaymentMethodConfig;
  bkash: PaymentMethodConfig;
  nagad: PaymentMethodConfig;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  cod: {
    id: 'cod',
    enabled: true,
    title_en: 'Cash on Delivery',
    title_bn: 'ক্যাশ অন ডেলিভারি',
    description_en: 'Pay in cash when you receive your order at your doorstep.',
    description_bn: 'পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন।',
    badge: 'Popular',
    color: '#2563eb',
  },
  bkash: {
    id: 'bkash',
    enabled: true,
    title_en: 'bKash Send Money',
    title_bn: 'বিকাশ সেন্ড মানি',
    description_en: 'Send money to our bKash account and enter TrxID below.',
    description_bn: 'আমাদের বিকাশ নম্বরে সেন্ড মানি করে TrxID দিন।',
    number: STORE_CONFIG.payment.bkash.number || '01700000000',
    account_type: 'Personal',
    badge: 'Instant',
    color: '#e2136e',
  },
  nagad: {
    id: 'nagad',
    enabled: true,
    title_en: 'Nagad Send Money',
    title_bn: 'নগদ সেন্ড মানি',
    description_en: 'Send money to our Nagad account and enter TrxID below.',
    description_bn: 'আমাদের নগদ নম্বরে সেন্ড মানি করে TrxID দিন।',
    number: STORE_CONFIG.payment.nagad.number || '01800000000',
    account_type: 'Personal',
    badge: 'Instant',
    color: '#f97316',
  },
};

/**
 * Merges saved database settings with default settings, ensuring full type safety
 */
export function getMergedPaymentSettings(rawSettings?: any): PaymentSettings {
  if (!rawSettings || typeof rawSettings !== 'object') {
    return DEFAULT_PAYMENT_SETTINGS;
  }

  return {
    cod: { ...DEFAULT_PAYMENT_SETTINGS.cod, ...(rawSettings.cod || {}) },
    bkash: { ...DEFAULT_PAYMENT_SETTINGS.bkash, ...(rawSettings.bkash || {}) },
    nagad: { ...DEFAULT_PAYMENT_SETTINGS.nagad, ...(rawSettings.nagad || {}) },
  };
}
