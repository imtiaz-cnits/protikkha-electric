import prisma from "./prisma";
import { Prisma } from "@prisma/client";
import { recordStockMovement } from "./stock-service";
import { logAudit } from "./audit-service";
import { convertEggUnits } from "./unit-service";

export interface FlockReconciliationResult {
  openingLiveBirds: number;
  additions: number;
  mortality: number;
  culling: number;
  otherRemovals: number;
  closingLiveBirds: number;
  isValid: boolean;
}

/**
 * Pure Calculation: Poultry Live-Bird Reconciliation Invariant
 * Closing live birds = Opening live birds + approved additions - mortality - culling - other removals.
 * Does NOT permit negative live-bird quantities.
 */
export function calculatePoultryReconciliation(
  opening: number,
  additions: number,
  mortality: number,
  culling: number,
  otherRemovals: number = 0
): FlockReconciliationResult {
  const o = Math.max(0, opening);
  const a = Math.max(0, additions);
  const m = Math.max(0, mortality);
  const c = Math.max(0, culling);
  const r = Math.max(0, otherRemovals);

  const totalDeductions = m + c + r;
  const available = o + a;
  const closing = available - totalDeductions;

  return {
    openingLiveBirds: o,
    additions: a,
    mortality: m,
    culling: c,
    otherRemovals: r,
    closingLiveBirds: closing,
    isValid: closing >= 0 && totalDeductions <= available,
  };
}

export interface EggReconciliationResult {
  totalCollected: number;
  rejectedBreakage: number;
  acceptedQuantity: number;
  gradeSumPieces: number;
  gradingDifference: number;
  isReconciled: boolean;
}

/**
 * Pure Calculation: Egg Production and Grading Reconciliation Invariant
 * Total collected = accepted eggs + broken/rejected eggs.
 * Accepted eggs = Sum of graded eggs (Grade A + Grade B + Grade C + ...).
 */
export function calculateEggReconciliation(
  totalCollected: number,
  rejectedBreakage: number,
  grades: { gradeId: bigint | number; pieces: number }[]
): EggReconciliationResult {
  const collected = Math.max(0, totalCollected);
  const broken = Math.max(0, rejectedBreakage);
  const accepted = Math.max(0, collected - broken);

  const gradeSum = grades.reduce((acc, g) => acc + Math.max(0, g.pieces), 0);
  const diff = accepted - gradeSum;

  return {
    totalCollected: collected,
    rejectedBreakage: broken,
    acceptedQuantity: accepted,
    gradeSumPieces: gradeSum,
    gradingDifference: diff,
    isReconciled: diff === 0,
  };
}

/**
 * Pure Calculation: Feed Conversion Ratio (FCR) for Poultry
 * FCR = Total Feed Consumed (kg) / Total Weight Gain or Egg Output
 */
export function calculateFCR(
  feedConsumedKg: number,
  totalWeightGainKg: number
): number {
  if (totalWeightGainKg <= 0 || feedConsumedKg <= 0) return 0;
  return parseFloat((feedConsumedKg / totalWeightGainKg).toFixed(2));
}

/**
 * Pure Calculation: Egg Production Laying Percentage
 * Laying % = (Daily Eggs Produced / Total Live Hens) * 100
 */
export function calculateLayingPercentage(
  dailyEggs: number,
  liveHens: number
): number {
  if (liveHens <= 0 || dailyEggs <= 0) return 0;
  return parseFloat(((dailyEggs / liveHens) * 100).toFixed(2));
}
