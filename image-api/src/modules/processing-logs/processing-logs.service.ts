import { Prisma } from '@prisma/client';
import { getPrisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import { getRedisClient } from '../../lib/redis.js';
import { getAllConfigs } from '../system-config/system-config.service.js';
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

let lastTxCount = 0;
let lastTxTime = Date.now();

async function getPgMetrics(prisma: any) {
  try {
    const [activeConnRes, locksRes, deadlocksRes, txRes] = await Promise.all([
      prisma.$queryRawUnsafe("SELECT COUNT(*)::bigint as count FROM pg_stat_activity"),
      prisma.$queryRawUnsafe("SELECT COUNT(*)::bigint as count FROM pg_locks"),
      prisma.$queryRawUnsafe("SELECT COALESCE(SUM(deadlocks), 0)::bigint as deadlocks FROM pg_stat_database WHERE datname = current_database()"),
      prisma.$queryRawUnsafe("SELECT COALESCE(SUM(xact_commit + xact_rollback), 0)::bigint as tx FROM pg_stat_database WHERE datname = current_database()")
    ]) as [Array<{ count: bigint }>, Array<{ count: bigint }>, Array<{ deadlocks: bigint }>, Array<{ tx: bigint }>];

    const activeConnections = Number(activeConnRes[0]?.count ?? 0);
    const locks = Number(locksRes[0]?.count ?? 0);
    const deadlocks = Number(deadlocksRes[0]?.deadlocks ?? 0);
    const currentTx = Number(txRes[0]?.tx ?? 0);

    const now = Date.now();
    const elapsed = (now - lastTxTime) / 1000;
    let tps = 0;
    if (lastTxCount > 0 && elapsed > 0) {
      tps = Math.max(0, Math.round((currentTx - lastTxCount) / elapsed));
    }
    lastTxCount = currentTx;
    lastTxTime = now;

    return { tps, activeConnections, locks, deadlocks };
  } catch (err) {
    return { tps: 0, activeConnections: 0, locks: 0, deadlocks: 0 };
  }
}

async function getStorageMetrics(prisma: any) {
  try {
    const [totalStats, recentStats, recentRawStats] = await Promise.all([
      prisma.imageFile.aggregate({
        _count: { id: true },
        _sum: { fileSizeBytes: true }
      }),
      prisma.imageFile.aggregate({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 1000)
          }
        },
        _sum: { fileSizeBytes: true }
      }),
      prisma.imageFile.aggregate({
        where: {
          fileType: 'raw',
          createdAt: {
            gte: new Date(Date.now() - 30 * 1000)
          }
        },
        _sum: { fileSizeBytes: true }
      })
    ]);

    const objectCount = Number(totalStats._count.id ?? 0);
    const bucketSize = Number(totalStats._sum.fileSizeBytes ?? 0n);

    const recentBytes = Number(recentStats._sum.fileSizeBytes ?? 0n);
    const writeMbPerSec = Number((recentBytes / (1024 * 1024) / 30).toFixed(2));

    const recentRawBytes = Number(recentRawStats._sum.fileSizeBytes ?? 0n);
    const readMbPerSec = Number((recentRawBytes / (1024 * 1024) / 30).toFixed(2));

    return {
      writeMbPerSec,
      readMbPerSec,
      objectCount,
      bucketSize
    };
  } catch (err) {
    return { writeMbPerSec: 0, readMbPerSec: 0, objectCount: 0, bucketSize: 0 };
  }
}

async function getQueueMetrics() {
  try {
    const redis = getRedisClient();
    const [wait, active, failed, delayed] = await Promise.all([
      redis.llen('bull:image-processing:wait'),
      redis.llen('bull:image-processing:active'),
      redis.zcard('bull:image-processing:failed'),
      redis.zcard('bull:image-processing:delayed')
    ]);
    return {
      wait: Number(wait),
      active: Number(active),
      failed: Number(failed),
      delayed: Number(delayed)
    };
  } catch (err) {
    return { wait: 0, active: 0, failed: 0, delayed: 0 };
  }
}

