import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Simple robust CSV parser handling quoted values with commas
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let insideQuotes = false;

  const cleanText = text.replace(/^\uFEFF/, ""); // Remove BOM if present

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentVal.trim());
      currentVal = "";
      if (currentRow.length > 0 && currentRow.some((val) => val.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((val) => val.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    const userId = authUser?.id ? Number(authUser.id) : 1;
    let csvText = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { status: "error", message: "No CSV file provided in 'file' field" },
          { status: 400 }
        );
      }
      csvText = await file.text();
    } else {
      const body = await req.json();
      csvText = body.csv_data || "";
    }

    if (!csvText.trim()) {
      return NextResponse.json(
        { status: "error", message: "CSV content is empty" },
        { status: 400 }
      );
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return NextResponse.json(
        { status: "error", message: "CSV must contain a header row and at least one data row" },
        { status: 400 }
      );
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const getColIdx = (names: string[]) => {
      for (const name of names) {
        const idx = headers.findIndex((h) => h === name.toLowerCase());
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const nameIdx = getColIdx(["product name", "name", "product_name"]);
    const codeIdx = getColIdx(["product codes", "code", "barcode", "sku", "product_code"]);
    const catIdx = getColIdx(["category", "category name", "category_name"]);
    const brandIdx = getColIdx(["brand", "brand name", "brand_name"]);
    const unitIdx = getColIdx(["unit", "unit name", "unit_name"]);
    const sellPriceIdx = getColIdx(["selling price", "sell price", "price", "sell_price"]);
    const costPriceIdx = getColIdx(["cost price", "cost", "cost_price"]);
    const stockIdx = getColIdx(["stock quantity", "quantity", "stock", "opening stock"]);
    const specTypeIdx = getColIdx(["spec type", "specification type", "spec_type"]);
    const conductorIdx = getColIdx(["conductor material", "conductor", "conductor_material"]);
    const cableSizeIdx = getColIdx(["cable size", "size", "cable_size"]);
    const coreCountIdx = getColIdx(["core count", "cores", "core_count"]);
    const currentRatingIdx = getColIdx(["current rating", "ampere", "current_rating"]);
    const voltageIdx = getColIdx(["voltage grade", "voltage", "voltage_grade"]);
    const wattageIdx = getColIdx(["wattage", "watt", "watts"]);
    const cutSellableIdx = getColIdx(["is cut sellable", "cut sellable", "is_cut_sellable"]);

    if (nameIdx === -1) {
      return NextResponse.json(
        { status: "error", message: "Header missing required 'Product Name' column" },
        { status: 400 }
      );
    }

    // Cache existing categories, brands, units
    const [allCats, allBrands, allUnits] = await Promise.all([
      prisma.categories.findMany(),
      prisma.brands.findMany(),
      prisma.units.findMany(),
    ]);

    const catMap = new Map<string, bigint>();
    allCats.forEach((c) => catMap.set(c.category_name.toLowerCase().trim(), c.id));

    const brandMap = new Map<string, bigint>();
    allBrands.forEach((b) => brandMap.set(b.name.toLowerCase().trim(), b.id));

    const unitMap = new Map<string, bigint>();
    allUnits.forEach((u) => unitMap.set(u.unit_name.toLowerCase().trim(), u.id));

    let importedCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    // Process each row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      const productName = row[nameIdx]?.trim();

      if (!productName) {
        errors.push({ row: rowNum, error: "Empty product name" });
        continue;
      }

      // Codes parsing
      let rawCodes = codeIdx !== -1 && row[codeIdx] ? row[codeIdx].trim() : "";
      let codesArray: string[] = [];
      if (rawCodes) {
        codesArray = rawCodes.split(/[;,|]/).map((c) => c.trim()).filter(Boolean);
      }
      if (codesArray.length === 0) {
        codesArray = [`PE-${Date.now().toString().slice(-6)}-${rowNum}`];
      }

      // Check duplicate barcode
      const rawMatches = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, product_name FROM products WHERE product_code LIKE ? LIMIT 1`,
        `%${codesArray[0]}%`
      );
      const existingWithCode = rawMatches && rawMatches.length > 0 ? rawMatches[0] : null;

      if (existingWithCode) {
        errors.push({
          row: rowNum,
          error: `Barcode/Code '${codesArray[0]}' already exists on product ID #${existingWithCode.id} (${existingWithCode.product_name})`,
        });
        continue;
      }

      // Category lookup / creation
      const catName = (catIdx !== -1 && row[catIdx]?.trim()) || "Electrical Supplies";
      let categoryId = catMap.get(catName.toLowerCase());
      if (!categoryId) {
        const createdCat = await prisma.categories.create({
          data: { category_name: catName, status: "active", user_id: BigInt(userId) },
        });
        categoryId = createdCat.id;
        catMap.set(catName.toLowerCase(), categoryId);
      }

      // Brand lookup / creation
      const brandName = (brandIdx !== -1 && row[brandIdx]?.trim()) || "General Electric";
      let brandId = brandMap.get(brandName.toLowerCase());
      if (!brandId) {
        const createdBrand = await prisma.brands.create({
          data: { name: brandName, status: "active", user_id: BigInt(userId) },
        });
        brandId = createdBrand.id;
        brandMap.set(brandName.toLowerCase(), brandId);
      }

      // Unit lookup / creation
      const unitName = (unitIdx !== -1 && row[unitIdx]?.trim()) || "Pcs";
      let unitId = unitMap.get(unitName.toLowerCase());
      if (!unitId) {
        const createdUnit = await prisma.units.create({
          data: { unit_name: unitName, status: "active", user_id: BigInt(userId) },
        });
        unitId = createdUnit.id;
        unitMap.set(unitName.toLowerCase(), unitId);
      }

      const sellPrice = sellPriceIdx !== -1 && row[sellPriceIdx] ? parseFloat(row[sellPriceIdx]) || 0 : 0;
      const costPrice = costPriceIdx !== -1 && row[costPriceIdx] ? parseFloat(row[costPriceIdx]) || 0 : 0;
      const quantity = stockIdx !== -1 && row[stockIdx] ? parseFloat(row[stockIdx]) || 0 : 0;

      // Spec values
      const specType = specTypeIdx !== -1 && row[specTypeIdx] ? row[specTypeIdx].trim().toUpperCase() : null;
      const conductorMaterial = conductorIdx !== -1 && row[conductorIdx] ? row[conductorIdx].trim() : null;
      const cableSize = cableSizeIdx !== -1 && row[cableSizeIdx] ? row[cableSizeIdx].trim() : null;
      const coreCount = coreCountIdx !== -1 && row[coreCountIdx] ? parseInt(row[coreCountIdx]) || null : null;
      const currentRating = currentRatingIdx !== -1 && row[currentRatingIdx] ? row[currentRatingIdx].trim() : null;
      const voltageGrade = voltageIdx !== -1 && row[voltageIdx] ? row[voltageIdx].trim() : null;
      const wattage = wattageIdx !== -1 && row[wattageIdx] ? row[wattageIdx].trim() : null;

      try {
        await prisma.$transaction(async (tx) => {
          const newProduct = await tx.products.create({
            data: {
              product_name: productName,
              product_code: JSON.stringify(codesArray),
              category_id: categoryId,
              brand_id: brandId,
              unit_id: unitId,
              user_id: BigInt(userId),
              sell_price: sellPrice.toString(),
              cost_price: costPrice.toString(),
              quantity: quantity.toString(),
              status: "active",
            },
          });

          if (specType || conductorMaterial || cableSize || currentRating || wattage) {
            await tx.electrical_specifications.create({
              data: {
                product_id: newProduct.id,
                spec_type: specType || "GENERAL",
                conductor_material: conductorMaterial,
                cable_size: cableSize,
                core_count: coreCount,
                voltage_grade: voltageGrade,
                current_rating: currentRating,
                wattage: wattage,
              },
            });
          }

          // Record opening stock movement if stock > 0
          if (quantity > 0) {
            await tx.stock_movements.create({
              data: {
                product_id: newProduct.id,
                movement_type: "OPENING_STOCK",
                quantity: quantity.toString(),
                unit_price: costPrice.toString(),
                total_value: (quantity * costPrice).toString(),
                reference_type: "OPENING_STOCK",
                reference_no: `IMPORT-ROW-${rowNum}`,
                stock_after: quantity.toString(),
                user_id: BigInt(userId),
                note: `Master Catalog CSV Import (Initial Opening Stock: ${quantity} ${unitName})`,
              },
            });
          }
        });

        importedCount++;
      } catch (rowErr: any) {
        errors.push({ row: rowNum, error: rowErr.message || "Failed to insert product" });
      }
    }

    return NextResponse.json({
      status: "success",
      message: `Master Catalog Import complete: ${importedCount} products added successfully.`,
      imported_count: importedCount,
      total_rows: rows.length - 1,
      errors,
    });
  } catch (error: any) {
    console.error("Product import error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to import CSV" },
      { status: 500 }
    );
  }
}
