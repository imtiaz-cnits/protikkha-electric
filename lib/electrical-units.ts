export interface ProductUnitOption {
  unit: string;
  /** How many base_unit equal 1 of this unit (e.g., if base is Meter: Coil=100, Goj=0.9144, Feet=0.3048) */
  ratio: number;
  label: string;
}

export interface RawPackagingConversion {
  packaging_unit: string;
  base_unit?: string;
  conversion_ratio: number;
  is_default?: boolean;
}

const DECIMAL_UNITS = new Set([
  "meter",
  "mtr",
  "goj",
  "yard",
  "feet",
  "ft",
  "foot",
  "kg",
  "gram",
  "gm",
  "mm",
  "inch",
  "in",
  "coil",
  "roll",
]);

export function allowsDecimalQty(unit?: string | null): boolean {
  if (!unit) return false;
  return DECIMAL_UNITS.has(unit.trim().toLowerCase());
}

/**
 * Standard conversion table between physical dimensional / weight / count units.
 * Value = how many `baseUnit` equal `1 targetUnit`.
 */
const STANDARD_FAMILY_RATIOS: Record<string, Array<{ unit: string; ratio: number }>> = {
  meter: [
    { unit: "Goj", ratio: 0.9144 },
    { unit: "Feet", ratio: 0.3048 },
    { unit: "Coil", ratio: 100 },
    { unit: "Roll", ratio: 90 },
    { unit: "mm", ratio: 0.001 },
    { unit: "Inch", ratio: 0.0254 },
  ],
  goj: [
    { unit: "Meter", ratio: 1.0936 },
    { unit: "Feet", ratio: 0.3333 },
    { unit: "Roll", ratio: 100 },
    { unit: "Coil", ratio: 109.36 },
    { unit: "Inch", ratio: 0.0278 },
  ],
  feet: [
    { unit: "Meter", ratio: 3.2808 },
    { unit: "Goj", ratio: 3 },
    { unit: "Inch", ratio: 0.0833 },
    { unit: "Pcs", ratio: 10 },
    { unit: "Roll", ratio: 100 },
    { unit: "Bundle", ratio: 250 },
  ],
  coil: [
    { unit: "Meter", ratio: 0.01 },
    { unit: "Goj", ratio: 0.009144 },
    { unit: "Feet", ratio: 0.003048 },
  ],
  roll: [
    { unit: "Meter", ratio: 0.0111 },
    { unit: "Goj", ratio: 0.01 },
    { unit: "Feet", ratio: 0.003333 },
  ],
  mm: [
    { unit: "Inch", ratio: 25.4 },
    { unit: "Feet", ratio: 304.8 },
    { unit: "Meter", ratio: 1000 },
  ],
  inch: [
    { unit: "Feet", ratio: 12 },
    { unit: "Goj", ratio: 36 },
    { unit: "Meter", ratio: 39.3701 },
    { unit: "mm", ratio: 0.0394 },
  ],
  kg: [
    { unit: "Gram", ratio: 0.001 },
    { unit: "Packet", ratio: 0.5 },
  ],
  gram: [
    { unit: "Kg", ratio: 1000 },
    { unit: "Packet", ratio: 500 },
  ],
  pcs: [
    { unit: "Dozen", ratio: 12 },
    { unit: "Pair", ratio: 2 },
    { unit: "Box", ratio: 10 },
    { unit: "Packet", ratio: 10 },
  ],
  dozen: [
    { unit: "Pcs", ratio: 0.0833 },
    { unit: "Box", ratio: 2 },
  ],
  packet: [
    { unit: "Pcs", ratio: 0.01 },
    { unit: "Dozen", ratio: 12 },
    { unit: "Box", ratio: 20 },
  ],
  box: [
    { unit: "Pcs", ratio: 0.1 },
    { unit: "Dozen", ratio: 1.2 },
  ],
  set: [
    { unit: "Pcs", ratio: 1 },
    { unit: "Box", ratio: 5 },
  ],
  pair: [
    { unit: "Pcs", ratio: 0.5 },
    { unit: "Dozen", ratio: 6 },
  ],
  bundle: [
    { unit: "Feet", ratio: 0.004 },
    { unit: "Pcs", ratio: 0.04 },
  ],
};

export function getProductUnitOptions(
  baseUnitRaw?: string | null,
  conversions?: RawPackagingConversion[] | null
): ProductUnitOption[] {
  const baseUnit = (baseUnitRaw || "Pcs").trim();
  const seen = new Set<string>();
  const options: ProductUnitOption[] = [];

  const addOption = (unit: string, ratio: number) => {
    const clean = unit.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key) || !(ratio > 0)) return;
    seen.add(key);
    options.push({
      unit: clean,
      ratio: Number(ratio.toFixed(6)),
      label: clean,
    });
  };

  // 1. Primary base unit is always first (ratio = 1)
  addOption(baseUnit, 1);

  // 2. Explicit DB packaging_conversions for this product take highest priority
  if (Array.isArray(conversions)) {
    for (const c of conversions) {
      if (c && c.packaging_unit && Number(c.conversion_ratio) > 0) {
        addOption(c.packaging_unit, Number(c.conversion_ratio));
      }
    }
  }

  // 3. Standard electrical measurement family units so every product can be measured flexibly
  const family = STANDARD_FAMILY_RATIOS[baseUnit.toLowerCase()];
  if (family) {
    for (const f of family) {
      addOption(f.unit, f.ratio);
    }
  }

  return options;
}

