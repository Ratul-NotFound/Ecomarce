// src/lib/store-config.ts
// ============================================================
// THE SINGLE SOURCE OF TRUTH for store identity.
// Changing values here updates the entire website.
// Admin can also override these via the store_settings DB table.
// ============================================================

export const STORE_CONFIG = {
  // --- Brand Identity ---
  name: 'ShopBD',                              // ← Change store name here
  tagline: 'Your Trusted Online Shop',
  tagline_bn: 'আপনার বিশ্বস্ত অনলাইন শপ',
  logo: '',                                    // Upload logo via Admin Settings or place at public/logo.svg
  favicon: '/favicon.ico',

  // --- Currency ---
  currency: 'BDT',
  currencySymbol: '৳',
  currencyLocale: 'en-BD',

  // --- Contact ---
  contact: {
    email: 'support@shopbd.com',
    phone: '+880 1700-000000',
    whatsapp: '+880 1700-000000',
    address: 'Dhaka, Bangladesh',
  },

  // --- Social Media ---
  social: {
    facebook:  'https://facebook.com/shopbd',
    instagram: 'https://instagram.com/shopbd',
    telegram:  'https://t.me/shopbd',
    youtube:   '',
  },

  // --- Shipping (BDT) ---
  shipping: {
    insideDhaka:   60,
    outsideDhaka: 120,
    freeAbove:   1500,   // Free shipping on orders above this amount
  },

  // --- Payment Methods ---
  payment: {
    bkash:  { enabled: true,  number: '01700000000' },
    nagad:  { enabled: true,  number: '01700000000' },
    cod:    { enabled: true  },
  },

  // --- SEO Defaults ---
  seo: {
    siteName:           'ShopBD',
    defaultTitle:       'ShopBD — Your Trusted Online Shop',
    defaultDescription: 'Shop fashion, electronics, and lifestyle products online. Fast delivery across Bangladesh.',
    twitterHandle:      '@shopbd',
    ogImage:            '/og-image.jpg',
  },

  // --- Pagination ---
  pagination: {
    productsPerPage: 20,
    ordersPerPage:   10,
    reviewsPerPage:  10,
  },

  // --- Features ---
  features: {
    wishlist:    true,
    reviews:     true,
    qa:          true,
    referral:    true,
    affiliate:   true,
    liveChat:    true,
    flashSale:   true,
    compareProducts: false,  // Future feature
  },

  // --- Localization ---
  defaultLanguage: 'en' as 'en' | 'bn',
  supportedLanguages: ['en', 'bn'] as const,
} as const;

export type StoreConfig = typeof STORE_CONFIG;
export type SupportedLanguage = typeof STORE_CONFIG.supportedLanguages[number];
