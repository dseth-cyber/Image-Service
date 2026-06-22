import { getPrisma } from '../../lib/prisma.js';

export interface CreateAuditLogInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function createAuditLog(input: CreateAuditLogInput) {
  const prisma = getPrisma();

  return prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      description: input.description ?? null,
      metadata: (input.metadata ?? {}) as any,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export async function searchAuditLogs(params: {
  page?: number;
  limit?: number;
  action?: string;
  entity?: string;
  entityId?: string;
  userId?: string;
  from?: string;
  to?: string;
}) {
  const prisma = getPrisma();
  const { page = 1, limit = 50, action, entity, entityId, userId, from, to } = params;

  const where: Record<string, any> = {};
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { username: true } } },
    }),
  ]);

  return {
    data: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      username: r.user?.username ?? null,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      description: r.description,
      metadata: r.metadata,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt.toISOString(),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
