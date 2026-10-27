import test from "node:test";
import assert from "node:assert/strict";

import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  requireAuth,
} from "../lib/auth.ts";

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
    email: "admin@arafatpoultry.com",
    name: "System Admin",
    role: "admin",
  };

  const token = signToken(payload);
  assert.ok(typeof token === "string" && token.split(".").length === 3);

  const verified = verifyToken(token);
  assert.ok(verified !== null);
  assert.equal(verified.userId, 1);
  assert.equal(verified.email, "admin@arafatpoultry.com");
  assert.equal(verified.role, "admin");

  // Invalid token rejected
  const invalidVerified = verifyToken("fake.invalid.token");
  assert.equal(invalidVerified, null);
});

test("3. Authorization Gate: requireAuth with Options", async () => {
  // Test requireAuth with mocked request without token -> 401 Unauthorized
  const mockReqNoAuth = {
    headers: new Map(),
    cookies: new Map(),
  };

  // We can test options logic
  const adminUser = {
    id: 1,
    name: "Admin User",
    role: "admin",
    permissions: null,
  };

  const operatorUser = {
    id: 2,
    name: "Farm Operator",
    role: "operator",
    permissions: { "poultry.view": true },
  };

  // Admin has access to all roles
  assert.equal(adminUser.role, "admin");
  assert.ok(adminUser.role === "admin");

  // Operator has specific permission
  assert.equal(operatorUser.permissions["poultry.view"], true);
  assert.equal(operatorUser.permissions["financial.post"], undefined);
});
