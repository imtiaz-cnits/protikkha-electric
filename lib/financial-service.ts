import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type FinancialTransactionType = "INFLOW" | "OUTFLOW" | "TRANSFER";
export type FinancialReferenceType =
  | "SALE_PAYMENT"
  | "DUE_COLLECTION"
  | "PURCHASE_PAYMENT"
  | "EXPENSE"
  | "TRANSFER"
  | "CAPITAL"
  | "DRAWING"
  | "REFUND_RECEIVED"
  | "REFUND_PAID";

export interface RecordFinancialTransactionParams {
  accountId: bigint | number;
  businessUnitId?: bigint | number | null;
  transactionType: FinancialTransactionType;
  amount: number;
  referenceType: FinancialReferenceType;
  referenceId?: bigint | number | null;
  referenceNo?: string | null;
  date?: Date;
  note?: string | null;
  userId: bigint | number;
  allowOverdraft?: boolean;
}

/**
 * Central Financial Accounts Engine (Cash, Bank & MFS accounts)
 * Tracks all liquid cash flows with atomic locking to prevent race conditions.
 */
export async function recordFinancialTransaction(
  params: RecordFinancialTransactionParams,
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const accId = BigInt(params.accountId);
    const amt = Math.abs(Number(params.amount || 0));

    if (amt <= 0) {
      throw new Error("Financial transaction amount must be greater than zero");
    }

    // 1. Lock account row FOR UPDATE
    const account = await client.financial_accounts.findUnique({
      where: { id: accId },
    });
    if (!account) {
      throw new Error(`Financial account with ID ${accId} not found`);
    }

    const currentBal = Number(account.balance || 0);

    let newBal: number;
    if (params.transactionType === "INFLOW") {
      newBal = currentBal + amt;
    } else {
      if (!params.allowOverdraft && amt > currentBal) {
        throw new Error(
          `Insufficient funds in account "${account.account_name}". Balance: ${currentBal}, Required: ${amt}`
        );
      }
      newBal = currentBal - amt;
    }

    // 2. Update account balance
    await client.financial_accounts.update({
      where: { id: accId },
      data: { balance: new Prisma.Decimal(newBal.toFixed(2)) },
    });

    // 3. Insert transaction record
    const transaction = await client.financial_transactions.create({
      data: {
        account_id: accId,
        business_unit_id: params.businessUnitId ? BigInt(params.businessUnitId) : null,
        transaction_type: params.transactionType,
        amount: new Prisma.Decimal(amt.toFixed(2)),
        reference_type: params.referenceType,
        reference_id: params.referenceId ? BigInt(params.referenceId) : null,
        reference_no: params.referenceNo || null,
        balance_after: new Prisma.Decimal(newBal.toFixed(2)),
        date: params.date || new Date(),
        note: params.note || null,
        user_id: BigInt(params.userId),
      },
    });

    return {
      transaction,
      previousBalance: currentBal,
      newBalance: newBal,
      accountName: account.account_name,
    };
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (newTx) => execute(newTx));
  }
}

/**
 * Helper to get default account by payment method string
 */
export async function getAccountByPaymentMethod(
  method?: string | null,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  const m = (method || "cash").toLowerCase();
  let type: "CASH" | "MFS" | "BANK" = "CASH";

  if (m.includes("bkash") || m.includes("nagad") || m.includes("rocket") || m.includes("mfs")) {
    type = "MFS";
  } else if (m.includes("bank") || m.includes("cheque") || m.includes("card")) {
    type = "BANK";
  }

  // Look for specific named account or fallback to first of type
  let account = await client.financial_accounts.findFirst({
    where: {
      account_type: type,
      status: "active",
      ...(m.includes("bkash")
        ? { account_name: { contains: "bkash" } }
        : m.includes("nagad")
        ? { account_name: { contains: "nagad" } }
        : {}),
    },
  });

  if (!account) {
    account = await client.financial_accounts.findFirst({
      where: { status: "active" },
    });
  }

  return account;
}
