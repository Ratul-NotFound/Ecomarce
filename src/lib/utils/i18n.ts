// src/lib/utils/i18n.ts
// Lightweight bilingual translation helper.
// No external library — just a flat lookup map.

export type Lang = 'en' | 'bn';

// ────────────────────────────────────────────────────────────
// UI TRANSLATIONS
// Add new keys here as you build more UI elements.
// ────────────────────────────────────────────────────────────
const UI_TRANSLATIONS: Record<string, Record<Lang, string>> = {
  // Navigation
  'Home':            { en: 'Home',            bn: 'হোম' },
  'Shop':            { en: 'Shop',            bn: 'শপ' },
  'Categories':      { en: 'Categories',      bn: 'ক্যাটাগরি' },
  'Search':          { en: 'Search',          bn: 'খুঁজুন' },
  'Cart':            { en: 'Cart',            bn: 'কার্ট' },
  'Wishlist':        { en: 'Wishlist',        bn: 'উইশলিস্ট' },
  'My Account':      { en: 'My Account',      bn: 'আমার অ্যাকাউন্ট' },
  'My Orders':       { en: 'My Orders',       bn: 'আমার অর্ডার' },
  'Sign In':         { en: 'Sign In',         bn: 'সাইন ইন' },
  'Sign Out':        { en: 'Sign Out',        bn: 'সাইন আউট' },

  // Products
  'Add to Cart':     { en: 'Add to Cart',     bn: 'কার্টে যোগ করুন' },
  'Buy Now':         { en: 'Buy Now',         bn: 'এখনই কিনুন' },
  'Out of Stock':    { en: 'Out of Stock',    bn: 'স্টক নেই' },
  'In Stock':        { en: 'In Stock',        bn: 'স্টকে আছে' },
  'Only left':       { en: 'Only {n} left!', bn: 'মাত্র {n}টি বাকি!' },
  'Reviews':         { en: 'Reviews',         bn: 'রিভিউ' },
  'Write a Review':  { en: 'Write a Review',  bn: 'রিভিউ লিখুন' },
  'Related Products':{ en: 'Related Products',bn: 'সম্পর্কিত পণ্য' },
  'New Arrivals':    { en: 'New Arrivals',    bn: 'নতুন পণ্য' },
  'Featured':        { en: 'Featured',        bn: 'ফিচার্ড' },
  'Flash Sale':      { en: 'Flash Sale',      bn: 'ফ্ল্যাশ সেল' },
  'Best Selling':    { en: 'Best Selling',    bn: 'সেরা বিক্রি' },

  // Price / Offers
  'Free Shipping':   { en: 'Free Shipping',   bn: 'বিনামূল্যে ডেলিভারি' },
  'Discount':        { en: 'Discount',        bn: 'ছাড়' },
  'Off':             { en: 'Off',             bn: 'ছাড়' },
  'Total':           { en: 'Total',           bn: 'মোট' },
  'Subtotal':        { en: 'Subtotal',        bn: 'উপমোট' },
  'Shipping Fee':    { en: 'Shipping Fee',    bn: 'ডেলিভারি চার্জ' },

  // Checkout / Orders
  'Checkout':        { en: 'Checkout',        bn: 'চেকআউট' },
  'Place Order':     { en: 'Place Order',     bn: 'অর্ডার দিন' },
  'Track Order':     { en: 'Track Order',     bn: 'অর্ডার ট্র্যাক করুন' },
  'Order Placed':    { en: 'Order Placed!',   bn: 'অর্ডার দেওয়া হয়েছে!' },
  'Payment':         { en: 'Payment',         bn: 'পেমেন্ট' },
  'Cash on Delivery':{ en: 'Cash on Delivery',bn: 'ক্যাশ অন ডেলিভারি' },
  'Continue Shopping':{ en: 'Continue Shopping', bn: 'শপিং চালিয়ে যান' },

  // Address
  'Delivery Address':{ en: 'Delivery Address', bn: 'ডেলিভারি ঠিকানা' },
  'Select District': { en: 'Select District',  bn: 'জেলা নির্বাচন করুন' },
  'Add Address':     { en: 'Add Address',      bn: 'ঠিকানা যোগ করুন' },

  // Misc
  'Loading':         { en: 'Loading…',        bn: 'লোড হচ্ছে…' },
  'No results':      { en: 'No results found', bn: 'কোনো ফলাফল নেই' },
  'See All':         { en: 'See All',         bn: 'সব দেখুন' },
  'Close':           { en: 'Close',           bn: 'বন্ধ করুন' },
  'Save':            { en: 'Save',            bn: 'সংরক্ষণ করুন' },
  'Cancel':          { en: 'Cancel',          bn: 'বাতিল' },
  'Delete':          { en: 'Delete',          bn: 'মুছুন' },
  'Edit':            { en: 'Edit',            bn: 'সম্পাদনা' },
  'Share':           { en: 'Share',           bn: 'শেয়ার করুন' },
  'Copy':            { en: 'Copy',            bn: 'কপি করুন' },

  // Chat
  'Chat with us':    { en: 'Chat with us',    bn: 'আমাদের সাথে কথা বলুন' },
  'Type a message…': { en: 'Type a message…', bn: 'বার্তা লিখুন…' },
  'Send':            { en: 'Send',            bn: 'পাঠান' },
};

/**
 * Translate a UI key to the given language.
 * Falls back to English if Bangla translation missing.
 * Falls back to the key itself if not found.
 *
 * @example t('Add to Cart', 'bn') → 'কার্টে যোগ করুন'
 */
export function t(key: string, lang: Lang = 'en'): string {
  const entry = UI_TRANSLATIONS[key];
  if (!entry) return key;
  return entry[lang] ?? entry['en'] ?? key;
}

/**
 * Pick the right language from a bilingual content field.
 * Used for product names, descriptions, category names etc.
 *
 * @example tb('T-Shirt', 'টি-শার্ট', 'bn') → 'টি-শার্ট'
 * @example tb('T-Shirt', null, 'bn')        → 'T-Shirt' (fallback)
 */
export function tb(en: string | null, bn: string | null, lang: Lang = 'en'): string {
  if (lang === 'bn' && bn) return bn;
  return en ?? bn ?? '';
}

/**
 * Replace {n} in a translation template.
 * @example tpl(t('Only left', 'en'), { n: 3 }) → 'Only 3 left!'
 */
export function tpl(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (str, [key, val]) => str.replace(`{${key}}`, String(val)),
    template
  );
}
