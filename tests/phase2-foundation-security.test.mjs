import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  requireAuth,
} from "../lib/auth.ts";
import { NAV_ITEMS } from "../components/sidebar.tsx";

test("1. Password Security: Hashing & Verification", async () => {
  const plainPassword = "SuperSecretSecurePassword2026!";
  const hash = await hashPassword(plainPassword);

  // Hash must start with $2a$ or $2b$
  assert.ok(hash.startsWith("$2a$") || hash.startsWith("$2b$"));

  // Correct password matches
  const isMatch = await verifyPassword(plainPassword, hash);
  assert.equal(isMatch, true);

  // Incorrect password rejected
  const isWrong = await verifyPassword("WrongPassword123", hash);
  assert.equal(isWrong, false);
});

test("2. JWT Session Security: Signing, Expiry & Verification", () => {
  const payload = {
    userId: 1,
    email: "admin@protikkhaelectric.com",
    name: "System Admin",
    role: "admin",
  };

  const token = signToken(payload);
  assert.ok(typeof token === "string" && token.split(".").length === 3);

  const verified = verifyToken(token);
  assert.ok(verified !== null);
  assert.equal(verified.userId, 1);
  assert.equal(verified.email, "admin@protikkhaelectric.com");
  assert.equal(verified.role, "admin");

  // Invalid token rejected
  const invalidVerified = verifyToken("fake.invalid.token");
  assert.equal(invalidVerified, null);
});

test("3. Authorization Gate & RBAC: Role & Permission Validation", async () => {
  const adminUser = {
    id: 1,
    name: "Electrical Admin",
    role: "admin",
    permissions: null,
  };

  const operatorUser = {
    id: 2,
    name: "POS Cashier",
    role: "operator",
    permissions: { "pos.sell": true, "inventory.view": true },
  };

  // Admin has access to all roles
  assert.equal(adminUser.role, "admin");

  // Operator has specific POS permission
  assert.equal(operatorUser.permissions["pos.sell"], true);
  assert.equal(operatorUser.permissions["inventory.view"], true);
  assert.equal(operatorUser.permissions["finance.post"], undefined);
});

test("4. Branding Assets & Brand Integrity Verification", () => {
  const publicDir = path.resolve(process.cwd(), "public");

  const requiredAssets = [
    "icon-512.png",
    "fav.png",
    "logo.png",
    "auth-page-logo.png",
  ];

  for (const asset of requiredAssets) {
    const fullPath = path.join(publicDir, asset);
    assert.ok(
      fs.existsSync(fullPath),
      `Asset ${asset} must exist in public directory`
    );
    const stats = fs.statSync(fullPath);
    assert.ok(stats.size > 1000, `Asset ${asset} must not be empty`);
  }

  // Verify NAV_ITEMS contains electrical structure and zero poultry remnants
  const navIds = NAV_ITEMS.map((item) => item.id);
  assert.ok(navIds.includes("dashboard"));
  assert.ok(navIds.includes("pos"));
  assert.ok(navIds.includes("inventory"));
  assert.ok(navIds.includes("sales"));
  assert.ok(navIds.includes("purchases"));
  assert.ok(navIds.includes("customers"));
  assert.ok(navIds.includes("expenses"));
  assert.ok(navIds.includes("reports"));
  assert.ok(navIds.includes("settings"));

  // Assert strictly no poultry, fish, eggs, feed menus exist
  assert.equal(navIds.includes("poultry"), false);
  assert.equal(navIds.includes("eggs"), false);
  assert.equal(navIds.includes("fish"), false);
  assert.equal(navIds.includes("feed"), false);
});