export async function getProcessingStats() {
  const prisma = getPrisma();

  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

  const [
    statusCounts, typeCounts, queue, pgMetrics, storageMetrics,
    totalImages, cameraCounts, fileTypeStats, recentImages, cameraList, configs,
  ] = await Promise.all([
    prisma.processingJob.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.processingJob.groupBy({
      by: ['jobType'],
      _count: { id: true },
    }),
    getQueueMetrics(),
    getPgMetrics(prisma),
    getStorageMetrics(prisma),
    prisma.image.count(),
    prisma.camera.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.imageFile.groupBy({
      by: ['fileType'],
      _sum: { fileSizeBytes: true },
      _count: { id: true },
    }),
    prisma.image.groupBy({
      by: ['capturedAt'],
      where: { capturedAt: { gte: last7Days } },
      _count: { id: true },
    }),
    prisma.camera.findMany({ select: { id: true, name: true } }),
    getAllConfigs(),
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

  // Camera counts
  let activeCameras = 0;
  let inactiveCameras = 0;
  let errorCameras = 0;
  let maintenanceCameras = 0;
  for (const c of cameraCounts) {
    if (c.status === 'active') activeCameras = c._count.id;
    else if (c.status === 'inactive') inactiveCameras = c._count.id;
    else if (c.status === 'error') errorCameras = c._count.id;
    else if (c.status === 'maintenance') maintenanceCameras = c._count.id;
  }

  // Storage by type
  const storageByType = fileTypeStats.map((f) => ({
    name: f.fileType,
    value: Number(f._count.id ?? 0),
  }));

  // Storage used — same calculation as /storage/summary for consistency
  const storageUsed = fileTypeStats.reduce((s, f) => s + Number(f._sum?.fileSizeBytes ?? 0n), 0);

  // Processing rate (last hour)
  const hourlyJobs = await prisma.processingJob.count({
    where: { completedAt: { gte: lastHour } },
  });
  const processingRate = hourlyJobs;

  // Recent activity (daily image counts for last 7 days)
  const dayMap: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const r of recentImages) {
    const day = new Date(r.capturedAt).toISOString().slice(0, 10);
    if (dayMap[day] !== undefined) dayMap[day] = r._count.id;
  }
  const recentActivity = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label: label.slice(5), value }));

  // Storage growth (daily bytes for last 7 days)
  const dailyStorage = await prisma.imageFile.groupBy({
    by: ['createdAt'],
    where: { createdAt: { gte: last7Days } },
    _sum: { fileSizeBytes: true },
  });
  const storageDayMap: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    storageDayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const r of dailyStorage) {
    const day = new Date(r.createdAt).toISOString().slice(0, 10);
    if (storageDayMap[day] !== undefined) {
      storageDayMap[day] += Number(r._sum.fileSizeBytes ?? 0n);
    }
  }
  const storageGrowth = Object.entries(storageDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label: label.slice(5), value }));

  // Images by camera
  const imagesByCameraData = await prisma.image.groupBy({
    by: ['cameraId'],
    _count: { id: true },
  });
  const cameraMap = new Map(cameraList.map((c) => [c.id, c.name]));
  const imagesByCamera = imagesByCameraData
    .map((d) => ({
      name: cameraMap.get(d.cameraId) ?? d.cameraId,
      value: d._count.id,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    total,
    totalImages,
    completed,
    failed,
    running,
    queued,
    activeCameras,
    inactiveCameras,
    errorCameras,
    maintenanceCameras,
    storageUsed,
    storageTotal: (Number(configs.max_storage_gb?.value ?? 1000)) * 1024 * 1024 * 1024,
    processingRate,
    recentActivity,
    storageGrowth,
    imagesByCamera,
    storageByType,
    byStatus,
    byType,
    queue,
    postgres: pgMetrics,
    storage: storageMetrics,
  };
}

export async function getTrends(period: string) {
  const prisma = getPrisma();
  const now = new Date();

  const periodMap: Record<string, number> = {
    '7d': 7, '14d': 14, '21d': 21, '28d': 28,
    '4m': 120, '8m': 240, '12m': 365, '5y': 1825,
  };
  const days = periodMap[period] ?? 7;
  const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    todayImages,
    totalImages,
    currentImages,
    previousImages,
    currentStorage,
    previousStorage,
    currentJobs,
    previousJobs,
    dailyImages,
  ] = await Promise.all([
    prisma.image.count({ where: { capturedAt: { gte: todayStart } } }),
    prisma.image.count(),
    prisma.image.count({ where: { capturedAt: { gte: currentStart } } }),
    prisma.image.count({ where: { capturedAt: { gte: previousStart, lt: currentStart } } }),
    prisma.imageFile.aggregate({
      where: { createdAt: { gte: currentStart } },
      _sum: { fileSizeBytes: true },
    }),
    prisma.imageFile.aggregate({
      where: { createdAt: { gte: previousStart, lt: currentStart } },
      _sum: { fileSizeBytes: true },
    }),
    prisma.processingJob.count({ where: { completedAt: { gte: currentStart } } }),
    prisma.processingJob.count({ where: { completedAt: { gte: previousStart, lt: currentStart } } }),
    // Daily breakdown for current period
    prisma.image.findMany({
      where: { capturedAt: { gte: currentStart } },
      select: { capturedAt: true, fileSizeBytes: true },
      orderBy: { capturedAt: 'asc' },
    }),
  ]);

  const currentStorageBytes = Number(currentStorage._sum.fileSizeBytes ?? 0n);
  const previousStorageBytes = Number(previousStorage._sum.fileSizeBytes ?? 0n);

  // Build daily breakdown
  const dayBuckets: Record<string, { images: number; storage: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(currentStart.getTime() + i * 24 * 60 * 60 * 1000);
    dayBuckets[d.toISOString().slice(0, 10)] = { images: 0, storage: 0 };
  }
  for (const img of dailyImages) {
    const day = img.capturedAt.toISOString().slice(0, 10);
    if (dayBuckets[day]) {
      dayBuckets[day].images += 1;
      dayBuckets[day].storage += Number(img.fileSizeBytes ?? 0n);
    }
  }
  const dailyBreakdown = Object.entries(dayBuckets).map(([date, v]) => ({
    date,
    images: v.images,
    storage: v.storage,
  }));

  const calcChange = (cur: number, prev: number) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;

  return {
    period,
    days,
    today: { images: todayImages },
    total: { images: totalImages },
    current: { images: currentImages, storage: currentStorageBytes, jobs: currentJobs },
    previous: { images: previousImages, storage: previousStorageBytes, jobs: previousJobs },
    change: {
      images: calcChange(currentImages, previousImages),
      storage: calcChange(currentStorageBytes, previousStorageBytes),
      jobs: calcChange(currentJobs, previousJobs),
    },
    dailyBreakdown,
  };
}

