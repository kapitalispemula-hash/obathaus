# MASTERPLAN: CAFE POS — POINT OF SALE & FINANCIAL ANALYTICS

**Document Version:** 1.0  
**Status:** Approved Architectural Blueprint & Phased Roadmap  
**Target Platform:** Web Application & Progressive Web App (PWA)  
**Stack:** Next.js (App Router, TypeScript, Tailwind CSS), Supabase (Auth, Postgres, RLS, Storage, RPC)  
**Default Language:** Bahasa Indonesia  
**Default Currency:** IDR (Rp)  
**Default Timezone:** Asia/Makassar (WITA)  

---

## 1. Executive Summary & Architecture Overview

Cafe POS is an enterprise-grade, modern Point of Sale (POS) and Financial Analytics platform built specifically for cafes, coffee shops, and eateries. It bridges lightning-fast operational cashier checkout with deep managerial financial intelligence: **Cost of Goods Sold (HPP) snapshot tracking**, **Gross Profit analysis**, **Operating Expenses management**, and **Net Operating Profit (Keuntungan Bersih Operasional)** reporting.

### Core Architectural Principles
1. **Zero-Trust Client Pricing**: Product prices and HPP are strictly retrieved and validated server-side in Supabase database transactions (`RPC`). Client cart calculations are indicative only.
2. **Immutable Financial Snapshots**: When a sale is made, `unit_price`, `unit_hpp`, and proportional discounts are permanently recorded in `transaction_items`. Historical reports remain 100% stable even if menu prices or raw ingredient costs change later.
3. **Atomic Checkout Engine**: Checkouts execute within a single PostgreSQL transaction with idempotency protection against double-charging or network glitches.
4. **Strict Multi-Role Security & RLS**: Admin has complete access to financial reports, HPP, margins, and settings. Cashiers are strictly quarantined to the POS interface, receipt printing, and their own transaction history. Cashiers can never view HPP or margins.
5. **Progressive Web App & Responsive Design**: Seamless touch-optimized layout for mobile phones (bottom-sheet cart) and tablets/desktops (dual-pane catalog & order receipt).

```
                      +---------------------------------------+
                      |               NEXT.JS                 |
                      | (App Router + Tailwind + TypeScript)  |
                      +-------------------+-------------------+
                                          |
                                          | Server Actions / Route Handlers
                                          v
                      +---------------------------------------+
                      |            SUPABASE BACKEND           |
                      +-------------------+-------------------+
                      |                                       |
    +-----------------+-----------------+                     |
    |                 |                 |                     |
    v                 v                 v                     v
+-------+      +-------------+   +--------------+    +------------------+
| Auth  |      | PostgreSQL  |   |   Storage    |    |   Atomic RPC     |
| (RBAC)|      | (Tables+RLS)|   | (Menu Images)|    | (process_checkout|
+-------+      +-------------+   +--------------+    |  demo_reset, etc)|
                                                     +------------------+
```

---

## 2. Database Schema & Migration Specification

### 2.1 Table Definitions

#### `profiles`
Links directly to `auth.users(id)`.
- `id` (uuid, PK, references `auth.users.id` on delete cascade)
- `email` (text, not null)
- `full_name` (text, not null)
- `role` (text, check `role in ('admin', 'cashier')`, default `'cashier'`)
- `is_active` (boolean, default true)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

#### `store_settings`
Singleton or multi-store configuration table.
- `id` (uuid, PK, default gen_random_uuid())
- `store_name` (text, not null, default 'Kopi Antigravity')
- `tagline` (text, default 'Artisanal Coffee & Kitchen')
- `address` (text, default 'Jl. Ahmad Yani No. 88, Makassar')
- `phone` (text, default '0812-3456-7890')
- `email` (text, default 'hello@kopi-antigravity.id')
- `logo_url` (text)
- `timezone` (text, default 'Asia/Makassar')
- `invoice_prefix` (text, default 'INV')
- `invoice_counter` (bigint, default 1)
- `receipt_paper_size` (text, check `receipt_paper_size in ('58mm', '80mm')`, default '58mm')
- `receipt_header` (text, default 'Selamat Datang di Kopi Antigravity')
- `receipt_footer` (text, default 'Terima kasih atas kunjungan Anda!\nFollow IG: @kopi.antigravity')
- `tax_percentage` (numeric(5,2), default 10.00)
- `is_tax_inclusive` (boolean, default false)
- `discount_enabled` (boolean, default true)
- `max_discount_percentage` (numeric(5,2), default 50.00)
- `currency` (text, default 'IDR')
- `language` (text, default 'id')
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

#### `categories`
- `id` (uuid, PK, default gen_random_uuid())
- `name` (text, not null)
- `slug` (text, unique, not null)
- `description` (text)
- `icon_name` (text)
- `sort_order` (integer, default 0)
- `is_active` (boolean, default true)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

