import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes cleanly
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number or Prisma Decimal into dynamic Bangladeshi Currency format
 * e.g. 24800.5 -> "৳ 24,800.50"
 */
export function formatBdCurrency(amount: any): string {
  if (amount === null || amount === undefined) {
    return '৳ 0.00';
  }

  const strVal = typeof amount === 'object' && 'toString' in amount ? amount.toString() : String(amount);
  const num = Number(strVal);
  if (isNaN(num)) {
    return '৳ 0.00';
  }

  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Bangladeshi comma grouping format (last 3 digits, then groups of 2 digits)
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);

  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }

  const formattedInteger =
    otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return `৳ ${formattedInteger}.${decimalPart}`;
}

/**
 * Deep serializer for BigInt values to ensure clean JSON responses
 */
export function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? (Number.isSafeInteger(Number(value)) ? Number(value) : value.toString()) : value
    )
  );
}
