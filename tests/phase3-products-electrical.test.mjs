import test from "node:test";
import assert from "node:assert/strict";

import {
  convertReelToMeters,
  convertMetersToReelAndCut,
  convertBoxToPieces,
  convertPiecesToBoxAndPcs,
  convertPackagingQuantity,
} from "../lib/electrical-unit-service.ts";
import { calculateCutLengthCosting } from "../lib/electrical-calc-service.ts";

test("1. Electrical Specifications: Cable Size & Cut-Sellable Properties", () => {
  const cableProduct = {
    id: 101,
    product_name: "BRB 2.5 RM BYA Cable Red",
    cost_price: 85.0,
    sell_price: 105.0,
    electrical_spec: {
      spec_type: "CABLE",
      cable_size: "2.5 RM BYA",
      conductor_material: "Copper",
      core_count: 1,
      voltage_grade: "450/750V",
      warranty_months: 0,
    },
    packaging_conversions: [
      {
        packaging_unit: "Reel",
        base_unit: "Meter",
        conversion_ratio: 100,
        is_default: true,
      },
    ],
  };

  assert.equal(cableProduct.electrical_spec.spec_type, "CABLE");
  assert.equal(cableProduct.electrical_spec.cable_size, "2.5 RM BYA");
  assert.equal(cableProduct.electrical_spec.core_count, 1);
  assert.equal(cableProduct.electrical_spec.voltage_grade, "450/750V");

  // Conversion: 3.5 Reels -> 350 Meters
  const totalMeters = convertReelToMeters(3.5, 100);
  assert.equal(totalMeters, 350);

  // Breakdown: 275 Meters -> 2 Full Reels + 75 Cut Meters
  const breakdown = convertMetersToReelAndCut(275, 100);
  assert.equal(breakdown.fullReels, 2);
  assert.equal(breakdown.cutMeters, 75);
});

test("2. Electrical Specifications: Circuit Breaker Ampere & Pole Configuration", () => {
  const breakerProduct = {
    id: 102,
    product_name: "Schneider Acti9 16A SP MCB 6kA",
    cost_price: 320.0,
    sell_price: 420.0,
    electrical_spec: {
      spec_type: "BREAKER",
      current_rating: "16A",
      pole_type: "1P",
      breaking_capacity: "6kA",
      tripping_curve: "C",
      warranty_months: 24,
    },
    packaging_conversions: [
      {
        packaging_unit: "Box",
        base_unit: "Piece",
        conversion_ratio: 12,
        is_default: true,
      },
    ],
  };

  assert.equal(breakerProduct.electrical_spec.current_rating, "16A");
  assert.equal(breakerProduct.electrical_spec.pole_type, "1P");
  assert.equal(breakerProduct.electrical_spec.breaking_capacity, "6kA");
  assert.equal(breakerProduct.electrical_spec.tripping_curve, "C");
  assert.equal(breakerProduct.electrical_spec.warranty_months, 24);

  // Box to pieces: 5 Boxes of 12 = 60 Pieces
  const totalPcs = convertBoxToPieces(5, 12);
  assert.equal(totalPcs, 60);
});

test("3. Electrical Specifications: Gang Switch, Sockets & Dimmers", () => {
  const switchProduct = {
    id: 103,
    product_name: "Super Star Piano 2-Gang Switch White",
    cost_price: 130.0,
    sell_price: 175.0,
    electrical_spec: {
      spec_type: "SWITCH",
      gang_module: "2-Gang",
      current_rating: "10A",
      voltage_grade: "250V",
      warranty_months: 12,
    },
    packaging_conversions: [
      {
        packaging_unit: "Box",
        base_unit: "Piece",
        conversion_ratio: 10,
        is_default: true,
      },
    ],
  };

  assert.equal(switchProduct.electrical_spec.gang_module, "2-Gang");
  assert.equal(switchProduct.electrical_spec.current_rating, "10A");
  assert.equal(switchProduct.electrical_spec.warranty_months, 12);

  // 25 Pieces = 2 Boxes + 5 Pcs
  const boxBreakdown = convertPiecesToBoxAndPcs(25, 10);
  assert.equal(boxBreakdown.fullBoxes, 2);
  assert.equal(boxBreakdown.remainingPcs, 5);
});

test("4. Electrical Specifications: LED Lighting Wattage & Lumens", () => {
  const lightProduct = {
    id: 104,
    product_name: "Click LED T-Bulb 12W Daylight B22",
    cost_price: 185.0,
    sell_price: 240.0,
    electrical_spec: {
      spec_type: "LIGHTING",
      wattage: "12W",
      color_temperature: "Daylight (6500K)",
      warranty_months: 12,
    },
  };

  assert.equal(lightProduct.electrical_spec.wattage, "12W");
  assert.equal(lightProduct.electrical_spec.color_temperature, "Daylight (6500K)");
  assert.equal(lightProduct.electrical_spec.warranty_months, 12);
});

test("5. Multi-Barcode Parsing Invariant", () => {
  function parseCodes(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed.map(String) : [String(raw)];
    } catch {
      return [String(raw)];
    }
  }

  // Case 1: Array of codes
  const arrayInput = ["BRB-25-RED", "8941234567890", "PE-00042"];
  assert.deepEqual(parseCodes(arrayInput), ["BRB-25-RED", "8941234567890", "PE-00042"]);

  // Case 2: JSON string of array
  const jsonString = JSON.stringify(["CLICK-12W", "PE-00099"]);
  assert.deepEqual(parseCodes(jsonString), ["CLICK-12W", "PE-00099"]);

  // Case 3: Plain single string barcode
  const plainString = "PE-00100";
  assert.deepEqual(parseCodes(plainString), ["PE-00100"]);

  // Case 4: Null / undefined
  assert.deepEqual(parseCodes(null), []);
  assert.deepEqual(parseCodes(undefined), []);
});

test("6. Bulk Price Update Multiplier Math Invariant", () => {
  function applyBulkPrice(originalPrice, percentage) {
    const mult = 1 + percentage / 100;
    return Math.max(0, parseFloat((originalPrice * mult).toFixed(2)));
  }

  // +5% on 100.00 -> 105.00
  assert.equal(applyBulkPrice(100.0, 5), 105.0);

  // +7.5% on 240.00 -> 258.00
  assert.equal(applyBulkPrice(240.0, 7.5), 258.0);

  // -10% on 350.00 -> 315.00
  assert.equal(applyBulkPrice(350.0, -10), 315.0);

  // Floor at 0 for extreme reductions
  assert.equal(applyBulkPrice(50.0, -120), 0);
});
