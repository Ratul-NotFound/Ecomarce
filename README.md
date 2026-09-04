# 🛍️ ShopBD — Modern Full-Stack E-Commerce Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-7B1FA2?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

A state-of-the-art, enterprise-grade, mobile-first e-commerce web platform engineered for maximum speed, security, and sales conversion in digital marketplaces. Built from the ground up on **Next.js 16 (App Router)**, **Supabase (PostgreSQL 15 + Auth + Realtime + Storage CDN)**, **Domain-Driven OOP Clean Architecture**, and an ultra-lean **Vanilla CSS Design Token Engine** delivering 60–120 FPS micro-animations with **zero** CSS framework bloat.

🌐 **Live Production Demo**: [https://ecomarce-delta.vercel.app](https://ecomarce-delta.vercel.app)

---

## 📑 Comprehensive Table of Contents
1. [🌟 System Highlights & Core Philosophy](#-system-highlights--core-philosophy)
2. [🛍️ Customer Storefront Features](#%EF%B8%8F-customer-storefront-features)
3. [👑 Executive Admin & Operations Portal](#-executive-admin--operations-portal)
4. [⚡ Performance, Image & Frontend Optimizations](#-performance-image--frontend-optimizations)
5. [🆓 Zero-Cost Infrastructure Architecture (100% Free-Tier Ready)](#-zero-cost-infrastructure-architecture-100-free-tier-ready)
6. [🛡️ Fortress-Grade Security & Concurrency Defenses](#%EF%B8%8F-fortress-grade-security--concurrency-defenses)
7. [🤖 Telegram Bot Automation & 2-Way Chat Sync](#-telegram-bot-automation--2-way-chat-sync)
8. [🏛️ Architecture & Clean Domain Patterns](#%EF%B8%8F-architecture--clean-domain-patterns)
9. [🗄️ Database Schema & Relational Models](#%EF%B8%8F-database-schema--relational-models)
10. [🚀 Quickstart & Local Installation](#-quickstart--local-installation)
11. [🚢 Production Deployment Guide](#-production-deployment-guide)
12. [🧪 Automated Testing & Verification Suite](#-automated-testing--verification-suite)
13. [📄 License](#-license)

---

## 🌟 System Highlights & Core Philosophy

1. **⚡ Zero-Bloat Ultra-Fast Performance (60–120 FPS)**:
   - Built without bulky UI kits or heavyweight CSS-in-JS runtimes. All styles are driven by an optimized **Vanilla CSS Token System** (`tokens.css`). Sub-100ms first contentful paint (FCP), near-zero layout shifts (CLS), and fluid touch ergonomics on budget mobile hardware.
2. **🖼️ Automated 2-Tier CDN Image Optimization**:
   - Integrated with Supabase S3 Storage transforms: automatic generation of ultra-lightweight thumbnails (`320×320` @ 70% quality, ~15–25 KB) for product grids, carousels, and search dropdowns, alongside high-definition views (`900×900` @ 85% quality) on product zoom modals.
3. **🇧🇩 Deep Bangladesh Regional Localization**:
   - Complete built-in support for all **64 administrative districts** of Bangladesh.
   - Dynamic localized shipping rules (Inside Dhaka ৳60 / Outside Dhaka ৳120 / Free Delivery above custom thresholds).
   - Manual transaction verification for **bKash** and **Nagad** (TrxID) alongside **Cash on Delivery (COD)**.
   - Bilingual support (Bangla `৳` currency format, English + Bengali typography).
4. **🏢 Domain-Driven OOP Architecture (DDD)**:
   - Structured around strongly typed repositories (`BaseRepository<T>`) and cohesive domain services (`InventoryService`, `OrderService`, `CouponService`, `TelegramService`, `InvoiceService`). Business logic is completely decoupled from UI handlers.
5. **🆓 Complete Free-Tier Production Viability**:
   - The entire platform can be hosted, scaled, and managed with **$0 monthly infrastructure costs** utilizing Vercel, Supabase Free Tier, and Telegram Supergroup Bots.

---

## 🛍️ Customer Storefront Features

### 1. Visual Discovery & Homepage
- **Glassmorphic Hero Carousel**:
  - Auto-advancing promotional banners managed directly from the Admin Customizer.
  - Touch-swipe responsive gesture support, title overlays, badges, and direct call-to-action (CTA) route linking.
- **Synchronized Flash Sale Engine**:
  - Live synchronized digital countdown timer (Hours, Minutes, Seconds) matching administrative flash sale windows.
  - Mobile-optimized horizontal snap-scroll track with zero layout shift (CLS).
  - Stock scarcity progress bars showing units sold vs. remaining stock to drive urgency.
- **Harmonious Product Cards**:
  - Standardized aspect ratios (~1:1.7 mobile, ~1:1.5 desktop) preventing irregular grid heights.
  - Category tags paired with single-line star ratings (`white-space: nowrap`) that never break across lines.
  - Clean single-line price display: current selling price, original strikethrough price, and discount percentage badge.
  - Instant Dual-Action buttons: "Add to Cart" and "Buy Now" with animated checkmark feedback.

### 2. High-Performance Search & Category Navigation
- **Instant Search Autocomplete**:
  - Powered by PostgreSQL Trigram (`pg_trgm`) fuzzy matching with typo tolerance across English and Bengali item names.
  - Dropdown displays live product thumbnails, category badges, and instant pricing.
  - Keyboard navigation (Arrow keys + Enter) and quick clear buttons.
- **Dedicated Search & Category Pages**:
  - Comprehensive filtering sidebar by Category, Price Range, and In-Stock availability.
  - Multi-criteria sorting: *Featured, Price: Low to High, Price: High to Low, Newest Arrivals, Customer Rating*.

### 3. Rich Product Detail Page (PDP)
- **Multi-Angle Image Gallery**:
  - Interactive thumbnail switcher with smooth transitions.
  - High-definition image modal with click-to-zoom capabilities.
- **Embedded Video Streaming**:
  - Integrated video player supporting YouTube, Google Drive, and MP4 product demos.
- **Interactive Multi-Tier Variant Matrix**:
  - Support for multi-attribute variants (Size, Color, Material, Capacity).
  - Real-time price and stock updates based on selected variant combinations.
  - Automatic disabling of out-of-stock attribute combinations.
- **Social Proof & Verified Reviews**:
  - Star ratings breakdown (1 to 5 stars) with total review tallies.
  - Authenticated customer review submission with verified purchase badge.
  - Community "Helpful" vote reactions with authenticated duplicate prevention.
- **Related Products Recommendation Carousel**:
  - Context-aware recommendations matching current category and tag taxonomy.

### 4. Seamless Cart & Regional Checkout
- **Slide-Over Shopping Cart Drawer & Full Cart Page**:
  - Live quantity increments, instant line-item deletion, and real-time subtotal updates.
  - Interactive free shipping progress tracker showing amount remaining for free delivery.
- **Dynamic 64-District Checkout**:
  - Dropdown selector for all 64 districts in Bangladesh with instant regional delivery charge recalculation.
  - **Payment Gateways**:
    - **Cash on Delivery (COD)**: Frictionless one-click order placement.
    - **bKash (Merchant & Personal)**: Step-by-step account instructions + Transaction ID (TrxID) input field.
    - **Nagad**: Direct account transfer details + TrxID verification.
- **Real-Time Coupon Engine**:
  - Percentage-based or fixed-amount discount codes.
  - Server-side validation of minimum order amounts, expiration dates, and total usage limits.
- **Guest Checkout**:
  - First-time visitors can place orders with just a phone number and shipping address—no mandatory registration required.

### 5. Post-Purchase Tracking & Customer Account
- **Visual Order Tracking Timeline**:
  - 5-stage visual progress stepper: *Pending → Confirmed → Packaging → In Transit → Delivered*.
  - Detailed milestone audit log displaying exact dates, times, and delivery notes.
- **Customer Account Dashboard**:
  - Profile manager: name, email, phone number, and default delivery addresses.
  - Full past order history with downloadable, printable branded invoices.
  - Customer Loyalty Points balance tracking.
- **Customer Wishlist**:
  - 1-click wishlist toggle on any product card or detail view with live badge counter in header.
- **Live Support Widget**:
  - Floating customer support chat widget connected via WebSockets.
  - Synchronous bi-directional communication between customer and store admin.
- **Installable Progressive Web App (PWA)**:
  - Add to Home Screen on iOS and Android with customized app icons and splash themes.
  - Built-in offline fallback page and cached asset delivery via service workers.

---

## 👑 Executive Admin & Operations Portal

Accessible securely at `/admin` for users with administrative or moderator credentials:

### 1. Executive Analytics & Business Intelligence (`/admin/analytics`)
- **Key Performance Indicators (KPIs)**:
  - Total Gross Revenue, Net Profit margin, Average Order Value (AOV), Total Order Count.
  - Unpaid vs. Paid payment queue tallies.
- **Regional Sales Heatmap**:
  - Breakdown of revenue and order volume across all 64 Bangladesh districts (identifies top performing zones like Dhaka, Chittagong, Sylhet).
- **Time-Series Traffic & Conversion Trends**:
  - Visual charts showing daily, weekly (ISO 8601 standard), and monthly traffic and order volume.

### 2. Product Catalog Management (`/admin/products`)
- **Complete Product Lifecycle CRUD**:
  - Create, edit, draft, and delete catalog items with rich text descriptions.
  - Base selling price, promotional sale price, and internal Unit Cost (COGS) tracking.
- **Multi-Image Media Manager**:
  - Drag-and-drop multi-image uploads directly to Supabase CDN Storage.
  - Set primary cover image with 1-click badge indicators.
- **Rich Media & Video Embedding**:
  - Link YouTube, Google Drive, or MP4 product demonstration videos.
- **Advanced Variant Builder**:
  - Create complex product matrices (e.g. Size: S/M/L/XL × Color: Black/Navy/White).
  - Assign specific SKUs, additional price modifiers, variant cost prices, and isolated stock quantities per SKU.
- **Flash Sale & Promotional Tagging**:
  - Toggle flash sale status, assign promotional badges (*Hot, New, Trending*), and link to category trees.

### 3. Inventory & Profit Margin Operations (`/admin/inventory`)
- **Cost of Goods Sold (COGS) Intelligence**:
  - Track purchase cost vs. selling price per product.
  - Automatic calculation of Gross Profit Margin percentage (`((Price - Cost) / Price) * 100`) and total projected profit.
- **1-Click Quick Restock**:
  - Instant increment buttons (`+5`, `+20`, `+50`) or custom restock quantities.
- **Stock Health & Scarcity Alerts**:
  - Visual color badges: *In Stock (Green)*, *Low Stock (Yellow, < 10 units)*, and *Out of Stock (Red)*.
  - Filter inventory view by stock status to prioritize vendor purchase orders.

### 4. Order Fulfillment & Dispatch Operations (`/admin/orders`)
- **Order Pipeline Workflow**:
  - Status management tabs: *All, Pending, Confirmed, Packaging, In Transit, Delivered, Cancelled*.
- **1-Click bKash / Nagad Payment Verification**:
  - Dedicated drawer displaying customer-provided bKash/Nagad Transaction IDs (TrxID).
  - 1-click "Approve Payment" action that transitions payment status to `paid` and advances fulfillment state.
- **Live Customer Tracking Updates**:
  - Add dispatch notes (e.g., *Pathao Courier Tracking ID #123456*) that instantly update the customer's visual tracking page.
- **Customer Contact Actions**:
  - 1-click phone dialer link and address copying for courier waybills.

### 5. Automated PDF & Printable Invoicing (`/api/invoices/[orderId]`)
- **Branded Commercial Invoices**:
  - Clean, professional, PDF-ready print layout with official store branding, contact details, and customer shipping address.
  - Scannable verification QR code encoding the invoice URL.
  - Complete financial breakdown: Itemized lines, unit prices, variant details, subtotal, shipping fee, applied coupon discounts, and total paid.

### 6. Live Support Command Center (`/admin/messages`)
- **Real-Time Customer Conversation Hub**:
  - Multi-session inbox listing all active customer support chats.
  - Real-time message streaming via Supabase WebSockets.
- **Telegram 2-Way Sync**:
  - Messages sent by customers on the storefront appear instantly in the store's Telegram Supergroup topic.
  - Admin staff can reply either from the `/admin/messages` dashboard or directly from their phone in Telegram!

### 7. Storefront Customizer (`/admin/customize`)
- **Hero Banner Slide Manager**:
  - Upload promotional slide images, configure title headers, subheaders, and target redirect URLs.
  - Enable/disable slides and set display order.
- **Category Display Sequencer**:
  - Reorder category navigation order on the storefront homepage.

### 8. Theme Engine & Global Settings (`/admin/settings`)
- **Live Storefront Theme Customizer**:
  - Change the primary accent brand color of the entire store on the fly without touching CSS code.
- **Regional Shipping Rate Modifiers**:
  - Configure Delivery Charge Inside Dhaka (default ৳60), Delivery Charge Outside Dhaka (default ৳120), and Free Delivery Threshold (default ৳2,000).
- **Payment Method Credentials**:
  - Configure bKash and Nagad account numbers, account types (Personal vs Merchant), and QR payment instructions.
- **Telegram Bot Configuration**:
  - Configure Bot Token, Supergroup Chat ID, and separate Topic IDs for Order Alerts and Customer Support Messages.
- **Store Identity & Announcement Bar**:
  - Store Name, Support Phone, Support Email, Physical Address, and a site-wide toggleable Announcement Bar text.

---

## ⚡ Performance, Image & Frontend Optimizations

### 1. The Vanilla CSS Design Token System (`tokens.css`)
- **Zero Framework Runtime Overhead**:
  - Completely avoids the JavaScript hydration costs of heavy CSS-in-JS libraries and runtime style injection.
- **Design Tokens**:
  - Centralized palette (`--primary`, `--primary-hover`, `--bg-surface`, `--text-primary`, `--border-subtle`).
  - Spacing scales, border radii, and elevated drop shadows for a consistent design system.
- **Hardware-Accelerated Micro-Animations**:
  - All transitions and hover states use GPU-composited CSS properties (`transform`, `opacity`) ensuring consistent 60–120 FPS performance even on budget smartphones.

### 2. Intelligent 2-Tier Image Optimization (`images.ts`)
Raw product photos uploaded by admins are often 2MB–5MB each. ShopBD solves this with dynamic Supabase CDN URL transformation:
- **Tier 1: Thumbnails (`thumb`)**:
  - Resized on-the-fly to `320×320` at `quality: 70` (~15–25 KB each).
  - Used on product card grids, flash sale sliders, cart drawers, search dropdowns, and admin tables.
- **Tier 2: High Definition (`full`)**:
  - Scaled to `900×900` at `quality: 85` (~80–120 KB).
  - Reserved strictly for the single active main image on product detail pages and zoom modals.
- **Browser-Level Enhancements**:
  - Every image tag applies native `loading="lazy"` and `decoding="async"` to prevent main-thread layout blocking.

### 3. Hybrid Server/Client Rendering Architecture
- **React Server Components (RSC)**: Initial catalog queries and page shells render on the server, streaming clean semantic HTML to the browser for near-instant first paint.
- **Client Islands**: Interactivity (e.g. cart drawer, variant selector, search modal) is isolated to lightweight client components, minimizing the JavaScript bundle sent to mobile devices.
- **Module Caching**: Frequently accessed public configurations and search catalogs utilize in-memory TTL caching, avoiding redundant database lookups.

---

## 🆓 Zero-Cost Infrastructure Architecture (100% Free-Tier Ready)

ShopBD is architected to run in production with **$0 monthly infrastructure costs**:

| Component | Platform | Free Tier Capability | Role in ShopBD |
| :--- | :--- | :--- | :--- |
| **Edge Web Hosting** | **Vercel** | Unlimited personal hobby deployments, Global Edge Network, Automatic SSL, Serverless API functions | Hosts Next.js frontend, SSR engine, and edge API proxies |
| **Relational Database** | **Supabase** | 500MB PostgreSQL 15 database, 2 projects, pg_trgm extension, Row Level Security | Stores products, variants, orders, customer profiles, settings |
| **Authentication** | **Supabase Auth** | Up to 50,000 Monthly Active Users (MAUs), Google OAuth, Email/Password, JWT sessions | Customer login, guest accounts, admin role enforcement |
| **Asset CDN & Storage** | **Supabase Storage** | 1GB file storage, 2GB monthly bandwidth, image transformation CDN | Hosts and resizes product images, variant photos, hero banners |
| **Realtime WebSockets**| **Supabase Realtime** | 200 concurrent connections, 2 million messages/month | Powers live customer-to-admin support chat |
| **Alerts & Operations**| **Telegram Bot API** | 100% Free forever, unlimited messages and webhooks | Dispatches instant order alerts to admin phone; 2-way live chat |

---

## 🛡️ Fortress-Grade Security & Concurrency Defenses

Every layer of ShopBD has been subjected to exhaustive penetration auditing and hardening:

```
┌────────────────────────────────────────────────────────┐
│               1. Edge Security Proxy                   │
│  - Scanner & Probe Blocking (sqlmap, nikto, .env)       │
│  - Path Traversal Filter (../, %2e%2e, /etc/passwd)    │
│  - Global Sliding-Window Rate Limiter (300 req/min)   │
│  - API Route Rate Limiter (60 req/min)                 │
│  - CSRF Origin / Referer Verification on Mutating APIs │
│  - Request Payload Size Cap (max 10MB)                 │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│               2. Service & API Hardening               │
│  - Authoritative Pricing: Server re-fetches DB prices  │
│  - Checkout Order Flooding Cap: 5 orders/hr/IP         │
│  - Cart Bounds: Max 50 items, max 999 quantity per item│
│  - Centralized Admin Auth Guard (requireAdminAuth)     │
│  - IDOR Prevention: Invoices require ownership or phone│
│  - Input Sanitization (sanitizeText, escapeHtml)       │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│             3. Database-Level Concurrency              │
│  - Atomic Coupon Usage: WHERE used_count < max_uses    │
│  - Atomic Stock Deduction: WHERE stock >= quantity     │
│  - Strict Identity Boundaries: Zero fallback linking   │
└────────────────────────────────────────────────────────┘
```

1. **DDoS & Flooding Mitigation**: Multi-tiered sliding-window rate limiters prevent Layer-7 floods and bot scrapers.
2. **Scanner & Probe Dropping**: Automated drop of requests targeting `.env`, `.git`, `wp-admin`, and `phpmyadmin` with an immediate `403 Forbidden`.
3. **Atomic Concurrency Defense**: Coupon redemption and stock deductions are enforced at the database level with conditional SQL updates, preventing double-spend and overselling race conditions.
4. **Server-Authoritative Pricing**: Client-submitted subtotals and discounts are ignored; the server re-queries canonical database prices.
5. **IDOR & PII Protection**: Order invoices (`/api/invoices/[id]`) strictly require authenticated user ownership or secondary verification (matching customer phone number).
6. **HTTP Security Headers**: Strict Content-Security-Policy (CSP), `X-Frame-Options: DENY` (anti-clickjacking), `X-Content-Type-Options: nosniff`, and HSTS preloading.

---

## 🤖 Telegram Bot Automation & 2-Way Chat Sync

ShopBD leverages Telegram's native **Topics** inside Supergroups to provide a command center right on your smartphone:

```
Telegram Supergroup: "ShopBD Store HQ"
├── 📦 Topic: Orders
│   └── "🚨 New Order #EC-2026-1042! Customer: Rahim, Total: ৳2,450, Payment: bKash (TrxID: 9J3K8L2), District: Chittagong"
└── 💬 Topic: Support
    └── "💬 New message from customer Karim: 'Do you deliver to Sylhet Sadar?'"
        └── (Admin replies directly in Telegram -> customer sees it live in web chat!)
```

1. **Instant Order Notifications**: Every time an order is placed, staff receive a rich Telegram notification with customer details, line items, delivery district, and bKash/Nagad TrxID.
2. **Bi-Directional Customer Support**:
   - Customer writes in the storefront chat widget.
   - Message forwards immediately to the Telegram `#Support` topic.
   - Store admins can reply **directly within the Telegram app**—the webhook routes the reply straight back to the customer's browser in real-time!

---

## 🏛️ Architecture & Clean Domain Patterns

The repository is structured around **Domain-Driven Design (DDD)** and strict **Object-Oriented Programming (OOP)**:

```
src/
├── app/
│   ├── (store)/                 # Customer-facing storefront routes
│   │   ├── products/[slug]/     # Product detail page & variant selector
│   │   ├── category/[slug]/     # Category product grid & filter sidebar
│   │   ├── cart/                # Shopping cart with coupon validator
│   │   ├── checkout/            # 64-District checkout with bKash/Nagad/COD
│   │   ├── orders/              # Order history & live visual tracking
│   │   ├── account/             # Profile, address book & loyalty points
│   │   └── wishlist/            # Customer wishlist
│   ├── (admin)/admin/           # Protected Admin Dashboard routes
│   │   ├── products/            # Product CRUD, variant & media manager
│   │   ├── orders/              # Order fulfillment & payment approvals
│   │   ├── inventory/           # Stock management & profit margin calculator
│   │   ├── messages/            # Live customer support conversation hub
│   │   ├── analytics/           # Regional sales metrics & conversion charts
│   │   ├── customize/           # Hero banners & category sequencer
│   │   └── settings/            # Branding, delivery fees & live theme picker
│   ├── api/                     # Hardened Next.js API route handlers
│   └── auth/                    # OAuth & Email authentication
├── components/
│   ├── store/                   # Storefront UI components (Header, ProductCard, FlashSale, etc.)
│   ├── admin/                   # Admin portal layout, sidebar, and data tables
│   └── ui/                      # Shared base components (Modal, Toast, Countdown, Slider)
├── hooks/                       # Reusable React hooks (useAuth, useCart, useToast)
├── lib/
│   ├── services/                # OOP Domain Services
│   │   ├── InventoryService.ts  # Valuation, COGS, and stock mutations
│   │   ├── OrderService.ts      # Order state machine & fulfillment
│   │   ├── CouponService.ts     # Promo validation & discount logic
│   │   ├── TelegramService.ts   # Bot messaging & topic router
│   │   └── InvoiceService.ts    # Invoice generator & calculations
│   ├── supabase/
│   │   ├── client.ts            # Browser Supabase client
│   │   ├── server.ts            # Server-side Supabase client (cookies)
│   │   ├── admin.ts             # Privileged Service Role Supabase client
│   │   └── repositories/        # Generic BaseRepository<T> & concrete DAOs
│   ├── auth/
│   │   └── admin-guard.ts       # Centralized admin authorization guard
│   ├── store-config.ts          # Central configuration & fallback settings
│   └── utils/
│       ├── rate-limiter.ts      # Multi-tier sliding-window rate limiter
│       ├── sanitize.ts          # Input sanitizer for XSS & injection prevention
│       ├── images.ts            # 2-Tier Supabase image transform optimizer
│       ├── districts.ts         # All 64 Bangladesh districts & shipping zones
│       └── formatters.ts        # Currency (৳), timestamps, and number formatters
├── proxy.ts                     # Edge security proxy (rate limit, scanner block, CSRF)
└── styles/
    ├── tokens.css               # Design tokens (colors, spacing, radii, typography)
    ├── globals.css              # Global resets, utility classes, animations
    ├── store.css                # Customer storefront styling & responsiveness
    └── admin.css                # High-contrast dark operations dashboard styling
```

---

## 🗄️ Database Schema & Relational Models

ShopBD runs on **PostgreSQL 15** with Row Level Security (RLS) enabled:

- `profiles`: User accounts, contact details, loyalty points, and role (`customer`, `moderator`, `admin`).
- `categories`: Category tree with slugs, banner images, and display sequencing.
- `products`: Catalog items with buying price (`cost_price`), selling price, video embeds (`video_url`), stock, and flash sale metadata.
- `product_variants`: Size, color, SKU, price modifier, and variant cost price.
- `orders` & `order_items`: Full customer order records, canonical pricing snapshot, delivery district, and payment metadata.
- `order_tracking`: Timestamped delivery milestones for customer visibility.
- `coupons`: Percentage or flat discount codes with minimum order amount and usage caps.
- `special_offers`: Hero banners and promotional slides managed from the storefront customizer.
- `inventory_logs`: Full audit trail for stock adjustments and restocks.
- `chat_messages`: Live customer-support conversation logs.
- `store_settings`: Key-value store for site-wide configuration (shipping rates, theme colors, payment numbers).

---

## 🚀 Quickstart & Local Installation

### 1. Prerequisites
- **Node.js**: v18.18.0 or higher
- **npm** or **pnpm**
- A free **Supabase** account ([https://supabase.com](https://supabase.com))

### 2. Clone & Install
```bash
git clone https://github.com/Ratul-NotFound/Ecomarce.git
cd Ecomarce
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the project root:

```env
# Supabase Database & Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Base Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Telegram Bot (Optional: for instant notifications & chat sync)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=-100xxxxxxxxxx
TELEGRAM_ORDERS_TOPIC_ID=2
TELEGRAM_MESSAGES_TOPIC_ID=3
TELEGRAM_WEBHOOK_SECRET=your-random-secret-token
```

### 4. Database Setup & Storage Buckets
1. Open your **[Supabase Dashboard](https://supabase.com/dashboard)** ➔ **SQL Editor**.
2. Run the script in [`supabase/migrations/sync_all_pending_migrations.sql`](supabase/migrations/sync_all_pending_migrations.sql).
3. Navigate to **Storage**, create a bucket named **`Products`**, and toggle **Public bucket** to **ON**.

### 5. Launch Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 6. Create an Admin Account
1. Register an account at **[http://localhost:3000/auth](http://localhost:3000/auth)**.
2. In the Supabase SQL Editor, promote the user to `admin`:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
   ```
3. Visit **[http://localhost:3000/admin](http://localhost:3000/admin)** to access your executive operations portal!

---

## 🚢 Production Deployment Guide

### Deploying to Vercel:
1. Push your repository to GitHub.
2. Import the project into **[Vercel](https://vercel.com)**.
3. In **Project Settings ➔ Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to `https://your-domain.vercel.app`)
   - Telegram credentials (if using notifications)
4. In **Supabase Dashboard ➔ Authentication ➔ URL Configuration**, add your production domain to the **Redirect URLs**:
   - `https://your-domain.vercel.app/**`
   - `https://your-domain.vercel.app/auth/callback`
5. Click **Deploy**!

---

## 🧪 Automated Testing & Verification Suite

Ensure zero regressions across all 39 production routes:

```bash
# 1. Type-check & Production Route Compilation
npx tsc --noEmit
npm run build

# 2. Verify Supabase Database Schema Health
node scripts/verify-supabase-sync.js
```

---

## 📄 License

This project is licensed under the **MIT License** — free to use and customize for both commercial and personal projects.