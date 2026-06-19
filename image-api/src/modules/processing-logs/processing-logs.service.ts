import { Prisma } from '@prisma/client';
import { getPrisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import type { ProcessingLogSearchInput } from './processing-logs.schema.js';
import type { PaginatedResult } from '../../types/index.js';

function mapBigInt(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(mapBigInt);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, mapBigInt(v)]),
    );
  }
  return obj;
}

export async function searchProcessingLogs(params: ProcessingLogSearchInput): Promise<PaginatedResult<unknown>> {
  const prisma = getPrisma();
  const { page, limit, sort, order, ...filters } = params;

  const where: Prisma.ProcessingJobWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.jobType) where.jobType = filters.jobType;
  if (filters.q) {
    where.OR = [
      { image: { originalFilename: { contains: filters.q, mode: 'insensitive' } } },
      { imageId: filters.q },
      { errorMessage: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.ProcessingJobOrderByWithRelationInput = {};
  if (sort === 'queuedAt') orderBy.queuedAt = order;
  else if (sort === 'startedAt') orderBy.startedAt = order;
  else if (sort === 'completedAt') orderBy.completedAt = order;
  else orderBy.queuedAt = 'desc';

  const [total, rows] = await Promise.all([
    prisma.processingJob.count({ where }),
    prisma.processingJob.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        image: { select: { originalFilename: true } },
      },
    }),
  ]);

  const data = rows.map((row) => {
    const r = mapBigInt(row) as Record<string, unknown>;
    const raw = row as typeof row;
    const durationMs = raw.startedAt && raw.completedAt
      ? raw.completedAt.getTime() - raw.startedAt.getTime()
      : null;
    return {
      id: r.id,
      imageId: r.imageId,
      imageFilename: (r.image as { originalFilename: string } | null)?.originalFilename ?? null,
      jobType: r.jobType,
      workerId: r.workerId,
      status: r.status,
      priority: r.priority,
      queueName: r.queueName,
      errorMessage: r.errorMessage,
      errorDetails: r.errorDetails,
      retryCount: r.retryCount,
      maxRetries: r.maxRetries,
      queuedAt: raw.queuedAt.toISOString(),
      startedAt: raw.startedAt?.toISOString() ?? null,
      completedAt: raw.completedAt?.toISOString() ?? null,
      durationMs,
      duration: durationMs !== null ? `${(durationMs / 1000).toFixed(1)}s` : null,
    };
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProcessingStats() {
  const prisma = getPrisma();

  const [statusCounts, typeCounts] = await Promise.all([
    prisma.processingJob.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.processingJob.groupBy({
      by: ['jobType'],
      _count: { id: true },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const s of statusCounts) {
    byStatus[s.status] = s._count.id;
  }

  const byType = typeCounts.map((t) => ({
    jobType: t.jobType,
    count: t._count.id,
  }));

  const total = statusCounts.reduce((s, c) => s + c._count.id, 0);
  const completed = byStatus['completed'] ?? 0;
  const failed = byStatus['failed'] ?? 0;
  const running = byStatus['running'] ?? 0;
  const queued = byStatus['queued'] ?? 0;

  return {
    total,
    completed,
    failed,
    running,
    queued,
    byStatus,
    byType,
  };
}

export async function getStreamData() {
  const [stats, logsResult] = await Promise.all([
    getProcessingStats(),
    searchProcessingLogs({ page: 1, limit: 20, sort: 'queuedAt', order: 'desc' }),
  ]);
  return { stats, logs: logsResult.data };
}

export async function retryJob(jobId: string) {
  const prisma = getPrisma();

  const job = await prisma.processingJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new NotFoundError('ProcessingJob', jobId);
  }

  if (job.status !== 'failed' && job.status !== 'dead_letter') {
    throw new Error(`Cannot retry job with status '${job.status}'`);
  }

  const updated = await prisma.processingJob.update({
    where: { id: jobId },
    data: {
      status: 'queued',
      retryCount: { increment: 1 },
      errorMessage: null,
      errorDetails: Prisma.JsonNull,
      startedAt: null,
      completedAt: null,
    },
  });

  return { id: updated.id, status: updated.status };
}
