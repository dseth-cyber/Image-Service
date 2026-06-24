import { getPrisma } from '../../lib/prisma.js';
import { getAllConfigs } from '../system-config/system-config.service.js';
export async function getStorageSummary() {
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
    const byFileType = {};
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
export async function getCameraStorage(cameraId) {
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
export async function getStorageGrowth(days) {
    const prisma = getPrisma();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const dailyStats = await prisma.$queryRaw `
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
export async function getStorageForecast() {
    const [summary, growth60, growth90, configs] = await Promise.all([
        getStorageSummary(),
        getStorageGrowth(60),
        getStorageGrowth(90),
        getAllConfigs(),
    ]);
    const maxBytes = (Number(configs.max_storage_gb?.value ?? 1000)) * 1024 * 1024 * 1024;
    const totalBytes = summary.totalBytes;
    const usagePercent = maxBytes > 0 ? (totalBytes / maxBytes) * 100 : 0;
    // Calculate daily growth rate from 90-day data (use 60-day as fallback)
    const growthData = growth90.data.length >= 30 ? growth90.data : growth60.data;
    let dailyGrowthRate = 0;
    if (growthData.length >= 7) {
        const n = growthData.length;
        const sumX = (n - 1) * n / 2;
        const sumY = growthData.reduce((s, d) => s + d.bytesAdded, 0);
        let sumXY = 0;
        let sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumXY += i * growthData[i].bytesAdded;
            sumX2 += i * i;
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        dailyGrowthRate = Math.max(0, slope);
    }
    const daysUntilFull = dailyGrowthRate > 0
        ? Math.ceil((maxBytes - totalBytes) / dailyGrowthRate)
        : null;
    const projections = [120, 240, 360].map((days) => {
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
//# sourceMappingURL=storage.service.js.map