#### `products`
- `id` (uuid, PK, default gen_random_uuid())
- `name` (text, not null)
- `sku` (text, unique)
- `category_id` (uuid, references `categories(id)` on delete restrict)
- `description` (text)
- `image_url` (text)
- `selling_price` (numeric(12,2), not null, check `selling_price > 0`)
- `hpp` (numeric(12,2), not null, check `hpp >= 0`)
- `is_active` (boolean, default true)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

#### `transactions`
- `id` (uuid, PK, default gen_random_uuid())
- `invoice_number` (text, unique, not null)
- `cashier_id` (uuid, references `profiles(id)`)
- `subtotal` (numeric(12,2), not null)
- `discount_total` (numeric(12,2), default 0)
- `tax_total` (numeric(12,2), default 0)
- `grand_total` (numeric(12,2), not null)
- `payment_method` (text, check `payment_method in ('cash', 'qris', 'debit', 'transfer')`, not null)
- `amount_received` (numeric(12,2), not null)
- `change_amount` (numeric(12,2), default 0)
- `status` (text, check `status in ('completed', 'voided', 'refunded')`, default 'completed')
- `void_reason` (text)
- `voided_at` (timestamptz)
- `voided_by` (uuid, references `profiles(id)`)
- `idempotency_key` (text, unique)
- `notes` (text)
- `created_at` (timestamptz, default now())

#### `transaction_items`
- `id` (uuid, PK, default gen_random_uuid())
- `transaction_id` (uuid, references `transactions(id)` on delete cascade)
- `product_id` (uuid, references `products(id)`)
- `product_name` (text, not null)
- `product_sku` (text)
- `unit_price` (numeric(12,2), not null)
- `unit_hpp` (numeric(12,2), not null)
- `quantity` (integer, not null, check `quantity > 0`)
- `subtotal` (numeric(12,2), not null)
- `discount_allocated` (numeric(12,2), default 0)
- `created_at` (timestamptz, default now())

#### `transaction_refunds` & `transaction_refund_items`
- Tracks full or partial refunds, reversing net revenue and restoring HPP.

#### `expense_categories` & `operating_expenses`
- `id` (uuid, PK, default gen_random_uuid())
- `category_name` (text, e.g., 'Sewa Tempat', 'Listrik & Air', 'Gaji Barista', 'Bahan Kebersihan', 'Pemasaran')
- `title` (text, not null)
- `amount` (numeric(12,2), not null, check `amount > 0`)
- `expense_date` (date, not null)
- `description` (text)
- `created_by` (uuid, references `profiles(id)`)
- `created_at` (timestamptz, default now())

---

## 3. Financial Calculation Formulas & Business Logic

### 3.1 Key Metrics
1. **Net Revenue (Omzet Bersih)**:
   $$\text{Net Revenue} = \sum_{\text{completed transactions}} (\text{subtotal} - \text{discount\_total}) - \text{Refunds}$$
   *(Taxes collected for government are excluded from operational revenue).*
2. **Cost of Goods Sold (HPP)**:
   $$\text{Total HPP} = \sum_{\text{completed items}} (\text{quantity} \times \text{unit\_hpp}) - \text{Refunded HPP}$$
3. **Gross Profit (Laba Kotor)**:
   $$\text{Gross Profit} = \text{Net Revenue} - \text{Total HPP}$$
4. **Operating Expenses (Biaya Operasional)**:
   $$\text{Operating Expenses} = \sum \text{expense amount in selected period}$$
5. **Net Operating Profit (Keuntungan Bersih Operasional)**:
   $$\text{Net Operating Profit} = \text{Gross Profit} - \text{Operating Expenses}$$
6. **Net Profit Margin (NPM)**:
   $$\text{NPM} = \begin{cases} \left( \frac{\text{Net Operating Profit}}{\text{Net Revenue}} \times 100 \right)\% & \text{if Net Revenue} > 0 \\ 0\% & \text{if Net Revenue} \le 0 \end{cases}$$
   *(Guard against zero division as mandated by PRD Section 20 Scenario 7).*

---

## 4. Atomic Checkout RPC Function (`process_atomic_checkout`)

The checkout operation executes entirely within an ACID transaction:
1. Verify user authentication and valid active cashier profile.
2. Check `idempotency_key` (if already completed, return existing transaction to prevent double submission).
3. Fetch current live prices & HPP from `products` table for all requested item IDs. Verify active status.
4. Calculate authoritative item subtotals, proportional discount distribution, tax amount, and grand total.
5. Validate payment: For `cash`, verify `amount_received >= grand_total`, compute `change_amount`. For `qris`, `debit`, `transfer`, verify simulated confirmation.
6. Acquire sequence row lock on `store_settings` to generate formatted invoice number: e.g., `INV-YYYYMMDD-XXXX`.
7. Insert `transactions` record.
8. Insert all `transaction_items` with immutable snapshots (`unit_price`, `unit_hpp`, `discount_allocated`).
9. Commit transaction and return full payload.

---

## 5. Phased Implementation Roadmap

