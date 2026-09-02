// src/types/index.ts
// ============================================================
// Shared TypeScript types for the entire application.
// All DB row shapes, enums, and utility types defined here.
// ============================================================

// ────────────────────────────────────────────────────────────
// ENUMS / UNION TYPES
// ────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'moderator' | 'admin';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentStatus = 'pending' | 'submitted' | 'confirmed' | 'failed';

export type PaymentMethod = 'bkash' | 'nagad' | 'cod';

export type OfferType = 'hero_banner' | 'promo_card' | 'special_offer';

export type InventoryChangeType = 'sale' | 'restock' | 'adjustment' | 'return';

export type EventType = 'page_view' | 'product_view' | 'add_to_cart' | 'purchase';

export type Language = 'en' | 'bn';

export type ReviewStatus = 'published' | 'pending' | 'rejected';

export type CouponType = 'percent' | 'fixed';

export type MessageDirection = 'in' | 'out';

// ────────────────────────────────────────────────────────────
// DATABASE ROW TYPES
// ────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  referral_code: string;
  referred_by: string | null;
  points: number;
  created_at: string;
}

export interface Category {
  id: string;
  name_en: string;
  name_bn: string | null;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  // Joined
  children?: Category[];
  product_count?: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  material: string | null;
  sku: string;
  price_modifier: number;
  stock_quantity: number;
  images: string[];
}

export interface Product {
  id: string;
  name_en: string;
  name_bn: string | null;
  slug: string;
  description_en: string | null;
  description_bn: string | null;
  category_id: string | null;
  brand: string | null;
  sku: string;
  base_price: number;
  sale_price: number | null;
  discount_percent: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  images: string[];
  tags: string[];
  has_variants: boolean;
  weight_grams: number | null;
  is_active: boolean;
  is_featured: boolean;
  is_flash_sale: boolean;
  flash_sale_ends_at: string | null;
  display_order: number;
  total_sold: number;
  total_views: number;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  category?: Pick<Category, 'id' | 'name_en' | 'name_bn' | 'slug'>;
  variants?: ProductVariant[];
  reviews?: ProductReview[];
  avg_rating?: number;
  review_count?: number;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string;
  images: string[];
  is_verified_purchase: boolean;
  helpful_count: number;
  status: ReviewStatus;
  created_at: string;
  // Joined
  profile?: Pick<Profile, 'full_name' | 'avatar_url'>;
}

export interface ProductQuestion {
  id: string;
  product_id: string;
  user_id: string;
  question: string;
  answer: string | null;
  answered_by: string | null;
  created_at: string;
  // Joined
  profile?: Pick<Profile, 'full_name' | 'avatar_url'>;
  answerer?: Pick<Profile, 'full_name'>;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  district: string;
  upazila: string;
  area: string | null;
  street_address: string;
  is_default: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  name_snapshot: string;
  image_snapshot: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface TrackingEvent {
  id: string;
  order_id: string;
  status: OrderStatus;
  message: string;
  location: string | null;
  updated_by: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  shipping_address: Omit<Address, 'id' | 'user_id' | 'is_default'>;
  items_snapshot: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_transaction_id: string | null;
  payment_screenshot_url: string | null;
  status: OrderStatus;
  tracking_info: TrackingEvent[];
  coupon_code: string | null;
  affiliate_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  profile?: Pick<Profile, 'full_name' | 'phone'>;
}

export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  method: PaymentMethod;
  transaction_id: string | null;
  screenshot_url: string | null;
  amount: number;
  status: PaymentStatus;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
}

export interface SpecialOffer {
  id: string;
  title_en: string;
  title_bn: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  type: OfferType;
  display_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export interface StoreSetting {
  key: string;
  value: unknown;
}

export interface InventoryLog {
  id: string;
  product_id: string;
  variant_id: string | null;
  change_type: InventoryChangeType;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // Joined
  product?: Pick<Product, 'name_en' | 'sku'>;
}

export interface Affiliate {
  id: string;
  user_id: string;
  code: string;
  commission_percent: number;
  total_earned: number;
  total_paid: number;
  is_active: boolean;
}

export interface AnalyticsEvent {
  id: string;
  event_type: EventType;
  page_url: string | null;
  product_id: string | null;
  user_id: string | null;
  session_id: string | null;
  country: string | null;
  device_type: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string | null;
  user_name: string | null;
  message: string;
  direction: MessageDirection;
  telegram_message_id: number | null;
  created_at: string;
}

// ────────────────────────────────────────────────────────────
// CART
// ────────────────────────────────────────────────────────────

export interface CartItem {
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product: Product;
  variant?: ProductVariant;
}

// ────────────────────────────────────────────────────────────
// QUERY / FILTER TYPES
// ────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductFilter {
  category_id?: string;
  min_price?: number;
  max_price?: number;
  sizes?: string[];
  colors?: string[];
  brands?: string[];
  min_rating?: number;
  is_flash_sale?: boolean;
  is_featured?: boolean;
  search?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'rating';
  page?: number;
  page_size?: number;
}

export interface AdminOrderFilter {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

// ────────────────────────────────────────────────────────────
// API RESPONSE TYPES
// ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface CreateOrderPayload {
  cart: CartItem[];
  address: Address;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  affiliateCode?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  discount: number;
  coupon?: Coupon;
  error?: string;
}

// ────────────────────────────────────────────────────────────
// ANALYTICS / DASHBOARD
// ────────────────────────────────────────────────────────────

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  todayCustomers: number;
  pendingPayments: number;
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}
