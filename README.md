# 🛍️ ShopBD — Modern Full-Stack E-Commerce Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-7B1FA2?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

A state-of-the-art, high-performance, and mobile-first e-commerce web platform engineered specifically for the Bangladeshi digital marketplace. Built on **Next.js 16 (App Router)**, **Supabase (PostgreSQL + Auth + Storage + Realtime)**, **Domain-Driven OOP Architecture**, and an ultra-lightweight **Vanilla CSS Design Token System** that achieves 60–120 FPS micro-animations with zero bulky CSS framework overhead.

🌐 **Live Demo**: [https://ecomarce-delta.vercel.app](https://ecomarce-delta.vercel.app)

---

## 📑 Table of Contents
- [Project Philosophy & Approach](#-project-philosophy--approach)
- [Technology Stack](#-technology-stack)
- [Key Features](#-key-features)
  - [Customer Storefront](#1-customer-storefront)
  - [Executive Admin & Operations Portal](#2-executive-admin--operations-portal)
- [Architecture & Design Patterns](#-architecture--design-patterns)
- [Database Schema & Migrations](#-database-schema--migrations)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Telegram Bot Automation](#-telegram-bot-automation)
- [Production Deployment](#-production-deployment)
- [Verification & Quality Assurance](#-verification--quality-assurance)
- [License](#-license)

---

## 💡 Project Philosophy & Approach

1. **Native Performance Over Bloat**:
   - Instead of heavy CSS frameworks (e.g. Tailwind or component libraries with run-time JS overhead), ShopBD utilizes a dedicated **CSS Custom Properties Design Token System** (`tokens.css`). This yields sub-100ms first paint times, near-instant hydration, and buttery smooth 60–120 FPS performance even on budget smartphones.
2. **2-Tier Intelligent Image Delivery**:
   - High-resolution e-commerce images can degrade mobile performance. ShopBD incorporates automated CDN image transformations:
     - **Thumbnails (`thumb`)**: Scaled down to `320×320` with `quality: 70` (~15–25 KB) for product grids, carousels, carts, search autocomplete, and admin listings.
     - **High Definition (`full`)**: Served at `900×900` with `quality: 85` strictly on product detail large views and zoom modals.
3. **Domain-Driven Clean Architecture (OOP)**:
   - Eliminates bloated API routes and duplicate Supabase calls by abstracting database logic into a strongly typed `BaseRepository<T>` pattern and cohesive domain services (`InventoryService`, `OrderService`, `CouponService`, `TelegramService`, `InvoiceService`).
4. **Tailored for Bangladesh E-Commerce**:
   - Native support for all **64 Bangladesh districts** with automated regional shipping tiers (৳60 inside Dhaka / ৳120 outside Dhaka / Free over threshold).
   - Native **bKash** and **Nagad** manual transaction verification (TrxID) alongside **Cash on Delivery (COD)**.
   - Dual-language typography (English + Bangla) and localized currency formatting (`৳`).

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3.4 (App Router, Webpack) | Hybrid Server & Client Rendering, React Server Components |
| **Language** | TypeScript 5.0+ | Strict type safety, domain models, interface contracts |
| **Frontend UI** | HTML5, Modern Vanilla CSS, Lucide React | Glassmorphism, CSS grid/flexbox, zero-overhead animations |
| **Database** | Supabase (PostgreSQL 15) | Relational persistence, Trigram search, Row Level Security (RLS) |
| **Authentication** | Supabase Auth | Google OAuth, Email/Password, Magic Link, session tokens |
| **File Storage** | Supabase Storage (S3 CDN) | Optimized image hosting, dynamic CDN URL transforms |
| **Realtime** | Supabase Realtime (WebSockets) | Live chat updates, instant order notifications |
| **Chat & Alerts**| Telegram Bot API | Automated 2-way customer support chat & order notifications |
| **PWA Engine** | `next-pwa`, Service Workers | Mobile installability, offline fallback, cache policies |

---

## ✨ Key Features

### 1. Customer Storefront
- **Glassmorphic Hero Carousel**: Dynamic promotional banner carousel managed in real-time from the Admin Customizer.
- **Flash Sale Engine**:
  - Horizontal swipe snap-track on mobile with uniform card dimensions and zero layout shift.
  - Live synchronized countdown timers with hours, minutes, and seconds digital pills.
- **Harmonious Product Cards**:
  - **Balanced Aspect Ratio**: Compact ~1:1.7 mobile e-commerce ratio and ~1:1.5 on desktop to maximize vertical viewport efficiency.
  - **Social Proof Layout**: Clean category placement on the left with dedicated rating badges on the right (`white-space: nowrap; flex-shrink: 0;`). Ratings never break into multi-story lines.
  - **Single-Line Pricing**: Sale price and base price strikethrough with `{sold} sold` metrics.
  - **Instant Dual Actions**: Direct "Add to Cart" and "Buy Now" with visual checkmark feedback.
- **Product Details Page (PDP)**:
  - Multi-image gallery with thumbnail selection and zoom modal.
  - YouTube, Google Drive, or MP4 video streaming preview.
  - Interactive multi-tier variant selector (e.g. Size, Color, Material) with live price adjustment and stock indicators.
  - Customer review submission with verified purchase badge.
- **Live Search Autocomplete**:
  - PostgreSQL Trigram (`pg_trgm`) fuzzy matching with typo tolerance across English and Bangla names.
  - Instant suggestion dropdown with product thumbnail, category, and direct price.
- **Cart & Dynamic 64-District Checkout**:
  - Real-time coupon validator with minimum order and usage checks.
  - Dynamic delivery fee computation based on customer's selected district.
  - Payment modes: bKash (Personal/Merchant), Nagad, and Cash on Delivery (COD).
- **Visual Order Tracking Timeline**:
  - Multi-step delivery progress indicator: *Pending → Confirmed → Packaging → In Transit → Delivered*.
  - Step-by-step history log with exact timestamps.
- **Live Support Chat Widget**:
  - Synchronous customer chat connected to Supabase Realtime and the store's Telegram Supergroup.
- **Installable PWA**:
  - Installable directly to home screen on iOS and Android with offline fallback screen.

---

### 2. Executive Admin & Operations Portal

Accessible at `/admin` for users with the `admin` or `moderator` role:

- **Executive Analytics Dashboard (`/admin/analytics`)**:
  - Real-time revenue metrics, average order value (AOV), total order volume, and pending payment queue.
  - District-wise revenue breakdown across Bangladesh.
- **Catalog Management (`/admin/products`)**:
  - Create, update, and toggle active products.
  - Multi-image drag-and-drop upload to Supabase Storage with main cover selection.
  - Embedded product video URL support (YouTube/Google Drive).
  - Multi-tier variant builder with custom pricing and stock.
- **Inventory & Profit Margin Center (`/admin/inventory`)**:
  - Unit Cost Tracking (COGS) vs Selling Price.
  - Live Gross Profit Margin (%) and estimated gross profit calculator.
  - Quick-restock increment buttons (`+5`, `+20`, `+50`) and low-stock indicators.
- **Order Fulfillment Center (`/admin/orders`)**:
  - Filter orders by status (*Pending, Confirmed, Shipped, Delivered, Cancelled*).
  - 1-Click bKash/Nagad TrxID verification and receipt approval.
  - Order dispatch note manager with customer timeline sync.
- **Live Support Hub (`/admin/messages`)**:
  - Real-time customer support chat workspace.
  - Bi-directional Telegram synchronization (reply from admin dashboard or directly from Telegram).
- **Storefront Customizer (`/admin/customize`)**:
  - Upload and publish promotional hero banner slides with call-to-action buttons.
  - Reorder categories sequencing and showcase deals.
- **Global Settings & Theme Engine (`/admin/settings`)**:
  - Live Primary Color Theme Customizer.
  - Delivery charge modifiers (Inside Dhaka / Outside Dhaka / Free threshold).
  - Payment credentials (bKash & Nagad account numbers).
  - Telegram bot token, chat ID, and topic configuration.
- **Automated Invoice Generator (`/api/invoices/[orderId]`)**:
  - Clean, printable, PDF-ready branded invoices with QR code and breakdown.

---

## 🏛️ Architecture & Design Patterns

The codebase adheres to **Object-Oriented Programming (OOP)** and **Domain-Driven Design (DDD)** principles:

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
│   ├── api/                     # Next.js API route handlers
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
│   │   └── repositories/        # Generic BaseRepository<T> & concrete DAOs
│   ├── store-config.ts          # Central configuration & fallback settings
│   └── utils/
│       ├── images.ts            # 2-Tier Supabase image transform optimizer
│       ├── districts.ts         # All 64 Bangladesh districts & shipping zones
│       └── formatters.ts        # Currency (৳), timestamps, and number formatters
└── styles/
    ├── tokens.css               # Design tokens (colors, spacing, radii, typography)
    ├── globals.css              # Global resets, utility classes, animations
    ├── store.css                # Customer storefront styling & responsiveness
    └── admin.css                # High-contrast dark operations dashboard styling
```

---

## 🗄️ Database Schema & Migrations

ShopBD runs on **PostgreSQL 15** hosted on Supabase.

### Core Tables:
- `profiles`: User accounts, contact details, loyalty points, and role (`customer`, `moderator`, `admin`).
- `categories`: Hierarchical category tree with slugs, banner images, and display ordering.
- `products`: Product catalog with buying price (`cost_price`), sale price, video embeds (`video_url`), stock, and flash sale metadata.
- `product_variants`: Size, color, SKU, price modifier, and variant cost price.
- `orders` & `order_items`: Complete customer order transactions, pricing snapshot, and payment records.
- `order_tracking`: Timestamped delivery milestones for customer visibility.
- `coupons`: Percentage or flat discount codes with minimum order amount and usage caps.
- `special_offers`: Hero banners and promotional slides for storefront customizer.
- `inventory_logs`: Audit trail for stock adjustments and restocks.
- `chat_messages`: Live customer-support conversation logs.
- `store_settings`: Key-value store for site-wide configuration.

### Running Migrations:
All pending updates are consolidated into a single idempotent script:

1. Open your **[Supabase SQL Editor](https://supabase.com/dashboard)**.
2. Execute the script in [`supabase/migrations/sync_all_pending_migrations.sql`](supabase/migrations/sync_all_pending_migrations.sql).
3. Verify your database health in the terminal:
   ```bash
   node scripts/verify-supabase-sync.js
   ```

---

## 🚀 Getting Started & Local Setup

### 1. Prerequisites
- **Node.js**: v18.18.0 or higher
- **npm** or **pnpm**
- A **Supabase** account (Free tier works seamlessly)

### 2. Installation
```bash
# 1. Clone the repository
git clone https://github.com/Ratul-NotFound/Ecomarce.git
cd Ecomarce

# 2. Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Telegram Bot (Optional: for live order alerts & chat sync)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=-100xxxxxxxxxx
TELEGRAM_ORDERS_TOPIC_ID=2
TELEGRAM_MESSAGES_TOPIC_ID=3
TELEGRAM_WEBHOOK_SECRET=your-random-secret-token
```

### 4. Supabase Storage Setup
1. In the Supabase Dashboard, navigate to **Storage**.
2. Create a bucket named **`Products`**.
3. Toggle **Public bucket** to **ON**.

### 5. Launch the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

### 6. Create Your Admin User
1. Register an account at **[http://localhost:3000/auth](http://localhost:3000/auth)**.
2. Promote your account to `admin` via the Supabase SQL Editor:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
   ```
3. Visit **[http://localhost:3000/admin](http://localhost:3000/admin)** to access the management portal.

---

## 🤖 Telegram Bot Automation

ShopBD integrates with Telegram Supergroups using Topics for hands-off store operations:

1. Create a bot with **[@BotFather](https://t.me/BotFather)** to receive your `TELEGRAM_BOT_TOKEN`.
2. Create a private Supergroup on Telegram, enable **Topics**, and add your bot as an **Administrator**.
3. Create two topics:
   - **`Orders`**: Receives instant notifications for new orders with customer details, delivery district, items, and bKash/Nagad TrxID.
   - **`Messages`**: Synchronizes live customer support inquiries.
4. Input your `TELEGRAM_CHAT_ID` (`-100...`) and Topic IDs into `.env.local` or the **Admin Settings (`/admin/settings`)**.
5. *(Optional Bi-Directional Webhook)*: Set up your live Vercel webhook so staff can reply directly inside Telegram to message customers:
   ```text
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<YOUR_DOMAIN>/api/telegram/webhook&secret_token=<SECRET>
   ```

---

## 🚢 Production Deployment

### Deploying to Vercel:
1. Push your code to your GitHub repository.
2. Import the project into **[Vercel](https://vercel.com)**.
3. In **Project Settings ➔ Environment Variables**, configure:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to your production domain `https://your-domain.vercel.app`)
4. In **Supabase Dashboard ➔ Authentication ➔ URL Configuration**, append your domain to the **Redirect URLs**:
   - `https://your-domain.vercel.app/**`
   - `https://your-domain.vercel.app/auth/callback`
5. Click **Deploy**!

---

## 🧪 Verification & Quality Assurance

To ensure zero regressions across production routes, run the automated verification suite:

```bash
# 1. Type-check & Production Route Build (39 Routes)
npm run build

# 2. Verify Supabase Database Schema Synchronization
node scripts/verify-supabase-sync.js
```

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use and adapt it for personal or commercial projects.