export async function getStreamData() {
  const prisma = getPrisma();

  const [statusCounts, logs, queue] = await Promise.all([
    prisma.processingJob.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.processingJob.findMany({
      orderBy: { queuedAt: 'desc' },
      take: 20,
      select: {
        id: true, imageId: true, jobType: true, status: true, workerId: true,
        errorMessage: true, retryCount: true, queuedAt: true, startedAt: true, completedAt: true,
      },
    }),
    getQueueMetrics(),
  ]);

  const byStatus: Record<string, number> = {};
  for (const s of statusCounts) byStatus[s.status] = s._count.id;

  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const stats = {
    total,
    completed: byStatus['completed'] ?? 0,
    failed: (byStatus['failed'] ?? 0) + (byStatus['dead_letter'] ?? 0),
    running: byStatus['running'] ?? 0,
    queued: byStatus['queued'] ?? 0,
    queue,
  };

  const mapped = logs.map((j) => ({
    id: j.id, imageId: j.imageId, jobType: j.jobType, status: j.status,
    workerId: j.workerId, errorMessage: j.errorMessage, retryCount: j.retryCount,
    queuedAt: j.queuedAt.toISOString(),
    startedAt: j.startedAt?.toISOString() ?? null,
    completedAt: j.completedAt?.toISOString() ?? null,
    durationMs: j.startedAt && j.completedAt ? j.completedAt.getTime() - j.startedAt.getTime() : null,
  }));

  return { stats, logs: mapped };
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

export async function rejectJob(jobId: string) {
  const prisma = getPrisma();

  const job = await prisma.processingJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new NotFoundError('ProcessingJob', jobId);
  }

  if (job.status !== 'dead_letter') {
    throw new Error(`Cannot reject job with status '${job.status}'`);
  }

  const updated = await prisma.processingJob.update({
    where: { id: jobId },
    data: { status: 'rejected' },
  });

  return { id: updated.id, status: updated.status };
}

export async function getDlqSummary() {
  const prisma = getPrisma();

  const deadLetters = await prisma.processingJob.findMany({
    where: { status: 'dead_letter' },
    orderBy: { queuedAt: 'desc' },
    take: 500,
    include: {
      image: { select: { originalFilename: true, cameraId: true } },
    },
  });

  const byJobType: Record<string, number> = {};
  let total = 0;
  const mapped = deadLetters.map((j) => {
    byJobType[j.jobType] = (byJobType[j.jobType] ?? 0) + 1;
    total++;
    return {
      id: j.id,
      imageId: j.imageId,
      jobType: j.jobType,
      workerId: j.workerId,
      queueName: j.queueName,
      errorMessage: j.errorMessage,
      retryCount: j.retryCount,
      maxRetries: j.maxRetries,
      queuedAt: j.queuedAt.toISOString(),
      startedAt: j.startedAt?.toISOString() ?? null,
      completedAt: j.completedAt?.toISOString() ?? null,
      imageFilename: j.image?.originalFilename ?? null,
      cameraId: j.image?.cameraId ?? null,
    };
  });

  return {
    total,
    byJobType,
    jobs: mapped,
  };
}

export async function bulkRetryDlq(jobType?: string) {
  const prisma = getPrisma();
  const where: Prisma.ProcessingJobWhereInput = { status: 'dead_letter' };
  if (jobType) where.jobType = jobType;

  const result = await prisma.processingJob.updateMany({
    where,
    data: {
      status: 'queued',
      retryCount: { increment: 1 },
      errorMessage: null,
      errorDetails: Prisma.JsonNull,
      startedAt: null,
      completedAt: null,
    },
  });

  return { updated: result.count };
}

export async function bulkRejectDlq(jobType?: string) {
  const prisma = getPrisma();
  const where: Prisma.ProcessingJobWhereInput = { status: 'dead_letter' };
  if (jobType) where.jobType = jobType;

  const result = await prisma.processingJob.updateMany({
    where,
    data: { status: 'rejected' },
  });

  return { updated: result.count };
}
