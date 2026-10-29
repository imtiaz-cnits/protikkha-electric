import fs from "fs";

let code = fs.readFileSync("components/sidebar.tsx", "utf8");

const newNavItems = `export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "pos",
    label: "Point of Sale (POS)",
    href: "/pos",
    icon: ShoppingCart,
  },
  {
    id: "sales",
    label: "Sales & Invoices",
    icon: Receipt,
    children: [
      { label: "Sales Invoices", href: "/invoices", icon: Receipt },
      { label: "Sales Returns", href: "/returns", icon: RotateCcw },
      { label: "Due Collection", href: "/customer-dues", icon: Wallet },
    ],
  },
  {
    id: "catalog",
    label: "Products & Catalog",
    icon: Package,
    children: [
      { label: "Products Catalog", href: "/products", icon: Package },
      { label: "Product Variants", href: "/products/variants", icon: Boxes },
      { label: "Retail & Wholesale Rates", href: "/products/price-lists", icon: Tag },
      { label: "Categories", href: "/categories", icon: Layers },
      { label: "Subcategories", href: "/sub-categories", icon: Layers },
      { label: "Brands & Makers", href: "/brands", icon: Tag },
      { label: "Units & Packaging", href: "/units", icon: Boxes },
      { label: "Barcode Label Print", href: "/barcode-print", icon: Barcode },
    ],
  },
  {
    id: "inventory",
    label: "Inventory & Stock",
    icon: Boxes,
    children: [
      { label: "Stock Overview", href: "/inventory", icon: Boxes },
      { label: "Stock Movement Ledger", href: "/inventory/movements", icon: FileSpreadsheet },
      { label: "Stock Reconciliation", href: "/inventory/adjustments", icon: AlertTriangle },
      { label: "Cable Reels & Cut-Length", href: "/inventory/cable-reels", icon: Zap },
    ],
  },
  {
    id: "purchases",
    label: "Purchases & Procurement",
    icon: Truck,
    children: [
      { label: "Purchase Bills", href: "/purchases", icon: ShoppingCart },
      { label: "Goods Receipts (GRN)", href: "/purchases/receipts", icon: PackageCheck },
      { label: "Purchase Returns", href: "/purchase-returns", icon: RotateCcw },
      { label: "Supplier Due Pay", href: "/supplier-dues", icon: Wallet },
    ],
  },
  {
    id: "suppliers",
    label: "Suppliers & Vendors",
    icon: Building2,
    children: [
      { label: "Supplier Directory", href: "/suppliers", icon: Users },
      { label: "Supplier Statements & Ledger", href: "/suppliers/ledger", icon: FileSpreadsheet },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    children: [
      { label: "Customer Directory", href: "/customers", icon: Users },
      { label: "Customer Dues Ledger", href: "/customer-dues", icon: Wallet },
    ],
  },
  {
    id: "expenses",
    label: "Expense Management",
    icon: Wallet,
    children: [
      { label: "Daily Expenses", href: "/expenses", icon: Wallet },
      { label: "Expense Categories", href: "/expense-types", icon: Layers },
    ],
  },
  {
    id: "warranty",
    label: "Warranty & Service",
    icon: ShieldCheck,
    children: [
      { label: "Warranty Register", href: "/warranty", icon: ShieldCheck },
      { label: "Warranty Claims & Repairs", href: "/warranty/claims", icon: ShieldCheck },
    ],
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    icon: FileSpreadsheet,
    children: [
      { label: "Sales Report", href: "/reports/sales", icon: FileSpreadsheet },
      { label: "Stock Valuation (Asset)", href: "/reports/stock-valuation", icon: Boxes },
      { label: "Gross Profit & Margins", href: "/reports/profit-margin", icon: TrendingUp },
      { label: "Daily Ledger", href: "/reports/daily-ledger", icon: FileSpreadsheet },
      { label: "General Ledger & COA", href: "/reports/general-ledger", icon: Scale },
      { label: "Income & Expense", href: "/reports/income-expense", icon: Wallet },
      { label: "Low Stock Alert", href: "/reports/stock-out", icon: AlertTriangle },
    ],
  },
  {
    id: "settings",
    label: "Settings & Administration",
    icon: Settings,
    children: [
      { label: "Store Profile Settings", href: "/settings", icon: Settings },
      { label: "User Accounts & Roles", href: "/users", icon: Users },
      { label: "Cable Length & Drop Calculator", href: "/tools/cable-calculator", icon: Calculator },
      { label: "Audit Trails & Security", href: "/reports/audit-logs", icon: ShieldAlert },
      { label: "System Health Diagnostics", href: "/settings/health", icon: Activity },
      { label: "Database Backup", href: "/settings/backup", icon: Database },
      { label: "My Profile", href: "/profile", icon: User },
    ],
  },
];`;

const startIdx = code.indexOf("export const NAV_ITEMS: NavItem[] = [");
const endIdx = code.indexOf("interface SidebarProps {");

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + newNavItems + "\n\n" + code.substring(endIdx);
  fs.writeFileSync("components/sidebar.tsx", code, "utf8");
  console.log("Successfully updated sidebar NAV_ITEMS!");
} else {
  console.error("Could not find markers:", { startIdx, endIdx });
}

