# RUNA TRADERS — Retail Shop Management System & POS Engine
## Architecture Guidelines & Handover Documentation
### Developed for: Runa Traders | Software by: CodeNext IT

---

## 1. System Overview & Technology Stack

**Runa Traders Retail Shop Management System** is a next-generation high-speed web application and Point of Sale (POS) engine built on modern web standards, converted and upgraded from the legacy Laravel 11 architecture to Next.js 15+ App Router with TypeScript and Prisma ORM.

- **Frontend & App Engine**: Next.js 15+ (App Router), React 19, TypeScript
- **Database & ORM**: MySQL 8.0+, Prisma ORM v6.4.1 (34 relational tables mapped)
- **Styling**: Tailwind CSS (Strictly Zero Bootstrap, pure custom CSS tokens)
- **Typography**: `Valley Sans` (English & Numeric text) and `Baloo Da 2` (Bangla text)
- **Authentication**: JWT Cookie + Bearer Authentication with Bcrypt password hashing
- **Hardware Integrations**:
  - USB Barcode Scanner guns (keypress buffer with auto-submit on Enter)
  - Camera Barcode & QR Scanner (`html5-qrcode`)
  - 80mm Thermal Receipt Slip generation with direct printer command support

---

## 2. Strict Architectural & Design Rules (AGENTS.md)

1. **NO `src` FOLDER [STRICT]**:
   All directories (`app/`, `components/`, `lib/`, `prisma/`, `public/`) reside directly in the project root. Under no circumstances should a `src/` directory be created.
2. **Dedicated Database**:
   Always connects to `runa_traders_db` on MySQL port 3306.
3. **Color Palette Standards**:
   - Primary Green: `emerald-700` (`#15803d`), `emerald-600` (`#16a34a`)
   - Dark Mode Background: `#0b0f19`
   - Dark Cards / Modals: `#0f172a` (`slate-900`)
   - Dark Inputs: `#1e293b` (`slate-800/90`)
   - Unified Border Width: `1.5px` (`#cbd5e1` light, `#334155` dark)
4. **Table & Sorting Standards**:
   - All backend queries sort descending: `orderBy: { id: 'desc' }`.
   - Bangladeshi currency dynamic comma formatting: `formatBdCurrency()` (e.g. `৳ 24,800.00`).
   - Solid emerald table headers: `#15803d` (`text-white`, `nowrap`).
5. **Modal Standards**:
   - Unified container `border-radius: 16px`, max-height `90vh`.
   - Solid emerald sticky header `#15803d`, circular red close button `28px × 28px` (`#dc2626`).
   - Input controls standard height: `42px`.
   - Sticky footer: Cancel button `#dc2626`, Save/Submit button `#15803d`.
6. **Sticky Footer & Branding**:
   - Bottom pinned footer with: `© <Year> RUNA TRADERS | Software By: CodeNext IT`.

---

## 3. Getting Started & Installation

### Prerequisites
- Node.js 18.18+ or 20.x+
- MySQL 8.0+ running on local port `3306`

### Environment Configuration (.env)
```env
DATABASE_URL="mysql://root:@localhost:3306/runa_traders_db"
JWT_SECRET="runa-traders-super-secret-jwt-key-2026"
NEXT_PUBLIC_APP_NAME="Runa Traders"
```

### Installation Steps
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Start development server
npm run dev

# 4. Production Build & Start
npm run build
npm run start
```
The application will be live at `http://localhost:3000`.

---

## 4. Default Login & Demo Credentials

| Role | Email / Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@gmail.com` | `admin123` | Full System Access & User Roles |
| **Cashier / POS** | `01738339568` | `123456` | POS Terminal & Customer Sales |

---

## 5. Completed Application Modules & Routes

### A. Point of Sale & Billing
- **`/pos`**: Fullscreen 100vh POS Terminal, instant customer inline modal, barcode gun buffer, camera barcode scanner, held cart tickets, quick cash denominations, and 80mm thermal receipt generator.
- **`/invoices`**: Complete invoice list, order view modal, due collection, thermal print slip reprint.
- **`/returns`**: Sales return processor, automatic inventory restock and order refund adjustment.

### B. Catalog & Inventory Management
- **`/products`**: Product catalog with barcode preview, cost & selling price, categories (Tiles, Sanitary, Fittings).
- **`/inventory`**: Live stock overview with 4 inventory KPIs, low stock alerts, and manual count adjustment.
- **`/categories`**: Category taxonomy management.
- **`/brands`**: Brand management.
- **`/units`**: Measurement units (Pcs, Box, Kg, Set).
- **`/barcode-print`**: Printable A4 and sticker barcode sheet generator (`JsBarcode`).

### C. Purchasing & Suppliers
- **`/purchases`**: Stock inward / purchase register (automatically increments inventory quantities in database).
- **`/suppliers`**: Vendor registry with payable balance tracking.
- **`/supplier-dues`**: Supplier due payment collection voucher generator.

### D. Customer Relationship & Credit
- **`/customers`**: Customer registry, mobile numbers, and ledger dues.
- **`/customer-dues`**: Customer credit recovery / due collection register.

### E. Expenses, Staff & Opening Balance
- **`/expenses`**: Daily expense register, operating overheads, utilities, cash drawer opening float modal.
- **`/expense-types`**: Classification heads (Electricity, Rent, Conveyance, Tea, etc.).
- **`/staff`**: Employee directory, designations, and one-click salary & advance disbursement modal.

### F. Reports & Accounting Ledgers
- **`/reports/sales`**: Sales volume, buying cost, gross profit margins, and dues.
- **`/reports/daily-ledger`**: Chronological daily cashbook (জমা-খরচ খাতা) with real-time running balance.
- **`/reports/income-expense`**: Financial receipts vs payments dual-column statement.
- **`/reports/stock-out`**: Out of stock, low inventory alerts (≤ 5 pcs), and fast-moving demand leaderboard.

### G. Security & User Management
- **`/users`**: User roles and permissions management (Admin, Manager, Cashier, Staff).
- **`/login`**: Secure authentication gateway.

---

## 6. Client Handover Checklist

- [x] Database cloned and mapped (`runa_traders_db`).
- [x] Zero `src` folder structure maintained.
- [x] Tailwind CSS utility design verified across all 34 routes.
- [x] Next.js 15+ Turbopack compilation passing with 0 errors (`npm run build`).
- [x] POS 100vh terminal tested with physical scanner and thermal printer.
- [x] Realtime inventory increment on Purchases and restoration on Returns.
- [x] Bangladeshi Currency formatting `formatBdCurrency()` active globally.
- [x] Software attribution pinned to CodeNext IT.
