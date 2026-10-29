import test from "node:test";
import assert from "node:assert/strict";
import {
  ROLE_DEFINITIONS,
  hasPermission,
  canViewCostPrice,
  validateDiscountLimit,
  canCancelOrder,
  canDeleteInvoice,
  maskProductCost,
  maskProductListCost,
  calculateStaffPerformance,
} from "../lib/rbac.ts";

test("Phase 10 - Test 1: Role Definitions & Permission Matrix Verification", () => {
  // 1. Verify standard roles exist
  const expectedRoles = ["admin", "manager", "cashier", "storekeeper", "technician", "staff"];
  for (const role of expectedRoles) {
    assert.ok(ROLE_DEFINITIONS[role], `Role definition must exist for: ${role}`);
    assert.ok(ROLE_DEFINITIONS[role].name, `Role must have human name for: ${role}`);
    assert.ok(ROLE_DEFINITIONS[role].bnName, `Role must have Bangla name for: ${role}`);
  }

  // 2. Admin authority
  assert.equal(ROLE_DEFINITIONS.admin.maxDiscountPercent, 100);
  assert.equal(hasPermission("admin", "view_cost_price"), true);
  assert.equal(hasPermission("admin", "delete_orders"), true);
  assert.equal(hasPermission("admin", "user_management"), true);

  // 3. Manager authority & restrictions
  assert.equal(ROLE_DEFINITIONS.manager.maxDiscountPercent, 25);
  assert.equal(hasPermission("manager", "view_cost_price"), true);
  assert.equal(hasPermission("manager", "cancel_orders"), true);
  assert.equal(hasPermission("manager", "delete_orders"), false, "Manager cannot permanently delete orders");
  assert.equal(hasPermission("manager", "user_management"), false, "Manager cannot manage users");

  // 4. Cashier restrictions
  assert.equal(ROLE_DEFINITIONS.cashier.maxDiscountPercent, 10);
  assert.equal(hasPermission("cashier", "pos_access"), true);
  assert.equal(hasPermission("cashier", "view_cost_price"), false, "Cashier cannot view cost prices");
  assert.equal(hasPermission("cashier", "cancel_orders"), false, "Cashier cannot cancel orders");
  assert.equal(hasPermission("cashier", "delete_orders"), false);

  // 5. Storekeeper permissions
  assert.equal(hasPermission("storekeeper", "inventory_manage"), true);
  assert.equal(hasPermission("storekeeper", "pos_access"), false, "Storekeeper does not operate retail POS");
  assert.equal(hasPermission("storekeeper", "view_cost_price"), false);

  // 6. Technician permissions
  assert.equal(hasPermission("technician", "b2b_quotations"), true);
  assert.equal(hasPermission("technician", "warranty_manage"), true);
  assert.equal(hasPermission("technician", "view_cost_price"), false);
});

test("Phase 10 - Test 2: Cost Price Masking for Unauthorized Roles", () => {
  assert.equal(canViewCostPrice("admin"), true);
  assert.equal(canViewCostPrice("manager"), true);
  assert.equal(canViewCostPrice("cashier"), false);
  assert.equal(canViewCostPrice("storekeeper"), false);
  assert.equal(canViewCostPrice("staff"), false);

  const testProduct = {
    id: 101,
    product_name: "BRB 3/.029 Single Core Cable (Red)",
    sell_price: 4500,
    cost_price: 3600,
    purchase_price: 3500,
  };

  // Masking for cashier
  const maskedForCashier = maskProductCost(testProduct, "cashier");
  assert.equal(maskedForCashier.sell_price, 4500);
  assert.equal(maskedForCashier.cost_price, null, "Cost price must be masked to null for cashier");
  assert.equal(maskedForCashier.purchase_price, null, "Purchase price must be masked to null for cashier");

  // Preserved for admin
  const preservedForAdmin = maskProductCost(testProduct, "admin");
  assert.equal(preservedForAdmin.cost_price, 3600);
  assert.equal(preservedForAdmin.purchase_price, 3500);

  // Array masking
  const productList = [
    { id: 1, cost_price: 100, sell_price: 150 },
    { id: 2, cost_price: 200, sell_price: 280 },
  ];
  const maskedList = maskProductListCost(productList, "cashier");
  assert.equal(maskedList[0].cost_price, null);
  assert.equal(maskedList[1].cost_price, null);
  assert.equal(maskedList[0].sell_price, 150);
});

