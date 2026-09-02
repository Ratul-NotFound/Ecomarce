# 🛍️ ShopBD — Modern Full-Stack E-Commerce & Management Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A modern, ultra-fast, and full-featured e-commerce web application tailored specifically for the Bangladeshi market. Built with **Next.js 16 (App Router)**, **Supabase (PostgreSQL + Auth + Storage + Realtime)**, **OOP Architecture**, and lightweight **CSS Design Tokens** with zero bloated animation dependencies.

🌐 **Live Demo**: [https://ecomarce-delta.vercel.app](https://ecomarce-delta.vercel.app)

---

## 🌟 Key Highlights & Features

### 🛍️ 1. Customer Storefront
- **Modern Glassmorphism UI**: High-end light aesthetic with smooth CSS transitions, responsive mobile tab bar, and sticky header.
- **Hero Carousel Banner**: Promotional banner carousel managed dynamically from the admin panel.
- **Flash Sale Engine**: Deals with live ticking countdown timers, percentage discounts, and stock meters.
- **Product Details (PDP)**: Multi-image gallery, interactive size/color variant selectors, live pricing modifiers, inventory indicator, verified customer reviews, and recommended products.
- **Cart & Instant Checkout**: Real-time coupon validator, automated shipping fee calculation across all **64 Bangladesh Districts** (৳60 inside Dhaka / ৳120 outside Dhaka / Free over ৳1500).
- **Payment Methods**: bKash & Nagad manual TrxID verification flows + Cash on Delivery (COD).
- **Order Tracking**: Multi-step visual delivery progress timeline (*Pending → Confirmed → Packaging → In Transit → Delivered*) with event timestamps.
- **User Portal**: Profile manager, multi-address book, loyalty rewards balance, and referral link generation.
- **Telegram Live Chat**: Real-time customer support widget synchronized with Supabase Realtime and Telegram Bot topics.
- **Progressive Web App (PWA)**: Installable on iOS & Android with service worker caching and offline fallback.

---

### 🛡️ 2. Executive Admin & Moderator Management Portal
- **Real-Time KPI Dashboard**: Lifetime gross revenue, total order volume, pending payment verification counter, low-stock alerts, and recent customer orders.
- **Full Product Catalog CRUD**: Multi-image upload to Supabase Storage, size/color variant matrix builder, stock thresholds, and flash sale toggles.
- **Order Fulfillment Center**: Filter orders by fulfillment status, 1-click bKash/Nagad TrxID verification, and tracking notes dispatcher.
- **Inventory & Profit Margin Calculator**: Quick restock buttons (`+5`, `+20`), low-stock indicators, and automated Gross Profit Margin calculator (*Selling Price vs. Unit Cost*).
- **Live Support Chat Manager (`/admin/messages`)**: Split-screen live conversation manager to reply to customer inquiries in real time with automated Telegram synchronization.
- **Regional Sales Analytics**: Top-selling products by volume and regional revenue breakdown across all 64 districts.
- **Storefront Customizer**: Publish homepage hero slides and reorder category display sequencing with instant live sync.
- **Global Store Settings**: Update brand metadata, delivery fees, bKash merchant numbers, Telegram credentials, and change the website's primary color theme live.
- **Invoice Generator**: Automated, printable, and PDF-downloadable customer and admin invoices.

---

## 🏛️ Architecture & Clean OOP Design

The codebase enforces strict **Object-Oriented Programming (OOP)** and **Domain-Driven Design (DDD)** principles to maximize reusability and eliminate redundant code:

```
src/
├── app/
│   ├── (store)/                 # Customer-facing storefront routes
│   │   ├── products/[slug]/     # Product detail page & interactive actions
│   │   ├── category/[slug]/     # Category catalog & filter sidebar
│   │   ├── cart/                # Shopping cart with coupon validator
│   │   ├── checkout/            # 64-district checkout with bKash/Nagad
│   │   ├── orders/              # Order history & live tracking timeline
│   │   ├── account/             # Customer profile, address book & loyalty
│   │   └── wishlist/            # Customer wishlist
│   ├── (admin)/admin/           # Protected Admin Dashboard & Management
│   │   ├── products/            # Product catalog CRUD & variant builder
│   │   ├── orders/              # Orders fulfillment & payment verification
│   │   ├── inventory/           # Stock management & profit margin calculator
│   │   ├── messages/            # Live support chat center (real-time)
│   │   ├── analytics/           # District-wise sales & conversion analytics
│   │   ├── customize/           # Hero banners & category sequencer
│   │   └── settings/            # Store branding & live theme color picker
│   ├── api/                     # Serverless API routes (orders, coupons, telegram)
│   └── auth/                    # Google OAuth & Email authentication
├── components/                  # Focused, reusable UI components
├── hooks/                       # useAuth, useCart, useToast
├── lib/
│   ├── services/                # OOP Domain Services (Order, Inventory, Coupon, Telegram, Invoice)
│   ├── supabase/
│   │   └── repositories/        # Generic BaseRepository & concrete domain repositories
│   ├── store-config.ts          # Central source of truth for store metadata
│   └── utils/                   # Formatters, i18n (EN/BN), Bangladesh districts
└── styles/
    ├── tokens.css               # Central CSS custom property design token system
    ├── globals.css              # Typography, resets, badges, skeleton loaders
    ├── store.css                # Customer storefront theme
    └── admin.css                # Dark theme management dashboard
```

---

## 🚀 Quick Start & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Ratul-NotFound/Ecomarce.git
cd Ecomarce
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Telegram Bot (For live order alerts & chat sync)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=-100xxxxxxxxxx
TELEGRAM_ORDERS_TOPIC_ID=2
TELEGRAM_MESSAGES_TOPIC_ID=3
TELEGRAM_WEBHOOK_SECRET=your-random-secret-token
```

### 4. Run Database Migrations
Run the SQL migration scripts in your **Supabase SQL Editor** in numerical order:
1. `supabase/migrations/001_initial_schema.sql` (20 tables, auto triggers, sequence generators)
2. `supabase/migrations/002_rls_policies.sql` (Zero-trust Row Level Security & non-recursive helper functions)
3. `supabase/migrations/003_indexes.sql` (Trigram text search and performance indexes)
4. `supabase/migrations/004_seed_data.sql` (Default store settings and starter categories)

### 5. Create Supabase Storage Bucket
- In Supabase ➔ **Storage** ➔ Create a new bucket named **`Products`** (or `products`).
- Toggle **Public bucket** to **ON**.

### 6. Run the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 👑 Creating Your First Admin Account

1. Register an account at **[http://localhost:3000/auth](http://localhost:3000/auth)** using Google or Email.
2. Open your **Supabase SQL Editor** and grant admin privileges:
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
   ```
3. Access the Admin Control Panel at **[http://localhost:3000/admin](http://localhost:3000/admin)**!

---

## 🤖 Telegram Bot Automation Setup

1. Create a bot with **[@BotFather](https://t.me/BotFather)** to get your `TELEGRAM_BOT_TOKEN`.
2. Create a Telegram Supergroup, add your bot as an **Administrator**, and create 2 topics: `Orders` and `Messages`.
3. Set your Group Chat ID (`-100...`) and Topic IDs in **Admin Settings** (`/admin/settings`).
4. *(Optional 2-Way Reply Webhook)*: When deploying to Vercel, register your webhook with Telegram:
   ```text
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<YOUR_DOMAIN>/api/telegram/webhook&secret_token=<SECRET>
   ```

---

## 📦 Production Deployment (Vercel)

1. Import the repository into **[Vercel](https://vercel.com)**.
2. In **Project Settings ➔ Environment Variables**, add the keys from your `.env.local`.
3. In **Supabase ➔ Authentication ➔ URL Configuration**, add your Vercel URL to Redirect URLs:
   - `https://your-domain.vercel.app/auth/callback`
   - `https://your-domain.vercel.app/**`
4. Click **Deploy**!

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use it for personal or commercial projects.#   m u l t i - v e n d o r -  
 