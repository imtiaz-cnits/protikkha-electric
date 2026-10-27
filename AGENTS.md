# Runa Traders - Project Rules & Agent Instructions
## Based on Marss Corp Architecture Guidelines

> [!IMPORTANT]
> This document specifies strict architectural, styling, and behavioral rules for all AI agents and developers working on the **Runa Traders Retail Shop Management App**. Every single rule from the original Marss Corp system must be strictly preserved.

---

### 1. Project Structure Rules [STRICT]
1. **NO `src` FOLDER**: The project root must directly contain `app/`, `components/`, `lib/`, `prisma/`, `public/`, etc. Under no circumstances should a `src/` directory be created or used.
2. **Framework & Engine**: Next.js 15+ (App Router), TypeScript, Prisma ORM, MySQL 8.
3. **Dedicated Database**: `runa_traders_db` (never overwrite or mix with `marsscorpdb`).

---

### 2. Styling & CSS Framework Standards [STRICT]
1. **Tailwind CSS Mandatory, Bootstrap Strictly Forbidden**:
   - Every single component, page, modal, and control must be built exclusively with Tailwind CSS utility classes.
   - Absolutely zero Bootstrap classes or stylesheets.
2. **Curated Color Palette**:
   - **Brand Primary Green**: `emerald-700` (`#15803d`), `emerald-600` (`#16a34a`)
   - **Hover Green**: `emerald-800` (`#166534`), `emerald-900` (`#14532d`)
   - **Subtle Tint Backgrounds**: `emerald-50` (`#f0fdf4`)
   - **Page Background (Dark Mode)**: `#0b0f19`
   - **Card / Modal Background (Dark Mode)**: `#0f172a` (`slate-900`)
   - **Input / Select Background (Dark Mode)**: `#1e293b` (`slate-800/90`)
   - **Unified Border Colors**:
     - Light Mode: `#cbd5e1` (`border: 1.5px solid #cbd5e1 !important;`)
     - Dark Mode: `#334155` (`border-color: #334155 !important;`)
3. **Typography & Font Standards**:
   - **English & Numeric Text**: Must use **`Valley Sans`** (`sans-serif`).
   - **Bangla Text**: Must use **`Baloo Da 2`** (`sans-serif`).
   - Google Font URLs:
     - `Valley Sans`: `300..800`
     - `Baloo Da 2`: `400..800`
   - Strict ban on `Poppins` or fallback serif fonts.

---

### 3. POS Architecture Standards [STRICT]
1. **POS 100vh Full Screen Rule**:
   - The POS interface must fill `100vh` without page scrolling.
   - Cart item list must scroll independently (`overflow-y: auto`) with a sticky header.
   - Checkout actions, payment buttons, and total amounts must remain pinned to the bottom.
2. **Product Domain Standard (Tiles, Sanitary & Fittings)**:
   - Runa Traders primary business domain is **Tiles, Sanitary, and Fittings items**.
   - All door-related setups and door handedness (Left/Right/Both) are strictly decommissioned.
   - Catalog management optimized for tiles, sanitary ware, and pipe/bath fittings.
3. **Fast Barcode & Scanner Input**:
   - Support both physical USB barcode scanner guns (keypress buffer) and Camera scanning (`html5-qrcode`).
   - Multi-barcode search support (matching any code within JSON array `product_code`).

---

### 4. Table & Data Ordering Standards [STRICT]
1. **Newest Records on Top (Latest First)**:
   - All backend queries (`products`, `categories`, `brands`, `purchases`, `expenses`, `suppliers`, `customers`, `orders`) must sort descending: `orderBy: { id: 'desc' }`.
   - DataTables / Client-side lists must default to descending ID order.
2. **Post-Creation Reset**:
   - Adding a new record must immediately refresh the table and reset pagination to page 1 (`page = 1`).
3. **Currency Formatting**:
   - All monetary figures must use dynamic Bangladeshi comma formatting: `formatBdCurrency()` (e.g. `৳ 24,800.00`).

---

### 5. List Page & Table Master Layout
1. **Header & Top Actions**:
   - Icon badge: `w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-100 dark:border-slate-800`.
   - Page Title: `h1` in bold text, no bottom margin, no clutter.
   - Export buttons: Exactly `38px × 38px`, rounded-xl, 1.5px border (`#cbd5e1` light, `#334155` dark).
2. **Search & Filter Controls**:
   - Height: Exactly `38px`.
   - Focus ring: Emerald `#15803d` with subtle green glow.
   - Show entries selector: Default value `15` or `50` (`15, 50, 100, 200, 500`).
   - Flatpickr date filters: `d/m/Y` display, `Y-m-d` internal value, static month navigation.
3. **Desktop & Mobile Responsive Modes**:
   - Desktop: `hidden md:block` table with solid emerald header `#15803d` (`text-white`, `nowrap`).
   - Mobile: `block md:hidden` card list with 2-column financial grid (`grid grid-cols-2 gap-2`).

---

### 6. Modal Architecture Standards
1. **Container**:
   - Single unified container, `border-radius: 16px`, max height `90vh`, zero duplicate boxes.
2. **Sticky Header**:
   - Solid emerald `#15803d`, white title in pure English, circular red close button (`28px × 28px`, `#dc2626`).
3. **Form Controls**:
   - Standard height: Exactly `42px` (`height: 42px !important; width: 100% !important;`).
4. **Sticky Footer**:
   - Cancel button: Red `#dc2626`.
   - Save / Submit button: Emerald `#15803d`.

---

### 7. Sticky Footer & Zoom Protection
1. **Full-height wrapper**: `.min-h-screen flex flex-col justify-between` on page wrappers.
2. **Sticky Copyright Footer**:
   - Bottom pinned with `mt-auto`.
   - Dynamic year, clean branding:
     `© <Year> RUNA TRADERS | Software By: CodeNext IT`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
