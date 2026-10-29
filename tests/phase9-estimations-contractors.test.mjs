import test from "node:test";
import assert from "node:assert/strict";

test("1. Project Estimation Bill of Materials (BOM) Subtotal & Net Estimation Invariant", () => {
  // Scenario: Electrician submits BOM for a 3-storey apartment wiring
  const items = [
    { name: "BRB 1.5 rm Single Core Cable (100m Reel)", qty: 6, unitPrice: 3200 }, // 19,200
    { name: "BRB 2.5 rm Single Core Cable (100m Reel)", qty: 4, unitPrice: 5100 }, // 20,400
    { name: "Schneider 63A DP Main Breaker", qty: 3, unitPrice: 1250 }, // 3,750
    { name: "Schneider 16A SP Breaker", qty: 24, unitPrice: 320 }, // 7,680
    { name: "Super Star 2-Gang Switch", qty: 20, unitPrice: 220 }, // 4,400
    { name: "PVC Conduit Pipe 0.75-inch (Bundle)", qty: 15, unitPrice: 650 }, // 9,750
  ];

  const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  assert.equal(subtotal, 65180);

  const discountAmount = 1180;
  const estimatedTotal = Math.max(0, subtotal - discountAmount);
  assert.equal(estimatedTotal, 64000);
});

test("2. Electrician & Contractor Referral Commission Calculation Invariant", () => {
  // Scenario: Electrician Kabir brings a client with ৳65,180 materials subtotal.
  // Agreed contractor commission is 4.0%
  const subtotal = 65180;
  const commissionPercent = 4.0;

  const commissionAmount = Math.round(((subtotal * commissionPercent) / 100) * 100) / 100;
  assert.equal(commissionAmount, 2607.20);

  // If fixed fee per cable reel is used (e.g. ৳50 incentive per reel for 10 reels)
  const cableReelCount = 10;
  const fixedIncentivePerReel = 50;
  const fixedCommission = cableReelCount * fixedIncentivePerReel;
  assert.equal(fixedCommission, 500);
});

test("3. Quotation Validity Period & Expiry Invariant", () => {
  function checkQuotationValidity(createdDateStr, validityDays, checkDateStr) {
    const cDate = new Date(createdDateStr);
    const expDate = new Date(cDate);
    expDate.setDate(expDate.getDate() + validityDays);

    const refDate = new Date(checkDateStr);
    const isExpired = refDate > expDate;

    return {
      expiryDateStr: expDate.toISOString().split("T")[0],
      isExpired,
      isConvertible: !isExpired,
    };
  }

  // Created 2026-10-01 with 15 days validity
  const validCheck = checkQuotationValidity("2026-10-01", 15, "2026-10-10");
  assert.equal(validCheck.expiryDateStr, "2026-10-16");
  assert.equal(validCheck.isExpired, false);
  assert.equal(validCheck.isConvertible, true);

  // Checked after 15 days on 2026-10-20
  const expiredCheck = checkQuotationValidity("2026-10-01", 15, "2026-10-20");
  assert.equal(expiredCheck.isExpired, true);
  assert.equal(expiredCheck.isConvertible, false);
});

test("4. Quotation to Sales Order Conversion State Machine & Invariant", () => {
  function convertQuotationToOrder(quotation, currentStockMap) {
    if (quotation.status === "CONVERTED_TO_ORDER") {
      throw new Error("Quotation is already converted to order");
    }
    if (quotation.status === "REJECTED") {
      throw new Error("Cannot convert rejected quotation");
    }

    // Verify stock availability
    for (const it of quotation.items) {
      const available = currentStockMap[it.productId] || 0;
      if (it.qty > available) {
        throw new Error(`Insufficient stock for product ID ${it.productId}`);
      }
    }

    const orderId = 2055;
    const orderNo = `ORD-CONV-${quotation.id}`;

    return {
      ...quotation,
      status: "CONVERTED_TO_ORDER",
      orderId,
      orderNo,
    };
  }

  const quotation = {
    id: 42,
    quotationNo: "QUOT-20261028-101",
    status: "APPROVED",
    items: [
      { productId: 1, qty: 5, unitPrice: 3200 },
      { productId: 2, qty: 2, unitPrice: 5100 },
    ],
  };

  const currentStockMap = { 1: 50, 2: 20 };

  const converted = convertQuotationToOrder(quotation, currentStockMap);
  assert.equal(converted.status, "CONVERTED_TO_ORDER");
  assert.equal(converted.orderId, 2055);

  // Cannot convert twice
  assert.throws(
    () => convertQuotationToOrder(converted, currentStockMap),
    /already converted to order/
  );
});

test("5. Multi-Packaging Units Calculation in Project Estimation", () => {
  // Scenario: Quotation contains items in different packaging units
  // - 5 Reels of 100m = 500 Meters
  // - 10 Boxes of 20 Switches = 200 Pieces
  const reelQty = 5;
  const metersPerReel = 100;
  const totalMeters = reelQty * metersPerReel;
  assert.equal(totalMeters, 500);

  const boxQty = 10;
  const pcsPerBox = 20;
  const totalPieces = boxQty * pcsPerBox;
  assert.equal(totalPieces, 200);

  const cableRatePerMeter = 90;
  const switchRatePerPc = 180;
  const totalEstimate = totalMeters * cableRatePerMeter + totalPieces * switchRatePerPc;
  // 500 * 90 = 45,000 + 200 * 180 = 36,000 = 81,000
  assert.equal(totalEstimate, 81000);
});