- [ ] **Phase 1: Project Initialization & Infrastructure**
  - Initialize Next.js 15 project with TypeScript, Tailwind CSS, Lucide icons, shadcn-compatible styling, and PWA manifest.
  - Set up Supabase client (browser client, server client, middleware helpers).
  - Create `.env.example` and `.env.local` templates.
- [ ] **Phase 2: Database Migrations & Seed Engine**
  - Create Supabase SQL migration files containing all tables, RLS policies, views, triggers, and the `process_atomic_checkout` RPC function.
  - Create comprehensive realistic demo seed SQL: 8 categories (Espresso Based, Manual Brew, Non-Coffee, Artisanal Tea, Pastry & Bakery, Main Course, Light Bites, Bottled Beverage), 36 products with accurate selling prices & HPP, 30 days of historical transactions, expense categories & expenses.
  - Create `reset_demo_data` RPC.
- [ ] **Phase 3: Authentication & RBAC Middleware**
  - Implement login page with email, password toggle, loading state, and error handling.
  - Implement Next.js middleware enforcing role-based routing (`admin` -> `/admin/dashboard`, `cashier` -> `/pos`). Block non-admin access to financial routes.
  - Implement Cashier User Management under `/admin/users` (Admin can create cashier accounts and toggle active status).
- [ ] **Phase 4: Product & Category Management**
  - Build Category CRUD with sort ordering and active toggle (`/admin/categories`).
  - Build Product CRUD (`/admin/products`) with SKU, category selector, selling price, HPP, automatic unit gross profit and margin calculation, image upload, search, and category filters.
- [ ] **Phase 5: Responsive Point of Sale (POS) Interface**
  - Build dual-layout POS: Tablet/Desktop split view and Smartphone two-column view with slide-up bottom sheet cart.
  - Catalog browsing with category pills, live product search, active product validation.
  - Cart state management with persistent session backup, item quantity modifiers, order notes, subtotal, tax, and discount computations.
- [ ] **Phase 6: Payment Simulation & Checkout Workflow**
  - Build payment modal supporting Cash (with quick amount buttons and change calculator), QRIS (with dynamic QR preview), Debit, and Bank Transfer.
  - Call atomic RPC checkout with idempotency key.
  - Display post-checkout success modal with invoice number, change calculation, print receipt trigger, and new order button.
- [ ] **Phase 7: Thermal Receipt & Printing Engine**
  - Design thermal receipt templates (58mm and 80mm).
  - Integrate window.print thermal CSS stylesheet and printable modal.
  - Support reprinting from transaction history. Strictly omit HPP and profit metrics from customer receipts.
- [ ] **Phase 8: Transaction History, Void & Refund System**
  - Transaction list table (`/admin/transactions` and `/pos/history`).
  - Filter by date range, invoice number, cashier, payment method, and status.
  - Transaction details modal.
  - Admin Void transaction modal with mandatory reason.
  - Admin Refund workflow (full and partial) updating financial records.
- [ ] **Phase 9: Financial Analytics & Managerial Reports**
  - Build `/admin/reports` with period selector: Hari ini, Kemarin, 7 hari, 30 hari, Bulan ini, Tahun ini, Custom range.
  - Key financial cards: Omzet Bersih, Total HPP, Laba Kotor, Biaya Operasional, Keuntungan Bersih Operasional, Net Profit Margin (NPM).
  - Interactive charts (Revenue vs HPP vs Net Profit trends, Payment methods pie chart, Top products by volume & profit contribution).
  - Export functionality: PDF print-friendly report and CSV/Excel export.
- [ ] **Phase 10: Operating Expenses Management**
  - Build `/admin/expenses` for tracking operational overhead (Rent, Utilities, Wages, Supplies, Marketing).
  - Add, edit, delete expenses with date picker and categories.
- [ ] **Phase 11: Store Settings & Personalization**
  - Store profile customization (Name, phone, address, logo, timezone Asia/Makassar).
  - Receipt customizations (Header, footer, paper size).
  - Tax (PPN) percentage and inclusive/exclusive toggle; Discount max limit toggle.
  - Dark/Light mode theme toggle.
- [ ] **Phase 12: Progressive Web App (PWA) & Offline Safeguards**
  - Setup Web App Manifest, application icons, and service worker.
  - Add online/offline network indicator banner.
  - Disallow checkout when offline to ensure atomic database storage.
- [ ] **Phase 13: Demo Data Reset Feature**
  - Admin button in Settings to reset demo transactions and expenses back to initial pristine 30-day simulated state.
- [ ] **Phase 14: Quality Assurance & Scenario Testing**
  - Run verification tests on all PRD Section 20 Scenarios (Basic Transaction, Discount, Operating Expenses, HPP Change snapshot test, Voided transaction, Partial Refund, Zero Revenue NPM divide-by-zero protection).

---

## 6. Definition of Done Checklist

Every phase must pass unit & integration testing with zero console errors, full TypeScript type safety (`tsc --noEmit`), and strict adherence to the PRD.
