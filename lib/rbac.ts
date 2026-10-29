/**
 * Protikkha Electric - Role-Based Access Control (RBAC) & Security Service
 * Strict compliance with marss corp architecture and electrical enterprise workflows
 */

export type RoleType =
  | "admin"
  | "manager"
  | "cashier"
  | "storekeeper"
  | "technician"
  | "staff";

export type PermissionKey =
  | "pos_access"
  | "pos_discount_override"
  | "view_cost_price"
  | "cancel_orders"
  | "delete_orders"
  | "inventory_manage"
  | "warranty_manage"
  | "b2b_quotations"
  | "accounting_ledger"
  | "reports_view"
  | "staff_payroll"
  | "user_management"
  | "system_settings";

export interface RoleConfig {
  name: string;
  bnName: string;
  description: string;
  permissions: Record<PermissionKey, boolean>;
  maxDiscountPercent: number; // Max percentage discount this role can apply without manager approval
}

export const ROLE_DEFINITIONS: Record<RoleType, RoleConfig> = {
  admin: {
    name: "Owner / Super Admin",
    bnName: "মালিক / প্রধান অ্যাডমিন",
    description: "Full system authority, financial audits, settings, and role delegation",
    maxDiscountPercent: 100,
    permissions: {
      pos_access: true,
      pos_discount_override: true,
      view_cost_price: true,
      cancel_orders: true,
      delete_orders: true,
      inventory_manage: true,
      warranty_manage: true,
      b2b_quotations: true,
      accounting_ledger: true,
      reports_view: true,
      staff_payroll: true,
      user_management: true,
      system_settings: true,
    },
  },
  manager: {
    name: "Branch / Store Manager",
    bnName: "ব্রাঞ্চ / শোরুম ম্যানেজার",
    description: "Operational management, discount overrides, inventory approval, and quotations",
    maxDiscountPercent: 25,
    permissions: {
      pos_access: true,
      pos_discount_override: true,
      view_cost_price: true,
      cancel_orders: true,
      delete_orders: false, // Only super admin can permanently delete records
      inventory_manage: true,
      warranty_manage: true,
      b2b_quotations: true,
      accounting_ledger: true,
      reports_view: true,
      staff_payroll: true,
      user_management: false,
      system_settings: false,
    },
  },
  cashier: {
    name: "POS Cashier / Sales Executive",
    bnName: "ক্যাশিয়ার / বিক্রয়কর্মী",
    description: "Fast retail checkout, customer collections, and quick estimations",
    maxDiscountPercent: 10, // Standard 10% ceiling
    permissions: {
      pos_access: true,
      pos_discount_override: false,
      view_cost_price: false, // Strict: Never disclose purchase/cost price to sales cashier
      cancel_orders: false,
      delete_orders: false,
      inventory_manage: false,
      warranty_manage: true,
      b2b_quotations: true,
      accounting_ledger: false,
      reports_view: false,
      staff_payroll: false,
      user_management: false,
      system_settings: false,
    },
  },
  storekeeper: {
    name: "Storekeeper / Warehouse Clerk",
    bnName: "স্টোরকিপার / ওয়্যারহাউজ কর্মকর্তা",
    description: "Purchase goods receiving, stock transfers, barcode printing, and warranty inspection",
    maxDiscountPercent: 0,
    permissions: {
      pos_access: false,
      pos_discount_override: false,
      view_cost_price: false,
      cancel_orders: false,
      delete_orders: false,
      inventory_manage: true,
      warranty_manage: true,
      b2b_quotations: false,
      accounting_ledger: false,
      reports_view: false,
      staff_payroll: false,
      user_management: false,
      system_settings: false,
    },
  },
  technician: {
    name: "Electrician / Project Technician",
    bnName: "ইলেকট্রিশিয়ান / টেকনিশিয়ান লিড",
    description: "Site material estimation, project BOM calculation, and installation warranty",
    maxDiscountPercent: 0,
    permissions: {
      pos_access: false,
      pos_discount_override: false,
      view_cost_price: false,
      cancel_orders: false,
      delete_orders: false,
      inventory_manage: false,
      warranty_manage: true,
      b2b_quotations: true,
      accounting_ledger: false,
      reports_view: false,
      staff_payroll: false,
      user_management: false,
      system_settings: false,
    },
  },
  staff: {
    name: "General Staff",
    bnName: "সাধারণ কর্মী",
    description: "Assigned duties, delivery support, and salary receiving",
    maxDiscountPercent: 5,
    permissions: {
      pos_access: true,
      pos_discount_override: false,
      view_cost_price: false,
      cancel_orders: false,
      delete_orders: false,
      inventory_manage: false,
      warranty_manage: false,
      b2b_quotations: false,
      accounting_ledger: false,
      reports_view: false,
      staff_payroll: false,
      user_management: false,
      system_settings: false,
    },
  },
};

