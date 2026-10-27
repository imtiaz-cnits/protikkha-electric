/**
 * Tiles Specification, Geometry & POS Packaging Helper
 * Specially tailored for Runa Traders (Tiles, Sanitary & Fittings)
 */

export interface TileSizeOption {
  label: string;
  value: string;
  defaultSqftPerBox?: number;
  defaultPcsPerBox?: number;
}

export const POPULAR_TILE_SIZES: TileSizeOption[] = [
  { label: '8" × 12" (20×30 cm)', value: '8"x12"', defaultSqftPerBox: 16.66, defaultPcsPerBox: 25 },
  { label: '12" × 18" (30×45 cm)', value: '12"x18"', defaultSqftPerBox: 16.5, defaultPcsPerBox: 11 },
  { label: '12" × 20" (30×50 cm)', value: '12"x20"', defaultSqftPerBox: 16.66, defaultPcsPerBox: 10 },
  { label: '12" × 24" (30×60 cm)', value: '12"x24"', defaultSqftPerBox: 16.0, defaultPcsPerBox: 8 },
  { label: '10" × 16" (25×40 cm)', value: '10"x16"', defaultSqftPerBox: 16.66, defaultPcsPerBox: 15 },
  { label: '10.5" × 24" (27×60 cm)', value: '10.5"x24"', defaultSqftPerBox: 14.0, defaultPcsPerBox: 8 },
  { label: '16" × 16" (40×40 cm)', value: '16"x16"', defaultSqftPerBox: 16.0, defaultPcsPerBox: 9 },
  { label: '12" × 12" (30×30 cm)', value: '12"x12"', defaultSqftPerBox: 16.0, defaultPcsPerBox: 16 },
  { label: '32" × 32" (80×80 cm)', value: '32"x32"', defaultSqftPerBox: 14.222, defaultPcsPerBox: 2 },
  { label: '24" × 24" (60×60 cm)', value: '24"x24"', defaultSqftPerBox: 16.0, defaultPcsPerBox: 4 },
  { label: '48" × 24" (120×60 cm)', value: '48"x24"', defaultSqftPerBox: 16.0, defaultPcsPerBox: 2 },
];

