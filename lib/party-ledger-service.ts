import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type PartyType = "CUSTOMER" | "SUPPLIER";
export type PartyTransactionType =
  | "INVOICE"
  | "PAYMENT"
  | "RETURN"
  | "ADJUSTMENT"
  | "PURCHASE_RETURN"
  | "SALE_RETURN";

export interface RecordPartyTransactionParams {
  partyType: PartyType;
  customerId?: bigint | number | null;
  supplierId?: bigint | number | null;
  businessUnitId?: bigint | number | null;
  transactionType: PartyTransactionType;
  referenceType: string; // "ORDER", "DUE_COLLECTION", "PURCHASE", "PURCHASE_PAYMENT", "RETURN"
  referenceId?: bigint | number | null;
  referenceNo?: string | null;
  debit?: number; // Inflow to ledger
  credit?: number; // Outflow from ledger
  date?: Date;
  note?: string | null;
  userId: bigint | number;
}

/**
 * Central Party (Customer / Supplier) Ledger Engine
 * Maintains chronological debit, credit, and running balance for every partner.
 * Keeps customer.previous_due_amount and supplier.purchase_payable_amount synchronized.
 */
export async function recordPartyTransaction(
  params: RecordPartyTransactionParams,
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const debit = Number(params.debit || 0);
    const credit = Number(params.credit || 0);

    if (params.partyType === "CUSTOMER") {
      if (!params.customerId) {
        throw new Error("Customer ID is required for Customer Ledger transaction");
      }
      const custId = BigInt(params.customerId);

      // Lock customer row FOR UPDATE
      const customer = await client.customers.findUnique({
        where: { id: custId },
      });
      if (!customer) throw new Error(`Customer ID ${custId} not found`);

      const prevBalance = parseFloat(customer.previous_due_amount || "0");
      // For customer: Debit increases due (Invoice), Credit decreases due (Payment, Return Credit)
      const newBalance = Math.max(0, prevBalance + debit - credit);

      // Create ledger entry
      const ledgerEntry = await client.party_ledger_entries.create({
        data: {
          party_type: "CUSTOMER",
          customer_id: custId,
          business_unit_id: params.businessUnitId ? BigInt(params.businessUnitId) : null,
          transaction_type: params.transactionType,
          reference_type: params.referenceType,
          reference_id: params.referenceId ? BigInt(params.referenceId) : null,
          reference_no: params.referenceNo || null,
          debit: new Prisma.Decimal(debit.toFixed(2)),
          credit: new Prisma.Decimal(credit.toFixed(2)),
          balance: new Prisma.Decimal(newBalance.toFixed(2)),
          date: params.date || new Date(),
          note: params.note || null,
          user_id: BigInt(params.userId),
        },
      });

      // Update customer previous_due_amount
      await client.customers.update({
        where: { id: custId },
        data: { previous_due_amount: String(newBalance) },
      });

      return {
        ledgerEntry,
        previousBalance: prevBalance,
        newBalance,
        partyName: customer.customer_name,
      };
    } else {
      if (!params.supplierId) {
        throw new Error("Supplier ID is required for Supplier Ledger transaction");
      }
      const suppId = BigInt(params.supplierId);

      // Lock supplier row FOR UPDATE
      const supplier = await client.suppliers.findUnique({
        where: { id: suppId },
      });
      if (!supplier) throw new Error(`Supplier ID ${suppId} not found`);

      const prevPayable = parseFloat(supplier.purchase_payable_amount || "0");
      // For supplier: Credit increases payable (Purchase Due), Debit decreases payable (Payment Made, Return Debit)
      const newPayable = Math.max(0, prevPayable + credit - debit);

      // Create ledger entry
      const ledgerEntry = await client.party_ledger_entries.create({
        data: {
          party_type: "SUPPLIER",
          supplier_id: suppId,
          business_unit_id: params.businessUnitId ? BigInt(params.businessUnitId) : null,
          transaction_type: params.transactionType,
          reference_type: params.referenceType,
          reference_id: params.referenceId ? BigInt(params.referenceId) : null,
          reference_no: params.referenceNo || null,
          debit: new Prisma.Decimal(debit.toFixed(2)),
          credit: new Prisma.Decimal(credit.toFixed(2)),
          balance: new Prisma.Decimal(newPayable.toFixed(2)),
          date: params.date || new Date(),
          note: params.note || null,
          user_id: BigInt(params.userId),
        },
      });

      // Update supplier purchase_payable_amount
      await client.suppliers.update({
        where: { id: suppId },
        data: { purchase_payable_amount: String(newPayable) },
      });

      return {
        ledgerEntry,
        previousBalance: prevPayable,
        newBalance: newPayable,
        partyName: supplier.name,
      };
    }
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (newTx) => execute(newTx));
  }
}