/**
 * Check if a role or custom user permissions allow a specific permission
 */
export function hasPermission(
  role: string | null | undefined,
  permission: PermissionKey,
  customPermissions?: Record<string, boolean> | null
): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase() as RoleType;

  // Super Admin always has full access
  if (normalizedRole === "admin") return true;

  // Check explicit custom permission override on user object if set
  if (customPermissions && typeof customPermissions[permission] === "boolean") {
    return customPermissions[permission];
  }

  const roleDef = ROLE_DEFINITIONS[normalizedRole];
  if (!roleDef) return false;

  return Boolean(roleDef.permissions[permission]);
}

/**
 * Check if the user is allowed to view purchase/cost prices
 */
export function canViewCostPrice(
  role: string | null | undefined,
  customPermissions?: Record<string, boolean> | null
): boolean {
  return hasPermission(role, "view_cost_price", customPermissions);
}

/**
 * Validate if a given discount percentage is permitted for the user's role
 */
export function validateDiscountLimit(
  role: string | null | undefined,
  discountPercent: number
): { allowed: boolean; maxAllowed: number; reason?: string } {
  if (!role) {
    return { allowed: false, maxAllowed: 0, reason: "Unauthorized user" };
  }

  const normalizedRole = role.toLowerCase() as RoleType;
  if (normalizedRole === "admin") {
    return { allowed: true, maxAllowed: 100 };
  }

  const roleDef = ROLE_DEFINITIONS[normalizedRole];
  const maxAllowed = roleDef ? roleDef.maxDiscountPercent : 0;

  if (discountPercent <= maxAllowed) {
    return { allowed: true, maxAllowed };
  }

  return {
    allowed: false,
    maxAllowed,
    reason: `Discount of ${discountPercent.toFixed(1)}% exceeds role limit of ${maxAllowed}% for ${roleDef?.name || role}. Manager or Admin approval required.`,
  };
}

/**
 * Check if role can cancel orders
 */
export function canCancelOrder(
  role: string | null | undefined,
  customPermissions?: Record<string, boolean> | null
): boolean {
  return hasPermission(role, "cancel_orders", customPermissions);
}

/**
 * Check if role can permanently delete invoices / records
 */
export function canDeleteInvoice(role: string | null | undefined): boolean {
  if (!role) return false;
  return role.toLowerCase() === "admin";
}

/**
 * Mask sensitive cost prices from product lists if user is not authorized
 */
export function maskProductCost<T extends { cost_price?: any; purchase_price?: any }>(
  product: T,
  role: string | null | undefined
): T {
  if (canViewCostPrice(role)) {
    return product;
  }

  return {
    ...product,
    cost_price: null,
    purchase_price: null,
  };
}

export function maskProductListCost<T extends { cost_price?: any; purchase_price?: any }>(
  products: T[],
  role: string | null | undefined
): T[] {
  if (canViewCostPrice(role)) {
    return products;
  }

  return products.map((p) => maskProductCost(p, role));
}

/**
 * Helper to calculate comprehensive staff performance statistics
 */
export interface StaffPerformanceRecord {
  staffId: number;
  staffName: string;
  role: string;
  ordersHandled: number;
  totalSalesVolume: number;
  cashCollected: number;
  salaryPaid: number;
  netBusinessCash: number;
  averageOrderValue: number;
}

export function calculateStaffPerformance(
  staff: { id: number; name: string; role: string },
  orders: Array<{ sub_total?: any; paid_amount?: any; due_amount?: any }>,
  collections: Array<{ paid_amount?: any }>,
  payouts: Array<{ expense_amount?: any }>
): StaffPerformanceRecord {
  const ordersHandled = orders.length;

  const totalSalesVolume = orders.reduce((sum, o) => {
    return sum + (parseFloat(String(o.sub_total || 0)) || 0);
  }, 0);

  const initialOrderPayments = orders.reduce((sum, o) => {
    return sum + (parseFloat(String(o.paid_amount || 0)) || 0);
  }, 0);

  const afterSaleCollections = collections.reduce((sum, c) => {
    return sum + (parseFloat(String(c.paid_amount || 0)) || 0);
  }, 0);

  const cashCollected = initialOrderPayments + afterSaleCollections;

  const salaryPaid = payouts.reduce((sum, p) => {
    return sum + (parseFloat(String(p.expense_amount || 0)) || 0);
  }, 0);

  const netBusinessCash = cashCollected - salaryPaid;
  const averageOrderValue = ordersHandled > 0 ? totalSalesVolume / ordersHandled : 0;

  return {
    staffId: staff.id,
    staffName: staff.name,
    role: staff.role,
    ordersHandled,
    totalSalesVolume,
    cashCollected,
    salaryPaid,
    netBusinessCash,
    averageOrderValue,
  };
}
