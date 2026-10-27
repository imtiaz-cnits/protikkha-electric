import prisma from "./prisma";
import { Prisma } from "@prisma/client";

export interface BiomassEstimateResult {
  fishCount: number;
  avgWeightGm: number;
  totalBiomassKg: number;
}

/**
 * Pure Calculation: Fish Biomass Estimation
 * Total Biomass (kg) = (Fish Count * Average Weight in Grams) / 1000
 */
export function calculateFishBiomass(
  fishCount: number,
  avgWeightGm: number
): BiomassEstimateResult {
  const count = Math.max(0, fishCount);
  const avg = Math.max(0, avgWeightGm);
  const biomass = parseFloat(((count * avg) / 1000).toFixed(3));
  return {
    fishCount: count,
    avgWeightGm: avg,
    totalBiomassKg: biomass,
  };
}

export interface HarvestCostingResult {
  totalBatchCost: number;
  totalBiomassKg: number;
  harvestedWeightKg: number;
  costPerKg: number;
  allocatedHarvestCost: number;
  sellingPricePerKg: number;
  totalRevenue: number;
  directSellingExpenses: number;
  netRealizedProfit: number;
  remainingBiomassKg: number;
  remainingBatchCost: number;
}

/**
 * Pure Calculation: Partial and Final Fish Harvest Costing & Margin Engine
 * Uses weighted-average batch cost allocation:
 * Cost per kg = Total Batch Cost / Total Available Biomass (kg)
 * Cost of Harvested Stock = Harvested kg * Cost per kg
 * Realized Profit = Total Revenue - (Allocated Harvest Cost + Direct Selling Expenses)
 */
export function calculateFishHarvestCosting(
  totalBatchCost: number,
  totalAvailableBiomassKg: number,
  harvestedWeightKg: number,
  sellingPricePerKg: number,
  directSellingExpenses: number = 0
): HarvestCostingResult {
  const cost = Math.max(0, totalBatchCost);
  const biomass = Math.max(0, totalAvailableBiomassKg);
  const harvestedKg = Math.max(0, harvestedWeightKg);
  const price = Math.max(0, sellingPricePerKg);
  const directExp = Math.max(0, directSellingExpenses);

  const costPerKg = biomass > 0 ? parseFloat((cost / biomass).toFixed(2)) : 0;
  const allocatedCost = parseFloat((harvestedKg * costPerKg).toFixed(2));
  const revenue = parseFloat((harvestedKg * price).toFixed(2));
  const netProfit = parseFloat((revenue - (allocatedCost + directExp)).toFixed(2));

  const remainingBiomass = Math.max(0, parseFloat((biomass - harvestedKg).toFixed(3)));
  const remainingCost = Math.max(0, parseFloat((cost - allocatedCost).toFixed(2)));

  return {
    totalBatchCost: cost,
    totalBiomassKg: biomass,
    harvestedWeightKg: harvestedKg,
    costPerKg,
    allocatedHarvestCost: allocatedCost,
    sellingPricePerKg: price,
    totalRevenue: revenue,
    directSellingExpenses: directExp,
    netRealizedProfit: netProfit,
    remainingBiomassKg: remainingBiomass,
    remainingBatchCost: remainingCost,
  };
}
