# PROTIKKHA ELECTRIC — Retail Shop Management System & POS Engine
## Architecture Guidelines & Handover Documentation
### Developed for: Protikkha Electric | Software by: CodeNext IT
### Repository: [https://github.com/imtiaz-cnits/protikkha-electric](https://github.com/imtiaz-cnits/protikkha-electric)

---

## 1. System Overview & Technology Stack

**Protikkha Electric Retail Shop Management System** is a next-generation high-speed web application and Point of Sale (POS) engine built on modern web standards, designed specifically for electrical retail POS and inventory management (wires, cables, pipes, switches, sockets, circuit breakers, nuts, bolts, and fittings).

- **Frontend & App Engine**: Next.js 16+ (App Router), React 19, TypeScript
- **Database & ORM**: MySQL 8.0+, Prisma ORM v6.4.1 (34 relational tables mapped)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/turbopack`, Strictly Zero Bootstrap, pure custom CSS tokens)
- **Brand Palette**: Approved Blue & Amber Theme
  - **Primary**: Deep Navy Blue (`#0B3D91`)
  - **Secondary**: Electric Blue (`#1E65A0`)
  - **Accent**: Amber / Electric Orange (`#F59E0B`)
  - **Background**: Off-White (`#F8F9FA` light, `#0b0f19` dark)
  - **Neutral**: Slate Gray (`#6B7280`)
- **Typography**: `Valley Sans` (English & Numeric text) and `Baloo Da 2` (Bangla text)
- **Authentication**: JWT Cookie + Bearer Authentication with Bcrypt password hashing
- **Hardware Integrations**:
  - USB Barcode Scanner guns (keypress buffer with auto-submit on Enter)
  - Camera Barcode & QR Scanner (`html5-qrcode`)
  - 80mm Thermal Receipt Slip generation with direct printer command support

---

## 2. Branding Assets & Usage

The application integrates 4 dedicated branding assets in `public/`:
1. **`icon-512.png`**: 512 × 512 PWA and installable web application icon.
2. **`fav.png`**: High-resolution browser favicon and `<head>` shortcut icon.
3. **`logo.png`**: Horizontal brand logo for sidebar, invoices, challans, and cash receipts.
4. **`auth-page-logo.png`**: High-impact emblem and brand typography for login and authentication screens.

---

## 3. Getting Started & Installation

### Prerequisites
- Node.js 18.18+ or 20.x+
- MySQL 8.0+ running on local port `3306`

### Environment Configuration (.env)
```env
DATABASE_URL="mysql://root:@localhost:3306/runa_traders_db"
JWT_SECRET="protikkha-electric-super-secret-jwt-key-2026"
NEXT_PUBLIC_APP_NAME="PROTIKKHA ELECTRIC"
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
- **`/products`**: Product catalog with barcode preview, cost & selling price, electrical categories.
- **`/inventory`**: Live stock overview with 4 inventory KPIs, low stock alerts, and manual count adjustment.
- **`/categories`**: Category taxonomy management.
- **`/brands`**: Brand management.
- **`/units`**: Measurement units (Pcs, Box, Coil, Meter, Set).
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
- **`/login`**: Secure authentication gateway with Protikkha Electric branding.

---

## 6. Client Handover Checklist

- [x] Dedicated branding assets integrated (`icon-512.png`, `fav.png`, `logo.png`, `auth-page-logo.png`).
- [x] Blue & Amber color theme applied consistently across the application.
- [x] Zero `src` folder structure maintained.
- [x] Tailwind CSS utility design verified across all routes.
- [x] POS 100vh terminal tested with physical scanner and thermal printer.
- [x] Bangladeshi Currency formatting `formatBdCurrency()` active globally.
- [x] Software attribution pinned to CodeNext IT (`© <Year> PROTIKKHA ELECTRIC | Software By: CodeNext IT`).
