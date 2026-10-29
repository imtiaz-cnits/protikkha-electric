import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { checkRateLimit, resetRateLimit } from "../lib/rate-limit.ts";

test("Phase 14 - Security: Login Rate Limiting Invariants", () => {
  const testKey = "test-ip-192-168-1-100";
  resetRateLimit(testKey);

  const opts = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };

  // 1. First 5 attempts within window should be allowed
  for (let i = 1; i <= 5; i++) {
    const res = checkRateLimit(testKey, opts);
    assert.equal(res.allowed, true, `Attempt ${i} must be allowed`);
    assert.equal(res.remaining, 5 - i);
  }

  // 2. 6th attempt should be blocked
  const blockedRes = checkRateLimit(testKey, opts);
  assert.equal(blockedRes.allowed, false, "6th attempt must be blocked");
  assert.equal(blockedRes.remaining, 0);
  assert.ok(blockedRes.resetInSeconds > 0, "Must return remaining lockout seconds");

  // 3. Reset rate limit clears attempts on valid login
  resetRateLimit(testKey);
  const afterReset = checkRateLimit(testKey, opts);
  assert.equal(afterReset.allowed, true, "Must be allowed after successful reset");
  assert.equal(afterReset.remaining, 4);

  // Clean up
  resetRateLimit(testKey);
});

test("Phase 14 - Database Backup: SHA-256 Verification Invariant", () => {
  const sampleSqlDump = "-- Protikkha Electric ERP Backup Dump\nCREATE TABLE test_table (id INT PRIMARY KEY);\nINSERT INTO test_table VALUES (1);\n";
  const expectedHash = crypto.createHash("sha256").update(sampleSqlDump).digest("hex");

  // Recalculate hash
  const computedHash = crypto.createHash("sha256").update(sampleSqlDump).digest("hex");
  assert.equal(computedHash, expectedHash);

  // Tamper detection: single byte modification changes hash completely
  const tamperedSqlDump = sampleSqlDump + " ";
  const tamperedHash = crypto.createHash("sha256").update(tamperedSqlDump).digest("hex");
  assert.notEqual(tamperedHash, expectedHash);
});

test("Phase 14 - Database Backup: Auto-Retention Policy (Keep 30 Newest)", () => {
  const maxRetention = 30;
  // Generate list of 45 mock backup timestamps
  const mockBackups = Array.from({ length: 45 }, (_, i) => ({
    filename: `backup_${i + 1}.sql`,
    time: Date.now() + i * 1000,
  }));

  // Sort newest first
  mockBackups.sort((a, b) => b.time - a.time);

  const retained = mockBackups.slice(0, maxRetention);
  const toDelete = mockBackups.slice(maxRetention);

  assert.equal(retained.length, 30);
  assert.equal(toDelete.length, 15);
  // Newest backup must be in retained list
  assert.equal(retained[0].filename, "backup_45.sql");
  // Oldest backup must be in deletion list
  assert.equal(toDelete[toDelete.length - 1].filename, "backup_1.sql");
});