export const TILE_GRADES = [
  { label: 'Premium (Grade A)', value: 'Grade A', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300' },
  { label: 'Commercial (Grade B)', value: 'Grade B', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' },
  { label: 'Standard (Grade C)', value: 'Grade C', badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
];

export const SURFACE_FINISHES = [
  'Glossy',
  'Matt',
  'Rustic',
  'Sugar',
  'PGVT (Polished Glazed)',
  'Satin',
  'Carving',
  'Full Body',
];

/**
 * Parse tile dimensions from strings like "8/12", "8x12", "8*12", "10.5/24", "10.5x24"
 */
export function parseTileDimension(tileSizeStr: string): { width: number; height: number } | null {
  if (!tileSizeStr) return null;
  const clean = tileSizeStr.replace(/"/g, '').trim();
  const match = clean.match(/^(\d+(?:\.\d+)?)\s*[\/xX*×]\s*(\d+(?:\.\d+)?)/);
  if (match) {
    const width = parseFloat(match[1]);
    const height = parseFloat(match[2]);
    if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }
  return null;
}

/**
 * Automatically calculate Sq.Ft per Box from dimensions and pieces per box
 */
export function autoCalculateSqftPerBox(tileSizeStr: string, pcsPerBox: number): number | null {
  const dims = parseTileDimension(tileSizeStr);
  if (!dims || !pcsPerBox || pcsPerBox <= 0) return null;
  const singleTileSqft = (dims.width * dims.height) / 144;
  const total = singleTileSqft * pcsPerBox;
  // Match clean rounding (e.g. 16.666 -> 16.66, 14.222 -> 14.222)
  if (Math.abs(total - 16.6666) < 0.05) return 16.66;
  if (Math.abs(total - 14.2222) < 0.05) return 14.222;
  return parseFloat(total.toFixed(2));
}

/**
 * Calculate required boxes from square feet needed
 */
export function calculateTileCoverage(sqftNeeded: number, sqftPerBox: number) {
  if (!sqftNeeded || !sqftPerBox || sqftPerBox <= 0) {
    return {
      boxesExact: 0,
      recommendedBoxes: 0,
      totalSqftSupplied: 0,
      extraSqft: 0,
    };
  }

  const boxesExact = sqftNeeded / sqftPerBox;
  const recommendedBoxes = Math.ceil(boxesExact);
  const totalSqftSupplied = parseFloat((recommendedBoxes * sqftPerBox).toFixed(2));
  const extraSqft = parseFloat((totalSqftSupplied - sqftNeeded).toFixed(2));

  return {
    boxesExact: parseFloat(boxesExact.toFixed(2)),
    recommendedBoxes,
    totalSqftSupplied,
    extraSqft,
  };
}

/**
 * Calculate Sq.Ft from boxes count
 */
export function calculateSqftFromBoxes(boxes: number, sqftPerBox: number): number {
  if (!boxes || !sqftPerBox) return 0;
  return parseFloat((boxes * sqftPerBox).toFixed(2));
}

/**
 * Calculate rate per Sq.Ft from box price
 */
export function calculateRatePerSqft(boxPrice: number, sqftPerBox: number): number {
  if (!boxPrice || !sqftPerBox || sqftPerBox <= 0) return 0;
  return parseFloat((boxPrice / sqftPerBox).toFixed(2));
}

/**
 * Calculate box price from Sq.Ft rate
 */
export function calculateBoxPrice(ratePerSqft: number, sqftPerBox: number): number {
  if (!ratePerSqft || !sqftPerBox) return 0;
  return parseFloat((ratePerSqft * sqftPerBox).toFixed(2));
}

/**
 * Resolve pieces per box from pcsPerBox property or fallback to popular tile sizes mapping
 */
export function getTilePcsPerBox(
  pcsPerBox?: number | string | null,
  tileSize?: string | null
): number {
  if (pcsPerBox) {
    const parsed = parseInt(String(pcsPerBox), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (tileSize) {
    const clean = tileSize.replace(/"/g, '').toLowerCase().replace(/\s+/g, '');
    const match = POPULAR_TILE_SIZES.find(
      (s) => s.value.replace(/"/g, '').toLowerCase().replace(/\s+/g, '') === clean
    );
    if (match && match.defaultPcsPerBox) return match.defaultPcsPerBox;

    const parsedDim = parseTileDimension(tileSize);
    if (parsedDim) {
      const dimKey = `${parsedDim.width}x${parsedDim.height}`;
      const revKey = `${parsedDim.height}x${parsedDim.width}`;
      const dimMatch = POPULAR_TILE_SIZES.find((s) => {
        const sVal = s.value.replace(/"/g, '').toLowerCase();
        return sVal === dimKey || sVal === revKey;
      });
      if (dimMatch && dimMatch.defaultPcsPerBox) return dimMatch.defaultPcsPerBox;
    }
  }
  return 0;
}

/**
 * Break down boxes and remaining pieces cleanly
 * e.g. 4.08 boxes of 8"x12" (25 pcs/box) => { fullBoxes: 4, pcs: 2, formatted: "4 Box, 2 Pcs" }
 * e.g. 12.4 boxes (10 pcs/box) => { fullBoxes: 12, pcs: 4, formatted: "12 Box, 4 Pcs" }
 */
export function parseBoxAndPcs(
  boxes: number | string | null | undefined,
  pcsPerBox?: number | string | null,
  tileSize?: string | null
): { fullBoxes: number; pcs: number; formatted: string } {
  if (boxes === null || boxes === undefined || boxes === "") {
    return { fullBoxes: 0, pcs: 0, formatted: "0 Box" };
  }
  const numBoxes = typeof boxes === "number" ? boxes : parseFloat(String(boxes));
  if (isNaN(numBoxes) || numBoxes <= 0) {
    return { fullBoxes: 0, pcs: 0, formatted: "0 Box" };
  }

  const pcsNum = getTilePcsPerBox(pcsPerBox, tileSize);
  let fullBoxes = Math.floor(numBoxes);
  const frac = parseFloat((numBoxes - fullBoxes).toFixed(4));
  
  let pcs = 0;
  if (pcsNum > 0) {
    pcs = Math.round(frac * pcsNum);
    if (pcs >= pcsNum) {
      fullBoxes += Math.floor(pcs / pcsNum);
      pcs = pcs % pcsNum;
    }
  } else if (frac > 0) {
    // Clean single-digit or clean fractional decimal safely without dumping 15-digit float noise
    const cleanFrac = parseFloat(frac.toFixed(2));
    if (cleanFrac > 0) {
      if (Math.round(cleanFrac * 10) === cleanFrac * 10) {
        pcs = Math.round(cleanFrac * 10);
      } else {
        pcs = Math.round(cleanFrac * 100);
      }
    }
  }

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

/**
 * Format boxes and remaining pieces cleanly
 * e.g. 75.25 boxes with 4 pcs/box => "75 Boxes 1 Pcs"
 * e.g. 12.16 boxes with 25 pcs/box => "12 Boxes 4 Pcs"
 * e.g. 10 boxes => "10 Boxes"
 */
export function formatBoxAndPcs(
  boxes: number | string | null | undefined,
  pcsPerBox?: number | string | null,
  tileSize?: string | null
): string {
  return parseBoxAndPcs(boxes, pcsPerBox, tileSize).formatted;
}

/**
 * Universal helper for Tiles vs Non-Tiles products
 * If Tiles: returns formatted "X Boxes Y Pcs", "4 Boxes", or "5 Pcs"
 * If Non-Tiles: returns "X Pcs"
 */
export function formatTileOrItemQty(
  qty: number | string | null | undefined,
  item?: {
    tile_size?: string | null;
    pcs_per_box?: number | string | null;
    unit?: string | null;
    category?: string | null;
    category_name?: string | null;
    is_tiles?: boolean;
    product_name?: string | null;
  } | null
): string {
  const numQty = typeof qty === "number" ? qty : parseFloat(String(qty || 0));
  const isTile = Boolean(
    item?.is_tiles ||
    item?.tile_size ||
    item?.pcs_per_box ||
    (item?.unit && item.unit.toLowerCase().includes("box")) ||
    (item?.category && item.category.toLowerCase().includes("tile")) ||
    (item?.category_name && item.category_name.toLowerCase().includes("tile"))
  );

  if (isNaN(numQty) || numQty <= 0) {
    return isTile ? "0 Box" : "0 Pcs";
  }

  if (isTile) {
    return formatBoxAndPcs(numQty, item?.pcs_per_box, item?.tile_size);
  }

  return `${numQty} Pcs`;
}

/**
 * Calculate boxes and remaining pieces from piece count
 */
export function calculateFromPcs(
  pcsCount: number,
  pcsPerBox: number,
  sqftPerBox: number
) {
  if (!pcsCount || !pcsPerBox || pcsPerBox <= 0) {
    return {
      totalBoxes: 0,
      fullBoxes: 0,
      remainingPcs: 0,
      totalSqft: 0,
      formattedText: "0 Box",
    };
  }

  const fullBoxes = Math.floor(pcsCount / pcsPerBox);
  const remainingPcs = pcsCount % pcsPerBox;
  const totalBoxes = parseFloat((pcsCount / pcsPerBox).toFixed(4));
  const totalSqft = parseFloat(((pcsCount / pcsPerBox) * sqftPerBox).toFixed(2));

  return {
    totalBoxes,
    fullBoxes,
    remainingPcs,
    totalSqft,
    formattedText: formatBoxAndPcs(totalBoxes, pcsPerBox),
  };
}


/**
 * Break down multi-item order / invoice quantities dynamically:
 * Dynamically calculates each tile line item by its exact pcs_per_box and tile dimensions
 * e.g. 5 boxes + 18 pcs tiles => "5 Boxes 18 Pcs"
 */
export function formatOrderQty(
  details?: Array<{
    quantity?: number | string | null;
    pcs_per_box?: number | string | null;
    tile_size?: string | null;
    unit?: string | null;
    is_tiles?: boolean;
    product_name?: string | null;
  }> | null,
  fallbackQty?: number | string | null,
  hasTilesFlag?: boolean
): string {
  if (!details || details.length === 0) {
    return hasTilesFlag ? formatBoxAndPcs(fallbackQty) : `${fallbackQty ?? 0} Pcs`;
  }
  if (details.length === 1) {
    return formatTileOrItemQty(details[0].quantity, details[0]);
  }

  let totalBoxes = 0;
  let totalPcs = 0;
  let hasTiles = Boolean(hasTilesFlag);
  let nonTileQty = 0;

  for (const it of details) {
    const isTile = Boolean(
      it.tile_size ||
      it.pcs_per_box ||
      it.is_tiles ||
      (it.unit && it.unit.toLowerCase().includes("box"))
    );
    if (isTile) {
      hasTiles = true;
      const { fullBoxes, pcs } = parseBoxAndPcs(it.quantity, it.pcs_per_box, it.tile_size);
      totalBoxes += fullBoxes;
      totalPcs += pcs;
    } else {
      nonTileQty += parseFloat(String(it.quantity || 0));
    }
  }

  if (!hasTiles) {
    const cleanQty = fallbackQty ?? nonTileQty;
    return `${cleanQty} Pcs`;
  }

  if (totalBoxes > 0 && totalPcs > 0) {
    return `${totalBoxes} Box${totalBoxes > 1 ? "es" : ""} ${totalPcs} Pcs`;
  } else if (totalBoxes > 0) {
    return `${totalBoxes} Box${totalBoxes > 1 ? "es" : ""}`;
  } else if (totalPcs > 0) {
    return `${totalPcs} Pcs`;
  }
  return "0 Box";
}
