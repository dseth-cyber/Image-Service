import { getPrisma } from '../../lib/prisma.js';
import { getAllConfigs } from '../system-config/system-config.service.js';
import type { StorageSummary } from '../../types/index.js';

export async function getStorageSummary(): Promise<StorageSummary> {
  const prisma = getPrisma();

  const [fileStats, , latestSnapshot, configs] = await Promise.all([
    prisma.imageFile.groupBy({
      by: ['fileType'],
      _sum: { fileSizeBytes: true },
      _count: { id: true },
    }),
    prisma.imageFile.groupBy({
      by: ['imageId'],
      _sum: { fileSizeBytes: true },
    }),
    prisma.storageSnapshot.findFirst({
      where: { cameraId: null },
      orderBy: { snapshotDate: 'desc' },
      select: { snapshotDate: true },
    }),
    getAllConfigs(),
  ]);

  const byFileType: Record<string, { files: number; bytes: number }> = {};
  for (const stat of fileStats) {
    byFileType[stat.fileType] = {
      files: stat._count.id,
      bytes: Number(stat._sum.fileSizeBytes ?? 0n),
    };
  }

  const totalFiles = Object.values(byFileType).reduce((s, v) => s + v.files, 0);
  const totalBytes = Object.values(byFileType).reduce((s, v) => s + v.bytes, 0);

  const cameraData = await prisma.camera.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { images: true } },
    },
  });

  const byCamera = cameraData.map((c) => ({
    cameraId: c.id,
    cameraName: c.name,
    files: c._count.images,
    bytes: 0,
  }));

  return {
    totalFiles,
    totalBytes,
    totalCapacity: (Number(configs.max_storage_gb?.value ?? 1000)) * 1024 * 1024 * 1024,
    byFileType,
    byCamera,
    snapshotDate: latestSnapshot?.snapshotDate.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  };
}

export async function getCameraStorage(cameraId: string) {
  const prisma = getPrisma();

  const fileStats = await prisma.imageFile.groupBy({
    by: ['fileType', 'storageClass'],
    where: { image: { cameraId } },
    _sum: { fileSizeBytes: true },
    _count: { id: true },
  });

  const snapshots = await prisma.storageSnapshot.findMany({
    where: { cameraId },
    orderBy: { snapshotDate: 'desc' },
    take: 30,
  });

  return {
    cameraId,
    fileStats,
    recentSnapshots: snapshots,
  };
}

export async function getStorageGrowth(days: number) {
  const prisma = getPrisma();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const dailyStats = await prisma.$queryRaw<Array<{
    date: Date;
    images_added: bigint;
    bytes_added: bigint;
  }>>`
    SELECT
      DATE(i.captured_at) as date,
      COUNT(DISTINCT i.id)::bigint as images_added,
      COALESCE(SUM(f.file_size_bytes), 0)::bigint as bytes_added
    FROM images i
    LEFT JOIN image_files f ON f.image_id = i.id
    WHERE i.captured_at >= ${startDate}
      AND i.status != 'deleted'
    GROUP BY DATE(i.captured_at)
    ORDER BY date ASC
  `;

  return {
    period: `${days}d`,
    data: dailyStats.map((row) => ({
      date: row.date instanceof Date
        ? row.date.toISOString().slice(0, 10)
        : String(row.date).slice(0, 10),
      imagesAdded: Number(row.images_added),
      bytesAdded: Number(row.bytes_added),
    })),
  };
}

export async function getStorageForecast(): Promise<{
  totalBytes: number;
  maxBytes: number;
  usagePercent: number;
  dailyGrowthRate: number;
  daysUntilFull: number | null;
  projections: { days: number; projectedBytes: number; usagePercent: number }[];
}> {
  const [summary, growth60, growth90, oldestImage, configs] = await Promise.all([
    getStorageSummary(),
    getStorageGrowth(60),
    getStorageGrowth(90),
    getPrisma().image.findFirst({
      where: { status: { not: 'deleted' } },
      orderBy: { capturedAt: 'asc' },
      select: { capturedAt: true },
    }),
    getAllConfigs(),
  ]);

  const maxBytes = (Number(configs.max_storage_gb?.value ?? 1000)) * 1024 * 1024 * 1024;
  const totalBytes = summary.totalBytes;
  const usagePercent = maxBytes > 0 ? (totalBytes / maxBytes) * 100 : 0;

  // Calculate daily growth rate from recent data first, fall back to all-time average
  const growthData = growth90.data.length >= 30 ? growth90.data : growth60.data;
  let dailyGrowthRate = 0;

  if (growthData.length >= 7) {
    const n = growthData.length;
    const sumY = growthData.reduce((s, d) => s + d.bytesAdded, 0);
    dailyGrowthRate = Math.max(0, sumY / n);
  } else if (oldestImage?.capturedAt && totalBytes > 0) {
    const ageDays = Math.max(1, (Date.now() - oldestImage.capturedAt.getTime()) / (1000 * 60 * 60 * 24));
    dailyGrowthRate = Math.max(0, totalBytes / ageDays);
  }

  const daysUntilFull = dailyGrowthRate > 0
    ? Math.ceil((maxBytes - totalBytes) / dailyGrowthRate)
    : null;

  const projections = [7, 14, 30, 60, 90, 120, 240, 360].map((days) => {
    const projectedBytes = totalBytes + dailyGrowthRate * days;
    return {
      days,
      projectedBytes: Math.round(projectedBytes),
      usagePercent: maxBytes > 0 ? Math.min(100, (projectedBytes / maxBytes) * 100) : 0,
    };
  });

  return {
    totalBytes,
    maxBytes,
    usagePercent,
    dailyGrowthRate: Math.round(dailyGrowthRate),
    daysUntilFull,
    projections,
  };
}
