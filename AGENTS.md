# Protikkha Electric - Project Rules & Agent Instructions
## Based on Marss Corp Architecture Guidelines

> [!IMPORTANT]
> This document specifies strict architectural, styling, and behavioral rules for all AI agents and developers working on the **Protikkha Electric Retail Shop Management & POS App**. Every single rule and architectural standard must be strictly preserved.

---

### 1. Project Overview & Repository
- **Project Name**: Protikkha Electric
- **Repository URL**: [https://github.com/imtiaz-cnits/protikkha-electric](https://github.com/imtiaz-cnits/protikkha-electric)
- **Business Domain**: Electrical retail POS and inventory management for wires, cables, pipes, switches, sockets, circuit breakers, nuts, bolts, and other electrical products.
- **Technology Stack (Verified from Codebase)**:
  - **App Engine & Framework**: Next.js 16+ (App Router), React 19, TypeScript
  - **Database & ORM**: MySQL 8, Prisma ORM v6.4.1
  - **Styling**: Tailwind CSS v4 (`@tailwindcss/turbopack`), strictly zero Bootstrap
  - **State Management**: Zustand
  - **Hardware & Peripherals**: USB Barcode Scanner gun buffer, Camera scanning (`html5-qrcode`), Thermal Receipt generation (`JsBarcode`)
  - **Authentication**: JWT Cookie + Bearer Authentication with Bcrypt password hashing

---

### 2. Mandatory Branding Assets & Asset Usage
All four official branding assets reside in `public/` and must be preserved without distortion:

1. **`icon-512.png`** (512 × 512 px):
   - Used as the PWA and installable web application icon in `app/manifest.ts` and mobile web app manifests.
   - 512 × 512 px dimensions strictly maintained.
2. **`fav.png`** (1254 × 1254 px source):
   - Used as the primary browser favicon in HTML head `<link rel="icon" href="/fav.png" />`, shortcut icon, and framework metadata in `app/layout.tsx`.
3. **`logo.png`** (2135 × 736 px horizontal):
   - Used as the main horizontal brand logo in the desktop sidebar, printable invoices, delivery challans, and cash sales receipts.
   - Must maintain aspect ratio with `object-fit: contain` (`object-contain`).
4. **`auth-page-logo.png`** (1230 × 1278 px vertical emblem):
   - Used as the primary brand logo on the login, authentication, and security access screens (desktop hero panel & mobile header).

---

### 3. Approved Color Theme: Blue & Amber
| Purpose | Name | Hex Code | Usage |
| :--- | :--- | :--- | :--- |
| **Primary** | Deep Navy Blue | `#0B3D91` | Primary branding, sidebar, table headers, modal headers, major action elements |
| **Secondary** | Electric Blue | `#1E65A0` | Secondary interactive elements, links, focus rings, hover accents |
| **Accent** | Amber / Electric Orange | `#F59E0B` | Calls to action, active navigation indicators, key highlights, badges |
| **Background** | Off-White | `#F8F9FA` | Page & container background (Light mode). Dark mode uses `#0b0f19` |
| **Neutral** | Slate Gray | `#6B7280` | Secondary text, captions, and neutral UI details |

- **Dark Mode Backgrounds**: Page `#0b0f19`, Card / Modal `#0f172a` (`slate-900`), Input / Select `#1e293b` (`slate-800/90`).
- **Unified Border Colors**:
  - Light Mode: `#cbd5e1` (`border: 1.5px solid #cbd5e1 !important;`)
  - Dark Mode: `#334155` (`border-color: #334155 !important;`)
- **Semantic Colors Protection**:
  - Never replace semantic status colors indiscriminately.
  - Preserve standard colors for Paid, Due, Partial, Errors, Warnings, and Success states.
  - Close buttons (`28px × 28px`) and destructive actions remain red (`#dc2626`).

---

### 4. Typography & Font Standards
- **English & Numeric Text**: Must use **`Valley Sans`** (`sans-serif`).
- **Bangla Text**: Must use **`Baloo Da 2`** (`sans-serif`).
- Google Font URLs:
  - `Valley Sans`: `300..800`
  - `Baloo Da 2`: `400..800`
- Strict ban on `Poppins` or fallback serif fonts.

---

### 5. Project Structure Rules [STRICT]
1. **NO `src` FOLDER**: The project root directly contains `app/`, `components/`, `lib/`, `prisma/`, `public/`, etc. Under no circumstances should a `src/` directory be created or used.
2. **Dedicated Database**: `runa_traders_db` (never overwrite, migrate, truncate, or drop the database).
3. **Zero Business Logic Regressions**: Preserve all existing products, inventory, sales, purchases, invoices, calculations, APIs, and authentication workflows.

---

### 6. POS Architecture Standards [STRICT]
1. **POS 100vh Full Screen Rule**:
   - The POS interface must fill `100vh` without page scrolling.
   - Cart item list must scroll independently (`overflow-y: auto`) with a sticky header.
   - Checkout actions, payment buttons, and total amounts must remain pinned to the bottom.
2. **Fast Barcode & Scanner Input**:
   - Support both physical USB barcode scanner guns (keypress buffer) and Camera scanning (`html5-qrcode`).
   - Multi-barcode search support (matching any code within JSON array `product_code`).

---

### 7. Table & Data Ordering Standards [STRICT]
1. **Newest Records on Top (Latest First)**:
   - All backend queries (`products`, `categories`, `brands`, `purchases`, `expenses`, `suppliers`, `customers`, `orders`) sort descending: `orderBy: { id: 'desc' }`.
   - DataTables / Client-side lists default to descending ID order.
2. **Post-Creation Reset**:
   - Adding a new record immediately refreshes the table and resets pagination to page 1 (`page = 1`).
3. **Currency Formatting**:
   - All monetary figures must use dynamic Bangladeshi comma formatting: `formatBdCurrency()` (e.g. `৳ 24,800.00`).

---

### 8. List Page & Table Master Layout
1. **Header & Top Actions**:
   - Icon badge: `w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800`.
   - Page Title: `h1` in bold text, no bottom margin, no clutter.
   - Export buttons: Exactly `38px × 38px`, rounded-xl, 1.5px border (`#cbd5e1` light, `#334155` dark).
2. **Search & Filter Controls**:
   - Height: Exactly `38px`.
   - Focus ring: Electric Blue `#1E65A0` with subtle glow.
   - Show entries selector: Default value `15` or `50` (`15, 50, 100, 200, 500`).
   - Flatpickr date filters: `d/m/Y` display, `Y-m-d` internal value, static month navigation.
3. **Desktop & Mobile Responsive Modes**:
   - Desktop: `hidden md:block` table with deep navy gradient header (`text-white`, `nowrap`).
   - Mobile: `block md:hidden` card list with 2-column financial grid (`grid grid-cols-2 gap-2`).

---

### 9. Modal Architecture Standards
1. **Container**:
   - Single unified container, `border-radius: 16px`, max height `90vh`, zero duplicate boxes.
2. **Sticky Header**:
   - Deep Navy Blue & Electric Blue gradient (`#0B3D91` to `#1E65A0`), white title in English, circular red close button (`28px × 28px`, `#dc2626`).
3. **Form Controls**:
   - Standard height: Exactly `42px` (`height: 42px !important; width: 100% !important;`).
4. **Sticky Footer**:
   - Cancel button: Red `#dc2626`.
   - Save / Submit button: Brand Gradient (`#0B3D91` to `#1E65A0`).

---

### 10. Sticky Footer & Zoom Protection
1. **Full-height wrapper**: `.min-h-screen flex flex-col justify-between` on page wrappers.
2. **Sticky Copyright Footer**:
   - Bottom pinned with `mt-auto`.
   - Clean branding:
     `© <Year> PROTIKKHA ELECTRIC | Software By: CodeNext IT`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
