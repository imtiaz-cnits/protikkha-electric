/**
 * Protikkha Electric - Electrical Unit & Packaging Conversion Engine
 * 
 * Supports dynamic packaging conversions for:
 * - Wires & Cables (Reels/Coils to Meters and Cut-length sales)
 * - Pipes & Conduits (Bundles to Length/Pipes)
 * - Switches, Sockets & Accessories (Boxes/Packs to Pieces)
 * - Fasteners & Hardware (Packs/Boxes to Pieces or Kg)
 */

export interface ReelConversionResult {
  fullReels: number;
  cutMeters: number;
  fractionalReels: number;
}

export interface BoxConversionResult {
  fullBoxes: number;
  remainingPcs: number;
  fractionalBoxes: number;
}

/**
 * Convert cable reels/coils into total base meters
 * e.g. 5 reels x 100 meters = 500 meters
 */
export function convertReelToMeters(reels: number, metersPerReel: number = 100): number {
  const safeReels = Math.max(0, Number(reels) || 0);
  const safeMetersPerReel = Math.max(0, Number(metersPerReel) || 100);
  return parseFloat((safeReels * safeMetersPerReel).toFixed(3));
}

/**
 * Break down a total meter quantity into full reels and cut/remaining meters
 * e.g. 265 meters of 100m reels -> 2 full reels + 65 cut meters (2.65 reels)
 */
export function convertMetersToReelAndCut(
  totalMeters: number,
  metersPerReel: number = 100
): ReelConversionResult {
  const safeMeters = Math.max(0, Number(totalMeters) || 0);
  const safeRatio = metersPerReel > 0 ? Number(metersPerReel) : 100;

  const fullReels = Math.floor(safeMeters / safeRatio);
  const cutMeters = parseFloat((safeMeters % safeRatio).toFixed(3));
  const fractionalReels = parseFloat((safeMeters / safeRatio).toFixed(3));

  return {
    fullReels,
    cutMeters,
    fractionalReels,
  };
}

/**
 * Convert boxes or packs into base pieces
 * e.g. 10 boxes x 20 pcs/box = 200 pcs
 */
export function convertBoxToPieces(boxes: number, pcsPerBox: number): number {
  const safeBoxes = Math.max(0, Number(boxes) || 0);
  const safePcs = Math.max(0, Number(pcsPerBox) || 1);
  return Math.round(safeBoxes * safePcs);
}

/**
 * Break down pieces into full boxes and loose pieces
 * e.g. 45 switches where 1 box = 10 pcs -> 4 full boxes + 5 loose pieces
 */
export function convertPiecesToBoxAndPcs(
  totalPieces: number,
  pcsPerBox: number
): BoxConversionResult {
  const safePieces = Math.max(0, Number(totalPieces) || 0);
  const safePcsPerBox = pcsPerBox > 0 ? Math.round(pcsPerBox) : 1;

  const fullBoxes = Math.floor(safePieces / safePcsPerBox);
  const remainingPcs = safePieces % safePcsPerBox;
  const fractionalBoxes = parseFloat((safePieces / safePcsPerBox).toFixed(2));

  return {
    fullBoxes,
    remainingPcs,
    fractionalBoxes,
  };
}

/**
 * Generic Packaging Converter supporting any registered packaging unit ratio
 */
export function convertPackagingQuantity(
  quantity: number,
  conversionRatio: number,
  toBaseUnit: boolean = true
): number {
  const safeQty = Math.max(0, Number(quantity) || 0);
  const safeRatio = conversionRatio > 0 ? Number(conversionRatio) : 1;

  if (toBaseUnit) {
    return parseFloat((safeQty * safeRatio).toFixed(4));
  } else {
    return parseFloat((safeQty / safeRatio).toFixed(4));
  }
}

/**
 * Format electrical quantity with appropriate unit label (e.g. "15.5 Meter", "2 Reel", "10 Pcs", "5 Box")
 */
export function formatElectricalQty(
  qty: number | string | null | undefined,
  item?: {
    unit?: string | null;
    packaging_unit?: string | null;
    conversion_ratio?: number | null;
    spec_type?: string | null;
  } | null
): string {
  const numericQty = parseFloat(String(qty ?? 0));
  if (isNaN(numericQty)) return "0 Pcs";

  const formattedNum = Number.isInteger(numericQty)
    ? String(numericQty)
    : numericQty.toFixed(2).replace(/\.?0+$/, "");

  const unit = item?.packaging_unit || item?.unit || "Pcs";
  return `${formattedNum} ${unit}`;
}

/**
 * Format total electrical order quantity across invoice items
 */
export function formatElectricalOrderQty(
  details?: Array<{
    quantity?: number | string | null;
    unit?: string | null;
    packaging_unit?: string | null;
  }> | null,
  fallbackQty?: number | string | null,
  _ignoredFlag?: any
): string {
  if (!details || details.length === 0) {
    return `${fallbackQty ?? 0} Items`;
  }
  if (details.length === 1) {
    return formatElectricalQty(details[0].quantity, details[0]);
  }
  const totalQty = details.reduce((acc, it) => acc + (parseFloat(String(it.quantity || 0)) || 0), 0);
  const formattedNum = Number.isInteger(totalQty) ? String(totalQty) : totalQty.toFixed(1);
  return `${details.length} Items (${formattedNum} Units)`;
}

// Backward compatibility alias
export const formatTileOrItemQty = formatElectricalQty;
export const formatOrderQty = formatElectricalOrderQty;

export function parseBoxAndPcs(
  boxes: number | string | null | undefined,
  pcsPerBox?: number | string | null,
  _ignoredTileSize?: any
): { fullBoxes: number; pcs: number; formatted: string } {
  const numBoxes = Math.max(0, parseFloat(String(boxes || 0)));
  const ratio = Math.max(1, Number(pcsPerBox) || 1);
  const totalUnits = Math.round(numBoxes * ratio);
  const fullBoxes = Math.floor(totalUnits / ratio);
  const pcs = totalUnits % ratio;
  let formatted = "";
  if (fullBoxes > 0 && pcs > 0) {
    formatted = `${fullBoxes} Box${fullBoxes > 1 ? "es" : ""} ${pcs} Pcs`;
  } else if (fullBoxes > 0) {
    formatted = `${fullBoxes} Box${fullBoxes > 1 ? "es" : ""}`;
  } else if (pcs > 0) {
    formatted = `${pcs} Pcs`;
  } else {
    formatted = "0 Box";
  }
  return { fullBoxes, pcs, formatted };
}

export function formatBoxAndPcs(
  boxes: number | string | null | undefined,
  pcsPerBox?: number | string | null,
  _ignoredTileSize?: any
): string {
  return parseBoxAndPcs(boxes, pcsPerBox).formatted;
}

