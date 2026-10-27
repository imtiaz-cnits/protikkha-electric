import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface LogAuditParams {
  userId?: bigint | number | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "CANCEL" | "ADJUST";
  entityType: string; // e.g. "ORDER", "PURCHASE", "STOCK", "FEED_ISSUE", "PAYMENT", "POULTRY", "FISH"
  entityId?: string | number | bigint | null;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Immutable Server-Side Audit Logging
 */
export async function logAudit(
  params: LogAuditParams,
  tx?: Prisma.TransactionClient
) {
  const client = tx || prisma;
  try {
    return await client.audit_logs.create({
      data: {
        user_id: params.userId ? BigInt(params.userId) : null,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId ? String(params.entityId) : null,
        old_values: params.oldValues ? JSON.stringify(params.oldValues) : null,
        new_values: params.newValues ? JSON.stringify(params.newValues) : null,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    return null;
  }
}
