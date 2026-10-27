import prisma from "./prisma";

export interface EggConversionResult {
  pieces: number;
  dozens: number;
  trays: number;
}

/**
 * Unit Conversion & Agricultural Conversion Engine
 */
export async function convertUnit(
  fromUnitId: bigint | number,
  toUnitId: bigint | number,
  quantity: number
): Promise<number | null> {
  const fromId = BigInt(fromUnitId);
  const toId = BigInt(toUnitId);

  if (fromId === toId) return quantity;

  // 1. Direct conversion
  const direct = await prisma.unit_conversions.findFirst({
    where: { from_unit_id: fromId, to_unit_id: toId },
  });

  if (direct) {
    const rate = Number(direct.conversion_rate);
    return direct.operator === "MULTIPLY" ? quantity * rate : quantity / rate;
  }

  // 2. Inverse conversion
  const inverse = await prisma.unit_conversions.findFirst({
    where: { from_unit_id: toId, to_unit_id: fromId },
  });

  if (inverse) {
    const rate = Number(inverse.conversion_rate);
    return inverse.operator === "MULTIPLY" ? quantity / rate : quantity * rate;
  }

  return null;
}

/**
 * Convert Egg quantities between Pieces, Dozens, and Trays
 * Requirement: Tray capacity must NOT be assumed constant (configurable tray capacity, default 30).
 */
export function convertEggUnits(
  quantity: number,
  fromUnit: "piece" | "dozen" | "tray",
  trayCapacity: number = 30
): EggConversionResult {
  const q = Math.max(0, quantity);
  let totalPieces = 0;

  if (fromUnit === "piece") {
    totalPieces = q;
  } else if (fromUnit === "dozen") {
    totalPieces = q * 12;
  } else if (fromUnit === "tray") {
    totalPieces = q * trayCapacity;
  }

  return {
    pieces: totalPieces,
    dozens: parseFloat((totalPieces / 12).toFixed(2)),
    trays: parseFloat((totalPieces / trayCapacity).toFixed(2)),
  };
}

/**
 * Convert Feed quantities: Bags to Kilograms
 */
export function convertFeedBagsToKg(bags: number, bagWeightKg: number): number {
  return Math.max(0, bags) * Math.max(0, bagWeightKg);
}

/**
 * Convert Feed quantities: Kilograms to Bags
 */
export function convertFeedKgToBags(totalKg: number, bagWeightKg: number): {
  fullBags: number;
  remainingKg: number;
  fractionalBags: number;
} {
  if (bagWeightKg <= 0) return { fullBags: 0, remainingKg: 0, fractionalBags: 0 };
  const fullBags = Math.floor(totalKg / bagWeightKg);
  const remainingKg = parseFloat((totalKg % bagWeightKg).toFixed(3));
  const fractionalBags = parseFloat((totalKg / bagWeightKg).toFixed(2));
  return { fullBags, remainingKg, fractionalBags };
}