test("Phase 10 - Test 3: POS Discount Threshold Validation & Overrides", () => {
  // Cashier standard limit is 10%
  const cashierSmallDiscount = validateDiscountLimit("cashier", 5);
  assert.equal(cashierSmallDiscount.allowed, true);

  const cashierTenPercent = validateDiscountLimit("cashier", 10);
  assert.equal(cashierTenPercent.allowed, true);

  const cashierExcessiveDiscount = validateDiscountLimit("cashier", 15);
  assert.equal(cashierExcessiveDiscount.allowed, false);
  assert.match(cashierExcessiveDiscount.reason, /exceeds role limit of 10%/);

  // Manager standard limit is 25%
  const managerTwentyPercent = validateDiscountLimit("manager", 20);
  assert.equal(managerTwentyPercent.allowed, true);

  const managerExcessive = validateDiscountLimit("manager", 35);
  assert.equal(managerExcessive.allowed, false);

  // Admin has full 100% authority
  const adminBigDiscount = validateDiscountLimit("admin", 75);
  assert.equal(adminBigDiscount.allowed, true);
  assert.equal(adminBigDiscount.maxAllowed, 100);

  // Order Cancellation & Deletion checks
  assert.equal(canCancelOrder("admin"), true);
  assert.equal(canCancelOrder("manager"), true);
  assert.equal(canCancelOrder("cashier"), false);
  assert.equal(canDeleteInvoice("admin"), true);
  assert.equal(canDeleteInvoice("manager"), false);
  assert.equal(canDeleteInvoice("cashier"), false);
});

test("Phase 10 - Test 4: Staff Performance Attribution & Financial Calculation", () => {
  const staff = { id: 12, name: "Tanvir Ahmed", role: "cashier" };

  const orders = [
    { sub_total: 10000, paid_amount: 8000, due_amount: 2000 },
    { sub_total: 15000, paid_amount: 15000, due_amount: 0 },
    { sub_total: 5000, paid_amount: 2000, due_amount: 3000 },
  ];

  const collections = [
    { paid_amount: 2000 }, // Due collection from customer 1
    { paid_amount: 1000 }, // Due collection from customer 2
  ];

  const payouts = [
    { expense_amount: 18000 }, // Monthly salary
    { expense_amount: 2000 },  // Festival bonus
  ];

  const performance = calculateStaffPerformance(staff, orders, collections, payouts);

  // Total sales volume = 10,000 + 15,000 + 5,000 = 30,000
  assert.equal(performance.ordersHandled, 3);
  assert.equal(performance.totalSalesVolume, 30000);

  // Cash collected = Initial order payments (8,000 + 15,000 + 2,000 = 25,000) + collections (2,000 + 1,000 = 3,000) = 28,000
  assert.equal(performance.cashCollected, 28000);

  // Salary / payouts = 18,000 + 2,000 = 20,000
  assert.equal(performance.salaryPaid, 20000);

  // Net business contribution = 28,000 - 20,000 = 8,000
  assert.equal(performance.netBusinessCash, 8000);

  // Average order value = 30,000 / 3 = 10,000
  assert.equal(performance.averageOrderValue, 10000);
});

test("Phase 10 - Test 5: Audit Log Serialization, Deserialization & Diff Invariants", () => {
  const oldValues = {
    order_no: "ORD-20261028-1001",
    sub_total: 12000,
    paid_amount: 5000,
    due_amount: 7000,
  };

  const newValues = {
    order_no: "ORD-20261028-1001",
    sub_total: 12000,
    paid_amount: 12000,
    due_amount: 0,
    payment_status: "paid",
  };

  const serializedOld = JSON.stringify(oldValues);
  const serializedNew = JSON.stringify(newValues);

  // Assert parse integrity
  const parsedOld = JSON.parse(serializedOld);
  const parsedNew = JSON.parse(serializedNew);

  assert.equal(parsedOld.due_amount, 7000);
  assert.equal(parsedNew.due_amount, 0);
  assert.equal(parsedNew.payment_status, "paid");

  // Invariant: Difference between old and new paid_amount equals collection amount
  const collectedDiff = parsedNew.paid_amount - parsedOld.paid_amount;
  assert.equal(collectedDiff, 7000);
});
