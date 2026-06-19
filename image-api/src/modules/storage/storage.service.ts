import { getPrisma } from '../../lib/prisma.js';
import type { StorageSummary } from '../../types/index.js';

export async function getStorageSummary(): Promise<StorageSummary> {
  const prisma = getPrisma();

  const [fileStats, , latestSnapshot] = await Promise.all([
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
      DATE(captured_at) as date,
      COUNT(*)::bigint as images_added,
      COALESCE(SUM(file_size_bytes), 0)::bigint as bytes_added
    FROM images
    WHERE captured_at >= ${startDate}
      AND status != 'deleted'
    GROUP BY DATE(captured_at)
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
