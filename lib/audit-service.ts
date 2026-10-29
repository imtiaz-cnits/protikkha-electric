import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface LogAuditParams {
  userId?: bigint | number | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "CANCEL" | "ADJUST";
  entityType: string; // e.g. "ORDER", "PURCHASE", "STOCK", "WARRANTY", "QUOTATION", "USER", "DISCOUNT_OVERRIDE"
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

export interface AuditQueryFilter {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Retrieve Audit Logs with strict descending order (latest first)
 */
export async function queryAuditLogs(filter: AuditQueryFilter = {}) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.audit_logsWhereInput = {};

  if (filter.action && filter.action !== "all") {
    where.action = filter.action;
  }

  if (filter.entityType && filter.entityType !== "all") {
    where.entity_type = filter.entityType;
  }

  if (filter.entityId) {
    where.entity_id = filter.entityId;
  }

  if (filter.userId) {
    where.user_id = BigInt(filter.userId);
  }

  if (filter.startDate || filter.endDate) {
    where.created_at = {};
    if (filter.startDate) {
      where.created_at.gte = new Date(filter.startDate);
    }
    if (filter.endDate) {
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      where.created_at.lte = end;
    }
  }

  const [totalCount, logs] = await Promise.all([
    prisma.audit_logs.count({ where }),
    prisma.audit_logs.findMany({
      where,
      orderBy: { id: "desc" }, // Strict Rule 7.1: Newest first
      skip,
      take: pageSize,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  const serialized = logs.map((log) => {
    let oldVal = null;
    let newVal = null;
    try {
      if (log.old_values) oldVal = JSON.parse(log.old_values);
    } catch {}
    try {
      if (log.new_values) newVal = JSON.parse(log.new_values);
    } catch {}

    return {
      id: Number(log.id),
      userId: log.user_id ? Number(log.user_id) : null,
      userName: log.users?.name || "System",
      userEmail: log.users?.email || null,
      userRole: log.users?.role || "system",
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      oldValues: oldVal,
      newValues: newVal,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      createdAt: log.created_at,
    };
  });

  return {
    items: serialized,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
